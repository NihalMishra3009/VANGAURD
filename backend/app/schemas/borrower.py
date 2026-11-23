from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Optional, List
from backend.app.models.enums import EligibilityStatus


class BorrowerBase(BaseModel):
    borrower_id: str
    name: str
    phone: str
    preferred_language: str = "English"
    emi_amount: float = Field(ge=0.0)
    outstanding_amount: float = Field(ge=0.0)
    due_date: date
    eligibility_status: EligibilityStatus = EligibilityStatus.ELIGIBLE
    risk_score: Optional[float] = 0.0
    account_number: Optional[str] = None
    stop_contact: bool = False
    dispute_status: str = "NONE"


class BorrowerCreate(BorrowerBase):
    upload_batch_id: Optional[int] = None


class BorrowerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
    emi_amount: Optional[float] = None
    outstanding_amount: Optional[float] = None
    due_date: Optional[date] = None
    eligibility_status: Optional[EligibilityStatus] = None
    risk_score: Optional[float] = None
    stop_contact: Optional[bool] = None
    dispute_status: Optional[str] = None


class BorrowerResponse(BorrowerBase):
    id: int
    upload_batch_id: Optional[int] = None
    masked_phone: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BorrowerDetailResponse(BorrowerResponse):
    campaign_history: List[dict] = []
    call_attempts_count: int = 0
    recent_calls: List[dict] = []
    commitments_history: List[dict] = []


class BorrowerFilterParams(BaseModel):
    search: Optional[str] = None
    preferred_language: Optional[str] = None
    eligibility_status: Optional[EligibilityStatus] = None
    min_outstanding: Optional[float] = None
    max_outstanding: Optional[float] = None
    due_date_from: Optional[date] = None
    due_date_to: Optional[date] = None
    stop_contact: Optional[bool] = None
    skip: int = 0
    limit: int = 50
