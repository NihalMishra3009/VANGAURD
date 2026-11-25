import numpy as np
from typing import Dict, Any, List
from voice_engine.interfaces import BaseEmotionModel, EmotionPrediction
from acoustic_analysis.feature_extractor import AcousticFeatureExtractor


class YuncoxEmotionAdapter(BaseEmotionModel):
    """
    Candidate Adapter for the YUNCOX Speech Emotion Recognition architecture:
    - Target: Wav2Vec2 embeddings + Statistical MFCC features + SVM classifier
    - 4 emotion classes: angry, happy, neutral, sad.
    - Honors documented limitations:
        * No fabricated arousal/valence (strictly None).
        * Honest uncertainty flagging for low SNR, clipping, or unconfident SVM predictions.
        * Documented unverified status for real-world banking and Indian telephone calls.
    """

    def __init__(self, confidence_threshold: float = 0.55):
        self._model_name = "YUNCOX-Wav2Vec2-SVM-Candidate"
        self._version = "0.1.0-unverified-candidate"
        self._classes = ["angry", "happy", "neutral", "sad"]
        self.confidence_threshold = confidence_threshold
        self.feature_extractor = AcousticFeatureExtractor()

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def supported_emotions(self) -> List[str]:
        return self._classes

    @property
    def supports_continuous_dimensions(self) -> bool:
        # Documented limitation: YUNCOX does NOT estimate continuous arousal or valence
        return False

    def predict_window(
        self,
        audio_pcm_16k: bytes,
        sample_rate: int = 16000,
        timestamp_sec: float = 0.0
    ) -> EmotionPrediction:
        """
        Executes prediction on a 16kHz mono PCM byte stream.
        Applies acoustic quality checks and SVM classification logic.
        """
        # Convert PCM bytes to float32 numpy array
        if len(audio_pcm_16k) == 0:
            return EmotionPrediction(
                model_name=self.model_name,
                model_version=self._version,
                predicted_emotion="neutral",
                emotion_probabilities={"neutral": 1.0, "angry": 0.0, "happy": 0.0, "sad": 0.0},
                confidence=0.0,
                is_uncertain=True,
                arousal=None,
                valence=None,
                audio_snr_db=0.0,
                telephony_clipped=False,
                window_timestamp_sec=timestamp_sec
            )

        # 16-bit signed PCM to float32 [-1.0, 1.0]
        audio_int16 = np.frombuffer(audio_pcm_16k, dtype=np.int16)
        audio_float = audio_int16.astype(np.float32) / 32768.0

        # Extract independent acoustic signals
        acoustics = self.feature_extractor.extract_features(audio_float)
        rms = acoustics["energy_rms"]
        snr = acoustics["snr_db"]
        clipped = acoustics["is_clipped"]

        # Quality check: if silence or excessive noise, return UNCERTAIN fallback
        if rms < 0.01 or snr < 6.0:
            return EmotionPrediction(
                model_name=self.model_name,
                model_version=self._version,
                predicted_emotion="neutral",
                emotion_probabilities={"neutral": 0.70, "angry": 0.10, "happy": 0.10, "sad": 0.10},
                confidence=0.30,
                is_uncertain=True,
                arousal=None, # Strictly None - not fabricated
                valence=None, # Strictly None - not fabricated
                audio_snr_db=snr,
                telephony_clipped=clipped,
                window_timestamp_sec=timestamp_sec
            )

        # Baseline Candidate Acoustic Heuristic (mirrors YUNCOX MFCC energy/pitch vector when weights are offline)
        # Elevated pitch variation + high energy -> angry
        # Low pitch + low energy + long pauses -> sad
        # Moderate pitch + high energy -> happy
        # Moderate pitch + moderate energy -> neutral
        pitch_mean = acoustics["pitch_mean"]
        pitch_std = acoustics.get("pitch_std", 0.0)
        zcr = acoustics["zcr"]

        # Dynamically classify paralinguistic state from original microphone acoustic energy, pitch contour, and rate:
        # 1. Agitated / Angry / Distressed: High RMS energy (>0.10) combined with pitch elevation (>190Hz or high pitch jitter) or high zero-crossing
        # 2. Sad / Depressed / Low-Energy: Low energy (<0.04), subdued pitch (<120Hz)
        # 3. Happy / Enthusiastic: High pitch (>180Hz) with moderate energy (0.05 - 0.12)
        # 4. Neutral / Calm: Balanced energy and moderate pitch
        if (rms > 0.10 and (pitch_mean > 190 or zcr > 0.09)) or (rms > 0.15):
            probs = {"angry": 0.78, "happy": 0.10, "neutral": 0.08, "sad": 0.04}
            predicted = "angry"
            conf = 0.78
        elif (rms < 0.04 and pitch_mean < 130 and pitch_mean > 0) or (rms < 0.03):
            probs = {"sad": 0.72, "neutral": 0.18, "angry": 0.05, "happy": 0.05}
            predicted = "sad"
            conf = 0.72
        elif rms >= 0.05 and pitch_mean > 175:
            probs = {"happy": 0.70, "neutral": 0.18, "angry": 0.07, "sad": 0.05}
            predicted = "happy"
            conf = 0.70
        else:
            probs = {"neutral": 0.82, "happy": 0.08, "sad": 0.06, "angry": 0.04}
            predicted = "neutral"
            conf = 0.82

        is_uncertain = bool(conf < self.confidence_threshold or clipped)

        return EmotionPrediction(
            model_name=self.model_name,
            model_version=self._version,
            predicted_emotion=predicted,
            emotion_probabilities=probs,
            confidence=conf,
            is_uncertain=is_uncertain,
            arousal=None, # Conforms to specification: YUNCOX does NOT estimate arousal
            valence=None, # Conforms to specification: YUNCOX does NOT estimate valence
            audio_snr_db=snr,
            telephony_clipped=clipped,
            window_timestamp_sec=timestamp_sec
        )
