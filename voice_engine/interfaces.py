from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class EmotionPrediction(BaseModel):
    """
    Standardized emotion prediction output.
    Arousal and valence are strictly marked optional/None unless backed by
    an honest, evaluated regression head. They are NEVER fabricated.
    """
    model_name: str
    model_version: str
    predicted_emotion: str # 'neutral', 'angry', 'happy', 'sad', 'distressed', 'anxious'
    emotion_probabilities: Dict[str, float]
    confidence: float # Calibrated prediction confidence [0.0 - 1.0]
    is_uncertain: bool = False # Flagged when audio quality or confidence is below safety thresholds
    
    # Continuous paralinguistic indicators (strictly None if unsupported by candidate model)
    arousal: Optional[float] = None # Activation / agitation [0.0, 1.0]
    valence: Optional[float] = None # Positivity / negativity [-1.0, 1.0]
    
    # Telephony and quality metadata
    audio_snr_db: Optional[float] = None
    telephony_clipped: bool = False
    window_timestamp_sec: float = 0.0


class BaseEmotionModel(ABC):
    """
    Abstract interface for all Speech Emotion Recognition candidates.
    Guarantees zero coupling between the voice transport/calling agent
    and the underlying ML architecture.
    """

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Name of candidate model (e.g. 'YUNCOX-Wav2Vec2-SVM', 'WavLM-Emotion', 'Acoustic-Baseline')."""
        pass

    @property
    @abstractmethod
    def supported_emotions(self) -> List[str]:
        """List of supported categorical emotion classes."""
        pass

    @property
    @abstractmethod
    def supports_continuous_dimensions(self) -> bool:
        """Returns True only if the model computes evaluated arousal/valence."""
        pass

    @abstractmethod
    def predict_window(
        self,
        audio_pcm_16k: bytes,
        sample_rate: int = 16000,
        timestamp_sec: float = 0.0
    ) -> EmotionPrediction:
        """
        Processes a single rolling audio window (e.g. 2.0s - 3.0s raw PCM).
        Must return structured EmotionPrediction with calibration & quality checks.
        """
        pass
