import os
import re
import uuid
import json
from datetime import datetime, date, timezone
from typing import Dict, List, Tuple, Optional, Any
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.models.borrower import Borrower
from backend.app.models.upload import UploadBatch
from backend.app.models.enums import EligibilityStatus
from backend.app.schemas.borrower import BorrowerCreate
from backend.app.schemas.upload import (
    UploadPreviewResponse,
    RowValidationError,
    UploadCommitResponse
)

# Standard candidate column names for fuzzy header auto-detection
COLUMN_SYNONYMS: Dict[str, List[str]] = {
    "borrower_id": ["borrower_id", "borrower id", "customer_id", "customer id", "id", "cust_id", "client_id", "account_id", "loan_id"],
    "name": ["name", "borrower_name", "borrower name", "customer_name", "customer name", "full_name", "client_name", "borrower"],
    "phone": ["phone", "phone_number", "phone number", "mobile", "mobile_number", "contact", "contact_number", "cell", "phone_no"],
    "preferred_language": ["preferred_language", "language", "lang", "pref_language", "comm_language", "target_language"],
    "emi_amount": ["emi_amount", "emi", "emi amount", "monthly_emi", "installment", "monthly_installment"],
    "outstanding_amount": ["outstanding_amount", "outstanding", "balance", "total_outstanding", "amount_due", "due_amount", "balance_amount"],
    "due_date": ["due_date", "due date", "payment_due_date", "expiry_date", "date_due", "installment_due_date"],
    "account_number": ["account_number", "account number", "loan_account_number", "loan_acc_no", "acc_no"]
}


def normalize_phone_number(raw_phone: Any) -> Tuple[Optional[str], Optional[str]]:
    """
    Validate and normalize phone numbers into clean E.164 format (+91XXXXXXXXXX).
    Detects invalid lengths and repetitive dummy numbers.
    """
    if raw_phone is None or pd.isna(raw_phone):
        return None, "Phone number is missing."

    # Convert to string and strip formatting
    phone_str = str(raw_phone).strip()
    # Remove decimal points if float representation (e.g., 9876543210.0)
    if phone_str.endswith(".0"):
        phone_str = phone_str[:-2]

    # Remove non-digits
    digits_only = re.sub(r"\D", "", phone_str)

    if not digits_only:
        return None, "Phone number contains no digits."

    # Check for obvious dummy repetitive patterns (e.g. 0000000000, 1111111111)
    if len(set(digits_only)) == 1:
        return None, "Invalid repetitive dummy phone number."

    # Standard Indian mobile handling
    if len(digits_only) == 10:
        if digits_only[0] in "6789":
            return f"+91{digits_only}", None
        return f"+91{digits_only}", "Notice: Standard Indian mobile should start with 6-9."
    elif len(digits_only) == 11 and digits_only.startswith("0"):
        return f"+91{digits_only[1:]}", None
    elif len(digits_only) == 12 and digits_only.startswith("91"):
        return f"+{digits_only}", None
    elif 10 <= len(digits_only) <= 15:
        # Standard international E.164
        return f"+{digits_only}", None
    else:
        return None, f"Invalid phone number length ({len(digits_only)} digits). Expected 10-15 digits."


def auto_detect_column_mapping(columns: List[str]) -> Dict[str, str]:
    """Auto-detect matching standard keys for input spreadsheet columns."""
    mapping: Dict[str, str] = {}
    
    def normalize_str(s: str) -> str:
        return re.sub(r"[_\s-]+", "", str(s).lower())

    col_cleaned = {normalize_str(col): col for col in columns}

    for std_key, synonyms in COLUMN_SYNONYMS.items():
        # Also check clean version of std_key
        all_candidates = [std_key] + synonyms
        for syn in all_candidates:
            clean_syn = normalize_str(syn)
            if clean_syn in col_cleaned:
                mapping[std_key] = col_cleaned[clean_syn]
                break

    return mapping


