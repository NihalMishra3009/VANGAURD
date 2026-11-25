from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class QueueItemResponse(BaseModel):
    campaign_borrower_id: int
    campaign_id: int
    campaign_name: str
    borrower_id: int
    borrower_name: str
    borrower_phone: str
    account_number: str
    outstanding_amount: float
    due_date: str
    preferred_language: str
    attempt_count: int
    priority: int


class CallInitiateRequest(BaseModel):
    campaign_id: int
    borrower_id: int


class CallInitiateResponse(BaseModel):
    session_uuid: str
    campaign_id: int
    borrower_id: int
    status: str
    start_time: datetime


class CallTerminateRequest(BaseModel):
    session_uuid: str
    outcome: str = "COMPLETED" # COMPLETED, PROMISE_TO_PAY, DISPUTE, ESCALATED, FAILED, SAFE_TERMINATED
    notes: Optional[str] = None


class CallTerminateResponse(BaseModel):
    session_uuid: str
    status: str
    duration_seconds: float
    final_outcome: Optional[str]
