from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, Text, DateTime, Date, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime, date
import uuid
from backend.app.database.base import Base, TimestampMixin
from backend.app.models.enums import CallStatus

if TYPE_CHECKING:
    from backend.app.models.campaign import Campaign
    from backend.app.models.borrower import Borrower
    from backend.app.models.voice import VoiceAnalysis
    from backend.app.models.handoff import Handoff
    from backend.app.models.monitoring import MonitoringAlert


class CallSession(Base, TimestampMixin):
    __tablename__ = "call_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    session_uuid: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        index=True,
        default=lambda: str(uuid.uuid4())
    )
    campaign_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        index=True,
        nullable=True
    )
    borrower_id: Mapped[int] = mapped_column(
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    status: Mapped[CallStatus] = mapped_column(String(50), default=CallStatus.PENDING.value, nullable=False)
    language: Mapped[str] = mapped_column(String(30), default="English", nullable=False)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    final_outcome: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_escalated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    escalation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    campaign: Mapped[Optional["Campaign"]] = relationship("Campaign", back_populates="call_sessions")
    borrower: Mapped["Borrower"] = relationship("Borrower", back_populates="call_sessions")
    attempts: Mapped[List["CallAttempt"]] = relationship(
        "CallAttempt",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    transcripts: Mapped[List["Transcript"]] = relationship(
        "Transcript",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    voice_analyses: Mapped[List["VoiceAnalysis"]] = relationship(
        "VoiceAnalysis",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    handoffs: Mapped[List["Handoff"]] = relationship(
        "Handoff",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    commitments: Mapped[List["Commitment"]] = relationship(
        "Commitment",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    monitoring_alerts: Mapped[List["MonitoringAlert"]] = relationship(
        "MonitoringAlert",
        back_populates="session",
        cascade="all, delete-orphan"
    )


class CallAttempt(Base, TimestampMixin):
    __tablename__ = "call_attempts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    call_session_id: Mapped[int] = mapped_column(
        ForeignKey("call_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="INITIATED", nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    session: Mapped["CallSession"] = relationship("CallSession", back_populates="attempts")


class Transcript(Base, TimestampMixin):
    __tablename__ = "transcripts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    call_session_id: Mapped[int] = mapped_column(
        ForeignKey("call_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    speaker: Mapped[str] = mapped_column(String(30), nullable=False) # AI, BORROWER, COLLECTOR
    text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(30), default="en", nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    start_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    end_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    session: Mapped["CallSession"] = relationship("CallSession", back_populates="transcripts")


class Commitment(Base, TimestampMixin):
    __tablename__ = "commitments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    call_session_id: Mapped[int] = mapped_column(
        ForeignKey("call_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    borrower_id: Mapped[int] = mapped_column(
        ForeignKey("borrowers.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    promised_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    promised_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    explicitly_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    session: Mapped["CallSession"] = relationship("CallSession", back_populates="commitments")
