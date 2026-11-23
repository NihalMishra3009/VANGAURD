from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any
from backend.app.schemas.borrower import BorrowerCreate, BorrowerResponse


class RowValidationError(BaseModel):
    row_index: int
    raw_data: Dict[str, Any]
    errors: List[str]
    warnings: List[str] = []


class UploadPreviewResponse(BaseModel):
    batch_id: str
    filename: str
    detected_columns: List[str]
    mapped_columns: Dict[str, str]
    total_rows: int
    valid_count: int
    invalid_count: int
    duplicate_count: int
    valid_rows: List[BorrowerCreate]
    invalid_rows: List[RowValidationError]


class UploadCommitRequest(BaseModel):
    batch_id: str
    selected_row_indices: Optional[List[int]] = None # If None, commit all valid rows


class UploadCommitResponse(BaseModel):
    batch_id: str
    upload_batch_pk: int
    total_processed: int
    imported_count: int
    skipped_count: int
    status: str
    summary: Dict[str, Any]


class UploadBatchResponse(BaseModel):
    id: int
    batch_id: str
    filename: str
    file_size_bytes: int
    uploaded_by_id: Optional[int] = None
    total_rows: int
    valid_rows: int
    imported_rows: int
    rejected_rows: int
    duplicate_rows: int
    status: str
    summary: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
