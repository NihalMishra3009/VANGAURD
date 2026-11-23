from sqlalchemy import String, Numeric, Date, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional, TYPE_CHECKING
from datetime import date
from backend.app.database.base import Base, TimestampMixin
from backend.app.models.enums import EligibilityStatus

if TYPE_CHECKING:
    from backend.app.models.upload import UploadBatch
    from backend.app.models.campaign import CampaignBorrower
    from backend.app.models.call import CallSession, Commitment


class Borrower(Base, TimestampMixin):
    __tablename__ = "borrowers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    borrower_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False) # Stable Master ID
    upload_batch_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("upload_batches.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    account_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(30), default="English", nullable=False)
    emi_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    outstanding_amount: Mapped[float] = mapped_column(Numeric(12, 2), index=True, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    eligibility_status: Mapped[EligibilityStatus] = mapped_column(
        SQLEnum(EligibilityStatus),
        default=EligibilityStatus.ELIGIBLE,
        nullable=False
    )
    risk_score: Mapped[Optional[float]] = mapped_column(Numeric(4, 2), nullable=True, default=0.0)
    stop_contact: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dispute_status: Mapped[str] = mapped_column(String(50), default="NONE", nullable=False) # NONE, DISPUTED, UNDER_REVIEW

    # Relationships
    upload_batch: Mapped[Optional["UploadBatch"]] = relationship("UploadBatch", back_populates="borrowers")
    campaign_associations: Mapped[List["CampaignBorrower"]] = relationship(
        "CampaignBorrower",
        back_populates="borrower",
        cascade="all, delete-orphan"
    )
    call_sessions: Mapped[List["CallSession"]] = relationship(
        "CallSession",
        back_populates="borrower"
    )
    commitments: Mapped[List["Commitment"]] = relationship(
        "Commitment",
        primaryjoin="Borrower.id == foreign(Commitment.borrower_id)",
        cascade="all, delete-orphan"
    )

    @property
    def masked_phone(self) -> str:
        """Mask phone for privacy e.g. +91 98765XXXXX."""
        if len(self.phone) >= 4:
            return self.phone[:-4] + "XXXX"
        return "XXXX"
