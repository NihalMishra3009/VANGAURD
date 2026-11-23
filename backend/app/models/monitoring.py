from sqlalchemy import String, Integer, Boolean, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, Dict, Any, TYPE_CHECKING
from datetime import datetime
from backend.app.database.base import Base, TimestampMixin
from backend.app.models.enums import AlertSeverity, AlertType

if TYPE_CHECKING:
    from backend.app.models.call import CallSession
    from backend.app.models.user import User


class MonitoringAlert(Base, TimestampMixin):
    __tablename__ = "monitoring_alerts"

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
    alert_type: Mapped[AlertType] = mapped_column(String(100), nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(String(50), default=AlertSeverity.MEDIUM.value, nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    is_cleared: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cleared_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    cleared_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    session: Mapped["CallSession"] = relationship("CallSession", back_populates="monitoring_alerts")


class SupervisorAction(Base, TimestampMixin):
    __tablename__ = "supervisor_actions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    supervisor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    call_session_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("call_sessions.id", ondelete="SET NULL"),
        nullable=True
    )
    action_type: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. BARGE_IN, WHISPER, CLEAR_ALERT, TERMINATE
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
