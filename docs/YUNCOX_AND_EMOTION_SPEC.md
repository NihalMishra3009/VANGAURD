# VOXGUARD — Speech Emotion Recognition & Acoustic Intelligence Architecture

## 1. YUNCOX Baseline Model Inspection & Analysis

Candidate Repository: [https://github.com/YUNCOX/speech-emotion-recognition](https://github.com/YUNCOX/speech-emotion-recognition)

### 1.1 Documented Architecture
- **Feature Extraction 1**: Wav2Vec2 (`facebook/wav2vec2-base-960h` / `wav2vec2-large-robust`) dense acoustic embeddings.
- **Feature Extraction 2**: Statistical 13-40 MFCC features (mean, standard deviation, skew across frames).
- **Classifier**: Support Vector Machine (`SVC` with RBF kernel) trained on concatenated embedding + MFCC vectors.
- **Emotion Classes (4-class classification)**:
  1. `angry`
  2. `happy`
  3. `neutral`
  4. `sad`
- **Reported Metric**: Weighted F1 score of **0.7711** on 280 held-out samples.
- **Training Corpora**: Evaluated holding out selected RAVDESS actors while mixing portions of TESS and CREMA-D.

---

## 2. Documented Limitations & Operational Risks for Financial Operations

The YUNCOX model is an **experimental academic baseline**, NOT a production-ready or scientifically validated engine for banking debt collection. Integrating it as a hard dependency or claiming it is sufficient for borrower safety violates banking compliance and responsible AI standards.

| Limitation | Operational Risk in VOXGUARD | Mitigating Engineering Architecture |
|---|---|---|
| **No Streaming Audio Support** | YUNCOX processes full, clean, static `.wav` files. It has no mechanism for sliding window streaming. | VOXGUARD implements `RollingAudioBuffer` with 2.5s window / 0.5s hop for WebRTC / LiveKit audio frames. |
| **No Continuous Arousal/Valence** | Categorical 4-class labels only. It cannot quantify activation (arousal) or pleasantness/unpleasantness (valence). | Separate regression models for dimensional arousal/valence; YUNCOX will never synthesize or fabricate fake valence/arousal numbers. |
| **No Distress Detection** | "Sad" or "Angry" does not equal borrower distress or financial panic. | VOXGUARD isolates acoustic paralinguistics from the safety engine. Distress is evaluated using sustained high arousal + negative valence + acoustic agitation (pitch jitter, energy spikes). |
| **No Indian Dialect / Accent Coverage** | Trained on North American English actors (RAVDESS, TESS, CREMA-D). Zero Indian English, Hindi, or regional accents. | Multi-accent benchmark framework; language-agnostic acoustic features (librosa/openSMILE) combined with WavLM/Whisper acoustic encoder evaluation. |
| **No Telephony Channel Robustness** | Clean 16kHz/48kHz studio audio. Zero 8kHz G.711 / AMR narrowband telephony noise, compression artifacts, or line jitter. | Acoustic Preprocessing Pipeline applies 8kHz bandpass filtering, clipping detection, SNR estimation, and telephony noise augmentation. |
| **No Safety Calibration** | Standard SVM output probabilities (via Platt scaling) are uncalibrated and overconfident on out-of-distribution audio. | Calibrated confidence scoring; any window with confidence below threshold or low SNR defaults to `UNCERTAIN` (failsafe fallback). |
| **Zero Real-World Banking Validation** | 280 actor clips cannot validate real debtor interactions. | YUNCOX is treated strictly as an **optional candidate adapter** behind an abstract interface. Never claim production accuracy without real representative evaluation. |

---

## 3. Replaceable Emotion & Acoustic Engine Architecture

VOXGUARD decouples voice intelligence into modular, swappable components:

```
[ Incoming Audio Track (LiveKit / Browser WebRTC) ]
                        │
                        ▼
         [ Audio Preprocessor & VAD ]
        (16kHz mono normalization, Silero VAD, SNR check)
                        │
                        ▼
         [ Rolling Audio Window Buffer ]
          (2.5s window, 500ms slide)
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
[ Acoustic Feature Extractor ]   [ Replaceable Model Adapter ]
(Pitch, Energy RMS, Jitter,      (Interface: `BaseEmotionModel`)
 Pauses, Spectral Centroid)             │
        │                        ├─ YuncoxEmotionAdapter (Candidate)
        │                        ├─ WavLMEmotionAdapter (Candidate)
        │                        └─ OpenSmileAcousticAdapter
        │                               │
        └───────────────┬───────────────┘
                        ▼
         [ Temporal Smoother & Calibrator ]
         (Exponential decay, window persistence,
          uncertainty & confidence scoring)
                        │
                        ▼
          [ Paralinguistic State Event ]
          (Emotion, Arousal, Valence, Confidence)
                        │
                        ▼
         [ Deterministic Safety Engine ]
          (Pure rule-based, LLM-independent)
```

### 3.1 Model Benchmarking Matrix (Evaluation Framework)

Before promoting any model beyond `Candidate`, it must be evaluated on:
1. **Accuracy & Macro F1**: Evaluated across balanced speaker splits.
2. **Inference Latency**: Maximum 150ms per 2.5s window on CPU/RTX 3050 GPU.
3. **VRAM Footprint**: Under 1.5 GB VRAM to allow co-location with STT/LLM.
4. **Telephony Robustness**: Metric retention when degraded with 8kHz PCM telephony noise.
5. **Cross-Language Consistency**: Stability across English, Hindi, and Indian dialect speech.