def parse_date(raw_date: Any) -> Tuple[Optional[date], Optional[str]]:
    """Robust date parsing for varied banking date strings and Excel serials."""
    if raw_date is None or pd.isna(raw_date):
        return None, "Due date is missing."

    if isinstance(raw_date, (datetime, pd.Timestamp)):
        return raw_date.date(), None
    if isinstance(raw_date, date):
        return raw_date, None

    date_str = str(raw_date).strip()
    if not date_str:
        return None, "Due date is empty."

    common_formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%m/%d/%Y",
        "%Y/%m/%d",
        "%d.%m.%Y",
        "%Y-%m-%d %H:%M:%S"
    ]

    for fmt in common_formats:
        try:
            parsed = datetime.strptime(date_str, fmt)
            return parsed.date(), None
        except ValueError:
            continue

    # Try pandas generic parser
    try:
        dt = pd.to_datetime(date_str, errors="coerce", dayfirst=True)
        if not pd.isna(dt):
            return dt.date(), None
    except Exception:
        pass

    return None, f"Unable to parse due date: '{date_str}'. Expected format YYYY-MM-DD or DD/MM/YYYY."


class BorrowerImportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def preview_upload(
        self,
        file_bytes: bytes,
        filename: str,
        custom_mapping: Optional[Dict[str, str]] = None
    ) -> UploadPreviewResponse:
        """
        Parses raw Excel/CSV bytes, applies column mappings, validates each row,
        checks duplicates against file and database, and writes preview cache.
        """
        batch_id = f"BATCH-{uuid.uuid4().hex[:12].upper()}"
        ext = os.path.splitext(filename)[1].lower()

        # 1. Save original file unchanged
        safe_filename = f"{batch_id}_{re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)}"
        file_path = os.path.join(settings.UPLOADS_DIR, safe_filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # 2. Read spreadsheet into pandas DataFrame
        try:
            if ext == ".csv":
                df = pd.read_csv(file_path, dtype=str)
            elif ext in [".xlsx", ".xls"]:
                df = pd.read_excel(file_path, dtype=str)
            else:
                raise ValueError(f"Unsupported file format '{ext}'. Only .xlsx, .xls, and .csv are supported.")
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise ValueError(f"Failed to read spreadsheet: {str(e)}")

        # 3. Detect / resolve column mappings
        raw_columns = [str(c).strip() for c in df.columns.tolist()]
        mapped_columns = auto_detect_column_mapping(raw_columns)
        if custom_mapping:
            for k, v in custom_mapping.items():
                if v in raw_columns:
                    mapped_columns[k] = v

        # Check required fields
        required_keys = ["borrower_id", "name", "phone", "emi_amount", "outstanding_amount", "due_date"]
        missing_required = [k for k in required_keys if k not in mapped_columns]

        # 4. Fetch existing database IDs and phones for duplicate detection
        existing_ids_result = await self.db.execute(select(Borrower.borrower_id))
        existing_db_ids = set(existing_ids_result.scalars().all())

        existing_phones_result = await self.db.execute(select(Borrower.phone))
        existing_db_phones = set(existing_phones_result.scalars().all())

        # 5. Process each row
        valid_rows: List[BorrowerCreate] = []
        invalid_rows: List[RowValidationError] = []
        seen_file_ids = set()
        seen_file_phones = set()
        duplicate_count = 0
        today = date.today()

        for idx, row in df.iterrows():
            row_idx = int(idx) + 1 # 1-based index for humans
            row_dict = {col: ("" if pd.isna(row[col]) else str(row[col]).strip()) for col in raw_columns}
            errors: List[str] = []
            warnings: List[str] = []

            if missing_required:
                errors.append(f"Missing column mappings for: {', '.join(missing_required)}")
                invalid_rows.append(RowValidationError(row_index=row_idx, raw_data=row_dict, errors=errors))
                continue

            # A. Borrower ID
            b_id_col = mapped_columns.get("borrower_id")
            raw_b_id = row_dict.get(b_id_col, "")
            if not raw_b_id:
                errors.append("Borrower ID is required.")
            else:
                raw_b_id = raw_b_id.strip()
                if raw_b_id in seen_file_ids:
                    errors.append(f"Duplicate Borrower ID in file: '{raw_b_id}'.")
                    duplicate_count += 1
                elif raw_b_id in existing_db_ids:
                    errors.append(f"Borrower ID '{raw_b_id}' already exists in database.")
                    duplicate_count += 1
                seen_file_ids.add(raw_b_id)

            # B. Name
            name_col = mapped_columns.get("name")
            raw_name = row_dict.get(name_col, "").strip()
            if not raw_name:
                errors.append("Borrower Name is required.")
            elif len(raw_name) < 2:
                errors.append("Borrower Name must be at least 2 characters long.")

            # C. Phone
            phone_col = mapped_columns.get("phone")
            raw_phone = row_dict.get(phone_col, "")
            norm_phone, phone_err = normalize_phone_number(raw_phone)
            if phone_err and not norm_phone:
                errors.append(f"Phone validation: {phone_err}")
            elif norm_phone:
                if phone_err:
                    warnings.append(phone_err)
                if norm_phone in seen_file_phones:
                    errors.append(f"Duplicate Phone number in file: '{norm_phone}'.")
                    duplicate_count += 1
                elif norm_phone in existing_db_phones:
                    warnings.append(f"Phone '{norm_phone}' matches an existing borrower in database.")
                seen_file_phones.add(norm_phone)
            else:
                errors.append("Valid phone number is required.")

            # D. Preferred Language
            lang_col = mapped_columns.get("preferred_language")
            raw_lang = row_dict.get(lang_col, "English").strip() if lang_col else "English"
            if not raw_lang:
                raw_lang = "English"

            # E. EMI Amount
            emi_col = mapped_columns.get("emi_amount")
            raw_emi = row_dict.get(emi_col, "")
            emi_amount = 0.0
            try:
                clean_emi = re.sub(r"[^\d.]", "", str(raw_emi))
                emi_amount = float(clean_emi)
                if emi_amount < 0:
                    errors.append("EMI amount cannot be negative.")
            except Exception:
                errors.append(f"Invalid EMI amount: '{raw_emi}'.")

            # F. Outstanding Amount
            out_col = mapped_columns.get("outstanding_amount")
            raw_out = row_dict.get(out_col, "")
            outstanding_amount = 0.0
            try:
                clean_out = re.sub(r"[^\d.]", "", str(raw_out))
                outstanding_amount = float(clean_out)
                if outstanding_amount < 0:
                    errors.append("Outstanding amount cannot be negative.")
            except Exception:
                errors.append(f"Invalid outstanding amount: '{raw_out}'.")

            # G. Due Date
            due_col = mapped_columns.get("due_date")
            raw_due = row_dict.get(due_col, "")
            due_date_val, date_err = parse_date(raw_due)
            if date_err:
                errors.append(date_err)

            # H. Account Number (Optional)
            acc_col = mapped_columns.get("account_number")
            raw_acc = row_dict.get(acc_col, None) if acc_col else None
            if raw_acc:
                raw_acc = str(raw_acc).strip()

            # I. Eligibility Determination
            eligibility = EligibilityStatus.ELIGIBLE
            if outstanding_amount <= 0:
                eligibility = EligibilityStatus.INELIGIBLE
                warnings.append("Zero or negative balance: Marked INELIGIBLE.")
            elif due_date_val and due_date_val > today:
                # Payment not yet overdue
                warnings.append("Payment not yet overdue: Current account.")

            if errors:
                invalid_rows.append(
                    RowValidationError(
                        row_index=row_idx,
                        raw_data=row_dict,
                        errors=errors,
                        warnings=warnings
                    )
                )
            else:
                valid_rows.append(
                    BorrowerCreate(
                        borrower_id=raw_b_id,
                        name=raw_name,
                        phone=norm_phone,
                        preferred_language=raw_lang,
                        emi_amount=emi_amount,
                        outstanding_amount=outstanding_amount,
                        due_date=due_date_val,
                        eligibility_status=eligibility,
                        account_number=raw_acc
                    )
                )

        # 6. Save preview cache to disk for atomic commit
        preview_cache_path = os.path.join(settings.UPLOADS_DIR, f"{batch_id}_preview.json")
        cache_data = {
            "batch_id": batch_id,
            "filename": filename,
            "file_path": file_path,
            "file_size_bytes": len(file_bytes),
            "valid_rows": [r.model_dump(mode="json") for r in valid_rows],
            "total_rows": len(df),
            "duplicate_count": duplicate_count
        }
        with open(preview_cache_path, "w", encoding="utf-8") as f:
            json.dump(cache_data, f, default=str)

        return UploadPreviewResponse(
            batch_id=batch_id,
            filename=filename,
            detected_columns=raw_columns,
            mapped_columns=mapped_columns,
            total_rows=len(df),
            valid_count=len(valid_rows),
            invalid_count=len(invalid_rows),
            duplicate_count=duplicate_count,
            valid_rows=valid_rows,
            invalid_rows=invalid_rows
        )

    async def commit_upload(
        self,
        batch_id: str,
        user_id: Optional[int] = None,
        selected_indices: Optional[List[int]] = None
    ) -> UploadCommitResponse:
        """
        Commits validated rows from the preview cache into the PostgreSQL borrowers table
        and stores the immutable UploadBatch audit record.
        """
        preview_cache_path = os.path.join(settings.UPLOADS_DIR, f"{batch_id}_preview.json")
        if not os.path.exists(preview_cache_path):
            raise ValueError(f"Upload batch '{batch_id}' expired or not found. Please re-upload.")

        with open(preview_cache_path, "r", encoding="utf-8") as f:
            cache_data = json.load(f)

        raw_valid_rows = cache_data["valid_rows"]
        total_rows = cache_data["total_rows"]
        file_path = cache_data["file_path"]
        filename = cache_data["filename"]
        file_size_bytes = cache_data["file_size_bytes"]
        duplicate_count = cache_data.get("duplicate_count", 0)

        # Filter if user selected specific row indices
        rows_to_insert = raw_valid_rows
        if selected_indices is not None:
            rows_to_insert = [r for idx, r in enumerate(raw_valid_rows) if idx in selected_indices]

        # 1. Create UploadBatch record
        upload_batch = UploadBatch(
            batch_id=batch_id,
            filename=filename,
            file_path=file_path,
            file_size_bytes=file_size_bytes,
            uploaded_by_id=user_id,
            total_rows=total_rows,
            valid_rows=len(raw_valid_rows),
            imported_rows=len(rows_to_insert),
            rejected_rows=total_rows - len(raw_valid_rows),
            duplicate_rows=duplicate_count,
            status="COMPLETED",
            summary={
                "imported_at": datetime.now(timezone.utc).isoformat(),
                "imported_count": len(rows_to_insert),
                "valid_count": len(raw_valid_rows),
                "total_rows": total_rows
            }
        )
        self.db.add(upload_batch)
        await self.db.flush()

        # 2. Insert Borrowers linked to this batch
        imported_count = 0
        for r_dict in rows_to_insert:
            borrower = Borrower(
                borrower_id=r_dict["borrower_id"],
                upload_batch_id=upload_batch.id,
                account_number=r_dict.get("account_number"),
                name=r_dict["name"],
                phone=r_dict["phone"],
                preferred_language=r_dict.get("preferred_language", "English"),
                emi_amount=r_dict["emi_amount"],
                outstanding_amount=r_dict["outstanding_amount"],
                due_date=date.fromisoformat(r_dict["due_date"]) if isinstance(r_dict["due_date"], str) else r_dict["due_date"],
                eligibility_status=EligibilityStatus(r_dict.get("eligibility_status", EligibilityStatus.ELIGIBLE.value)),
                risk_score=r_dict.get("risk_score", 0.0),
                stop_contact=r_dict.get("stop_contact", False),
                dispute_status=r_dict.get("dispute_status", "NONE")
            )
            self.db.add(borrower)
            imported_count += 1

        await self.db.commit()

        # Clean preview cache file (keep raw uploaded file intact)
        if os.path.exists(preview_cache_path):
            os.remove(preview_cache_path)

        return UploadCommitResponse(
            batch_id=batch_id,
            upload_batch_pk=upload_batch.id,
            total_processed=total_rows,
            imported_count=imported_count,
            skipped_count=total_rows - imported_count,
            status="COMPLETED",
            summary=upload_batch.summary
        )
