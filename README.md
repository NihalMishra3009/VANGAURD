# VOXGUARD

AI-Powered Voice Intelligence and Responsible Debt Collection Platform.

## Features
- **Borrower & Campaign Management (Phase 2 Verified)**: Batch Excel/CSV uploads with strict phone sanitization, duplicate detection, column auto-mapping, and campaign borrower assignment with simultaneous duplicate call prevention.
- **Master Borrower Directory**: Encrypted PII phone masking (`+91 98765XXXXX`), search across ID/name/phone, eligibility status toggling, and audit dossiers.
- **Campaign Orchestration**: Multi-campaign management with retry limits, cooling-off hours, target language filters, and real-time progress metrics.
- **Paralinguistic Voice Intelligence (Upcoming Phase 5)**: Real-time extraction of pitch, energy, jitter, shimmer, MFCCs, and wav2vec2 embeddings to measure arousal, valence, and distress independently of transcripts.
- **Deterministic Borrower Safety Engine (Decision Layer 1)**: Automatic freeze of collection calls upon distress detection or explicit borrower requests.
- **Seamless Human Handoff**: Low-latency session context transfer to human collector workstations.
- **Collector Monitoring (Decision Layer 2)**: Continuous compliance monitoring for interruption, talk-ratio, and pressure language with supervisor alerting.
- **Multilingual Support**: English, Hindi, and Marathi conversational workflows.
- **Enterprise Security**: Role-based access control (Admin, Campaign Manager, Human Collector, Supervisor), JWT sessions, PBKDF2/Bcrypt password hashing, and audit trails.

## Quick Start

### Backend Setup
```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend\requirements.txt

# Start backend server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to access the application.
