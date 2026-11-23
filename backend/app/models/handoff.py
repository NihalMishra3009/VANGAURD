from sqlalchemy import String, Integer, ForeignKey, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from backend.app.database.base import Base, TimestampMixin
from backend.app.models.enums import HandoffStatus

if TYPE_CHECKING:
    from backend.app.models.call import CallSession
    from backend.app.models.user import User


class Handoff(Base, TimestampMixin):
    __tablename__ = "handoffs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    call_session_id: Mapped[int] = mapped_column(
        ForeignKey("call_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    collector_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    evidence_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[HandoffStatus] = mapped_column(
        String(50),
        default=HandoffStatus.TRIGGERED.value,
        nullable=False
    )
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    session: Mapped["CallSession"] = relationship("CallSession", back_populates="handoffs")
