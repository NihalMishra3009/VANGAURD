from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from backend.app.models.enums import CampaignStatus, CallStatus
from backend.app.schemas.borrower import BorrowerResponse


class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    target_language: str = "All"
    status: CampaignStatus = CampaignStatus.DRAFT
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    retry_limit: int = Field(default=3, ge=1, le=10)
    cooling_off_hours: int = Field(default=24, ge=1, le=168)
    priority_weight: int = Field(default=1, ge=1, le=10)


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_language: Optional[str] = None
    status: Optional[CampaignStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    retry_limit: Optional[int] = None
    cooling_off_hours: Optional[int] = None
    priority_weight: Optional[int] = None


class CampaignBorrowerAssignRequest(BaseModel):
    borrower_ids: List[int] # Borrower internal IDs
    priority: int = 1


class CampaignBorrowerResponse(BaseModel):
    id: int
    campaign_id: int
    borrower_id: int
    priority: int
    calling_status: str
    retry_count: int
    is_active_call: bool
    last_attempt_at: Optional[datetime] = None
    notes: Optional[str] = None
    borrower: BorrowerResponse

    model_config = ConfigDict(from_attributes=True)


class CampaignStats(BaseModel):
    total_assigned: int = 0
    queued: int = 0
    in_progress: int = 0
    completed: int = 0
    failed: int = 0
    escalated: int = 0
    safe_terminated: int = 0
    total_outstanding_amount: float = 0.0


class CampaignResponse(CampaignBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    stats: Optional[CampaignStats] = None

    model_config = ConfigDict(from_attributes=True)


class CampaignDetailResponse(CampaignResponse):
    borrower_associations: List[CampaignBorrowerResponse] = []
