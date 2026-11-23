from sqlalchemy import String, Integer, Boolean, ForeignKey, Text, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime
from backend.app.database.base import Base, TimestampMixin
from backend.app.models.enums import CallStatus, CampaignStatus

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.call import CallSession
    from backend.app.models.borrower import Borrower


class Campaign(Base, TimestampMixin):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=CampaignStatus.DRAFT.value, nullable=False)
    target_language: Mapped[str] = mapped_column(String(50), default="All", nullable=False)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    retry_limit: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    cooling_off_hours: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    priority_weight: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    creator: Mapped[Optional["User"]] = relationship("User")
    borrower_associations: Mapped[List["CampaignBorrower"]] = relationship(
        "CampaignBorrower",
        back_populates="campaign",
        cascade="all, delete-orphan"
    )
    call_sessions: Mapped[List["CallSession"]] = relationship(
        "CallSession",
        back_populates="campaign"
    )


class CampaignBorrower(Base, TimestampMixin):
    __tablename__ = "campaign_borrowers"
    __table_args__ = (
        UniqueConstraint("campaign_id", "borrower_id", name="uq_campaign_borrower"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True, nullable=False)
    borrower_id: Mapped[int] = mapped_column(ForeignKey("borrowers.id", ondelete="CASCADE"), index=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    calling_status: Mapped[str] = mapped_column(String(50), default=CallStatus.QUEUED.value, nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active_call: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False) # Simultaneous duplicate call prevention
    last_attempt_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="borrower_associations")
    borrower: Mapped["Borrower"] = relationship("Borrower", back_populates="campaign_associations")
