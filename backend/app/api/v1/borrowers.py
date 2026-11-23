import io
import json
from datetime import date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.enums import UserRole, EligibilityStatus
from backend.app.api.deps import get_current_user, require_roles
from backend.app.repositories.borrower_repo import BorrowerRepository
from backend.app.repositories.audit_repo import AuditRepository
from backend.app.services.borrower_import_service import BorrowerImportService
from backend.app.schemas.borrower import (
    BorrowerResponse,
    BorrowerDetailResponse,
    BorrowerUpdate,
    BorrowerFilterParams
)
from backend.app.schemas.upload import (
    UploadPreviewResponse,
    UploadCommitRequest,
    UploadCommitResponse,
    UploadBatchResponse
)
from backend.app.models.upload import UploadBatch
from sqlalchemy import select, desc

router = APIRouter(prefix="/borrowers", tags=["Borrowers & Ingestion"])


@router.post("/upload-preview", response_model=UploadPreviewResponse)
async def preview_borrower_file(
    file: UploadFile = File(...),
    column_mapping_json: Optional[str] = Form(None),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER)),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 1: Upload and preview an Excel (.xlsx, .xls) or CSV file.
    Validates all rows, checks duplicates, and returns validation breakdown without writing to database.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    allowed_exts = (".xlsx", ".xls", ".csv")
    if not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Please upload {', '.join(allowed_exts)}"
        )

    # Read bytes with file size guard (max 20MB)
    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum permitted limit (20MB).")

    custom_mapping = None
    if column_mapping_json:
        try:
            custom_mapping = json.loads(column_mapping_json)
        except Exception:
            pass

    service = BorrowerImportService(db)
    try:
        preview = await service.preview_upload(
            file_bytes=file_bytes,
            filename=file.filename,
            custom_mapping=custom_mapping
        )
        return preview
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@router.post("/upload-commit", response_model=UploadCommitResponse)
async def commit_borrower_upload(
    commit_data: UploadCommitRequest,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER)),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Persist previewed valid rows into PostgreSQL and record the immutable UploadBatch.
    """
    service = BorrowerImportService(db)
    try:
        result = await service.commit_upload(
            batch_id=commit_data.batch_id,
            user_id=current_user.id,
            selected_indices=commit_data.selected_row_indices
        )

        # Audit Log
        audit_repo = AuditRepository(db)
        await audit_repo.log(
            action="BORROWERS_IMPORTED",
            resource_type="UPLOAD_BATCH",
            resource_id=commit_data.batch_id,
            user_id=current_user.id,
            details={
                "imported_count": result.imported_count,
                "batch_id": result.batch_id,
                "upload_batch_pk": result.upload_batch_pk
            },
            ip_address=request.client.host if request.client else None
        )

        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to commit batch: {str(e)}")


@router.get("/batches", response_model=List[UploadBatchResponse])
async def list_upload_batches(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.SUPERVISOR)),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve historical upload batches and import audits."""
    stmt = select(UploadBatch).order_by(desc(UploadBatch.id)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/template")
async def download_sample_template(format: str = Query("xlsx", pattern="^(xlsx|csv)$")):
    """Download a standardized borrower upload template with sample data."""
    sample_data = [
        {
            "borrower_id": "BW-10001",
            "name": "Rajesh Kumar Sharma",
            "phone": "+91 98765 43210",
            "preferred_language": "Hindi",
            "emi_amount": 12500.00,
            "outstanding_amount": 37500.00,
            "due_date": "2026-11-15",
            "account_number": "LOAN-HOM-889012"
        },
        {
            "borrower_id": "BW-10002",
            "name": "Sunita Sanjay Patil",
            "phone": "9823145678",
            "preferred_language": "Marathi",
            "emi_amount": 8400.00,
            "outstanding_amount": 25200.00,
            "due_date": "2026-11-10",
            "account_number": "LOAN-AUT-445109"
        },
        {
            "borrower_id": "BW-10003",
            "name": "Amitabh Roy",
            "phone": "+919900112233",
            "preferred_language": "English",
            "emi_amount": 15000.00,
            "outstanding_amount": 45000.00,
            "due_date": "2026-11-05",
            "account_number": "LOAN-PER-990182"
        },
        {
            "borrower_id": "BW-10004",
            "name": "Pooja Venkat",
            "phone": "918877665544",
            "preferred_language": "English",
            "emi_amount": 6200.00,
            "outstanding_amount": 18600.00,
            "due_date": "2026-11-12",
            "account_number": "LOAN-ED-112344"
        }
    ]
    df = pd.DataFrame(sample_data)

    if format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="voxguard_borrower_template.csv"'}
        )
    else:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Borrowers")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="voxguard_borrower_template.xlsx"'}
        )


@router.get("", response_model=Dict[str, Any])
async def list_borrowers(
    search: Optional[str] = None,
    preferred_language: Optional[str] = None,
    eligibility_status: Optional[EligibilityStatus] = None,
    stop_contact: Optional[bool] = None,
    min_outstanding: Optional[float] = None,
    max_outstanding: Optional[float] = None,
    due_date_from: Optional[date] = None,
    due_date_to: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.SUPERVISOR, UserRole.HUMAN_COLLECTOR)),
    db: AsyncSession = Depends(get_db)
):
    """Filterable, searchable paginated borrower directory with phone masking."""
    params = BorrowerFilterParams(
        search=search,
        preferred_language=preferred_language,
        eligibility_status=eligibility_status,
        stop_contact=stop_contact,
        min_outstanding=min_outstanding,
        max_outstanding=max_outstanding,
        due_date_from=due_date_from,
        due_date_to=due_date_to,
        skip=skip,
        limit=limit
    )
    repo = BorrowerRepository(db)
    items, total_count = await repo.list_borrowers(params)

    return {
        "items": [BorrowerResponse.model_validate(b) for b in items],
        "total": total_count,
        "skip": skip,
        "limit": limit
    }


@router.get("/{borrower_id}", response_model=BorrowerDetailResponse)
async def get_borrower_detail(
    borrower_id: int,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.SUPERVISOR, UserRole.HUMAN_COLLECTOR)),
    db: AsyncSession = Depends(get_db)
):
    """Comprehensive single borrower dossier with campaign history, calls, and commitments."""
    repo = BorrowerRepository(db)
    details = await repo.get_borrower_details(borrower_id)
    if not details:
        raise HTTPException(status_code=404, detail="Borrower record not found.")

    borrower_obj = details["borrower"]
    resp = BorrowerDetailResponse.model_validate(borrower_obj)
    resp.campaign_history = details["campaign_history"]
    resp.call_attempts_count = details["call_attempts_count"]
    resp.recent_calls = details["recent_calls"]
    resp.commitments_history = details["commitments_history"]
    return resp


@router.patch("/{borrower_id}", response_model=BorrowerResponse)
async def update_borrower(
    borrower_id: int,
    update_in: BorrowerUpdate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.SUPERVISOR)),
    db: AsyncSession = Depends(get_db)
):
    """Update borrower status, stop-contact request, or details."""
    repo = BorrowerRepository(db)
    borrower = await repo.get_by_id(borrower_id)
    if not borrower:
        raise HTTPException(status_code=404, detail="Borrower record not found.")

    updated = await repo.update(borrower, update_in)

    # Audit Log
    audit_repo = AuditRepository(db)
    await audit_repo.log(
        action="BORROWER_UPDATED",
        resource_type="BORROWER",
        resource_id=borrower.borrower_id,
        user_id=current_user.id,
        details=update_in.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None
    )

    return BorrowerResponse.model_validate(updated)
