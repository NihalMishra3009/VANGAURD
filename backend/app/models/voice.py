from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, Dict, Any, TYPE_CHECKING
from backend.app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.call import CallSession


class VoiceAnalysis(Base, TimestampMixin):
    """
    Paralinguistic Voice Intelligence extracted directly from original audio,
    strictly independent of the transcript.
    """
    __tablename__ = "voice_analysis"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    call_session_id: Mapped[int] = mapped_column(
        ForeignKey("call_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    window_index: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp_offset: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # Acoustic Features
    pitch_mean: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pitch_std: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    energy_rms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    speaking_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # syllables/sec or voiced segments
    spectral_centroid: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    spectral_flux: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pause_duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mfcc_summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Paralinguistic Emotional / Distress State
    arousal: Mapped[float] = mapped_column(Float, nullable=False, default=0.5) # [0.0, 1.0]
    valence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0) # [-1.0, 1.0]
    emotion_label: Mapped[str] = mapped_column(String(50), default="Neutral", nullable=False)
    emotion_confidence: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    distress_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    session: Mapped["CallSession"] = relationship("CallSession", back_populates="voice_analyses")


class AudioReference(Base, TimestampMixin):
    """Secure reference for encrypted private audio recording storage."""
    __tablename__ = "audio_references"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    call_session_id: Mapped[int] = mapped_column(
        ForeignKey("call_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    format: Mapped[str] = mapped_column(String(20), default="wav", nullable=False)
    sample_rate: Mapped[int] = mapped_column(Integer, default=16000, nullable=False)
    channels: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    storage_type: Mapped[str] = mapped_column(String(50), default="LOCAL_SECURE", nullable=False)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
