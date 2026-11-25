import pytest
import numpy as np
from voice_engine.yuncox_adapter import YuncoxEmotionAdapter
from safety_engine.deterministic_policy import (
    DeterministicSafetyEngine,
    SafetyEvaluationInput,
    SafetyAction
)


def test_yuncox_adapter_interface_and_no_fabricated_dimensions():
    adapter = YuncoxEmotionAdapter(confidence_threshold=0.60)
    assert adapter.model_name == "YUNCOX-Wav2Vec2-SVM-Candidate"
    assert adapter.supports_continuous_dimensions is False
    assert "angry" in adapter.supported_emotions

    # Generate synthetic 16kHz sine wave audio (2.0s = 32000 samples)
    t = np.linspace(0, 2.0, 32000, endpoint=False)
    audio = (0.25 * np.sin(2 * np.pi * 240 * t)).astype(np.float32)
    pcm_bytes = (audio * 32767).astype(np.int16).tobytes()

    pred = adapter.predict_window(pcm_bytes, sample_rate=16000, timestamp_sec=1.5)
    assert pred.model_name == "YUNCOX-Wav2Vec2-SVM-Candidate"
    assert pred.predicted_emotion in adapter.supported_emotions
    # Core requirement verification: YUNCOX must NEVER fabricate arousal or valence
    assert pred.arousal is None
    assert pred.valence is None
    assert pred.audio_snr_db is not None


def test_deterministic_safety_stop_contact_outranks_all():
    engine = DeterministicSafetyEngine()
    state = SafetyEvaluationInput(
        borrower_requested_stop_contact=True,
        consecutive_distress_windows=5,
        borrower_requested_human=True
    )
    result = engine.evaluate(state)
    assert result.action == SafetyAction.STOP_CONTACT
    assert result.reason_code == "BORROWER_STOP_CONTACT_ASSERTION"
    assert result.severity == "CRITICAL"


def test_deterministic_safety_human_handoff_and_fallback():
    engine = DeterministicSafetyEngine()
    
    # 1. Human available -> HUMAN_HANDOFF
    state_avail = SafetyEvaluationInput(
        borrower_requested_human=True,
        human_collector_available=True
    )
    res_avail = engine.evaluate(state_avail)
    assert res_avail.action == SafetyAction.HUMAN_HANDOFF
    assert res_avail.reason_code == "BORROWER_REQUESTED_HUMAN"

    # 2. Human unavailable -> SAFE_TERMINATION with callback
    state_unavail = SafetyEvaluationInput(
        borrower_requested_human=True,
        human_collector_available=False
    )
    res_unavail = engine.evaluate(state_unavail)
    assert res_unavail.action == SafetyAction.SAFE_TERMINATION
    assert res_unavail.reason_code == "HUMAN_UNAVAILABLE_SAFE_CALLBACK"


def test_deterministic_safety_sustained_distress_escalation():
    engine = DeterministicSafetyEngine(distress_persistence_threshold=3)
    
    # 2 windows -> CONTINUE
    state_transient = SafetyEvaluationInput(consecutive_distress_windows=2)
    assert engine.evaluate(state_transient).action == SafetyAction.CONTINUE

    # 3 windows -> HUMAN_HANDOFF
    state_sustained = SafetyEvaluationInput(consecutive_distress_windows=3, human_collector_available=True)
    res = engine.evaluate(state_sustained)
    assert res.action == SafetyAction.HUMAN_HANDOFF
    assert res.reason_code == "SUSTAINED_ACOUSTIC_DISTRESS"


def test_deterministic_safety_model_uncertainty_pause():
    engine = DeterministicSafetyEngine(uncertainty_persistence_threshold=4)
    state = SafetyEvaluationInput(consecutive_uncertain_windows=4)
    res = engine.evaluate(state)
    assert res.action == SafetyAction.PAUSE
    assert res.reason_code == "MODEL_SIGNAL_UNCERTAINTY"
