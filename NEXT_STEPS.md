# VOXGUARD — Next Steps

## Next Phase: PHASE 3 — Calling Queue & Working Simulated Call Interface

### Objectives:
1. **Module C — Sequential Calling Queue**:
   - Implement real-time priority calling queue engine for active campaigns.
   - Dispatch borrower sessions sequentially according to priority weight and retry policy.
   - Prevent simultaneous duplicate calls by locking borrower records with `is_active_call`.
   - Implement queue pause/resume controls and dynamic re-ordering.

2. **Module D — Simulated AI Calling Workstation**:
   - Build a functional browser-based calling interface in React:
     - Laptop microphone capture via Web Audio API / MediaRecorder.
     - Simulated speaker output for AI conversational responses.
     - Real-time audio waveform visualizer (canvas-based).
     - Active call session timer, call state badges (`INITIATED`, `CONNECTED`, `IN_PROGRESS`, `TERMINATED`).
     - Borrower dossier display during live call (name, debt details, approved dialogue script).
     - Manual call controls: "Initiate Call", "Mute Microphone", "End Call", "Request Human Handoff".
   - Backend WebSocket / API calling session endpoint (`/api/v1/calling/ws/{session_id}`):
     - Session state machine managing `CallSession` and `CallAttempt` records.
     - Audio chunk ingestion and streaming pipeline placeholder for Phase 4 (LLM/STT) and Phase 5 (Voice Intelligence).

3. **Dependencies & Prerequisites**:
   - PostgreSQL 17 active (verified).
   - Audio permissions enabled in the browser (standard `navigator.mediaDevices.getUserMedia`).
