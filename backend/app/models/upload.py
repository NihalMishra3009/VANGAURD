from sqlalchemy import String, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, Dict, Any, List, TYPE_CHECKING
from backend.app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.borrower import Borrower


class UploadBatch(Base, TimestampMixin):
    """Immutable audit record and batch reference for borrower file imports."""
    __tablename__ = "upload_batches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    batch_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    uploaded_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    imported_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rejected_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicate_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="COMPLETED", nullable=False) # PENDING, COMPLETED, FAILED, PARTIAL
    summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")
    borrowers: Mapped[List["Borrower"]] = relationship("Borrower", back_populates="upload_batch")
