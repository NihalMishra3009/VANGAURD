# VOXGUARD Architecture & Specification

## 1. System Vision
**VOXGUARD** is an AI-powered voice intelligence and responsible debt collection platform built for banking and financial services.
Its signature innovation is **Paralinguistic State Detection from original audio independent of transcripts**.

```
                           +----------------------------------------------+
                           |          VOXGUARD PLATFORM OVERVIEW          |
                           +----------------------------------------------+

    +-------------------+      +-------------------+      +---------------------+
    |  Borrower Record  | ---> | Campaign Engine   | ---> | Simulated Calling   |
    |  (Excel / CSV)    |      | (Batch / Priority)|      | (WebRTC / Mic Audio)|
    +-------------------+      +-------------------+      +---------------------+
                                                                     |
                                              +----------------------+----------------------+
                                              |                                             |
                                              v                                             v
                                  +-----------------------+                     +-----------------------+
                                  | Speech Recognition    |                     | Voice Intelligence    |
                                  | (faster-whisper)      |                     | (Silero VAD, Librosa, |
                                  | Language ID / Text    |                     |  wav2vec2, Acoustic)  |
                                  +-----------------------+                     +-----------------------+
                                              |                                             |
                                              v                                             v
                                  +-----------------------+                     +-----------------------+
                                  | Local Conversational  |                     | Paralinguistic State: |
                                  | Intelligence (Qwen)   |                     | Arousal, Valence,     |
                                  | Approved Collection   |                     | Emotion, Distress     |
                                  +-----------------------+                     +-----------------------+
                                              \                                             /
                                               \                                           /
                                                v                                         v
                                              +---------------------------------------------+
                                              |      Decision Layer 1: Borrower Safety      |
                                              |   (Deterministic Safety Rules & Escalation) |
                                              +---------------------------------------------+
                                                       |                           |
                                      CONTINUE / SAFE  |                           | ESCALATE_TO_HUMAN
                                                       v                           v
                                            +---------------------+     +---------------------+
                                            | Complete AI Session |     | Instant Safe Freeze |
                                            | Outcome Logging     |     | Human Collector Pod |
                                            +---------------------+     +---------------------+
                                                                                   |
                                                                                   v
                                                                        +---------------------+
                                                                        | Decision Layer 2:   |
                                                                        | Collector Monitoring|
                                                                        +---------------------+
                                                                                   |
                                                                                   v
                                                                        +---------------------+
                                                                        | Supervisor Console  |
                                                                        | Real-time Alerts    |
                                                                        +---------------------+
```

## 2. Core Architectural Principles
1. **Separation of Concerns**: Acoustic / paralinguistic voice analysis operates completely independently of transcripts.
2. **Deterministic Safety Primacy**: The LLM creates conversational text, but can NEVER override the deterministic safety engine (`Decision Layer 1`).
3. **Pluggable Agent & Model Registry**: Common abstract interfaces for STT, TTS, LLM, VAD, and SER (Speech Emotion Recognition) models allow zero-downtime model swaps.
4. **Resilient Local Execution**: Zero external cloud or API dependencies. Runs on local CPU and RTX 3050 GPU (4GB VRAM) with quantization and shared inference services.
5. **Auditable & Responsible Banking Compliance**: Full event sourcing and immutable audit logs. PII phone masking, role-based access control (Admin, Campaign Manager, Human Collector, Supervisor), and safe borrower termination policies.
6. **Multi-Dialectal & Multilingual**: Tailored support for English, Hindi, and Marathi with language-specific acoustic awareness.

## 3. Technology Stack
- **Backend**: FastAPI, Pydantic v2, SQLAlchemy 2.0 (async + sync), Alembic, Asyncpg, Psycopg2-binary.
- **Database**: PostgreSQL 17 (Primary), with Redis for Celery queues and WebSocket pub/sub.
- **Frontend**: React 18 / 19, Vite, TypeScript, Tailwind CSS, Lucide icons, Recharts.
- **Audio & ML**: faster-whisper, Silero VAD, Librosa, PyTorch, HuggingFace Transformers (wav2vec2), Scikit-Learn, soundfile.
- **Local LLM**: Ollama (Qwen2.5) with strict fallback prompt templates and safety guardrails.
