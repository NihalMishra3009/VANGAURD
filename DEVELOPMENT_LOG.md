# VOXGUARD — Development Log

## 2026-11-24: Phase 1 — Foundation & Authentication
- **Environment**: Windows 11, Python 3.11.9, Node.js 26.4.0, PostgreSQL 17.6, NVIDIA RTX 3050 Laptop GPU (4 GB VRAM).
- **Architecture**: Modular monolith created (`backend/app/{core, database, models, schemas, repositories, services, api, agents, voice, safety, calling, monitoring, reporting}`).
- **Database**: Initialized PostgreSQL `voxguard` database with 14 tables and seeded 4 role accounts (`admin@voxguard.bank`, `campaign@voxguard.bank`, `collector@voxguard.bank`, `supervisor@voxguard.bank`).
- **Tests**: Pytest suite established in `backend/tests` covering auth, RBAC, health, and readiness (`6 passed in 1.98s`).
- **Frontend**: Vite React TS frontend with Tailwind CSS v4 and `AuthContext` built and verified (`npm run build` passed with 0 errors).

## 2026-11-24: Phase 2 — Borrower Management & Campaign Management
- **Database Schema**:
  - Created `UploadBatch` model (`upload_batches` table) to preserve raw uploaded files and record import metadata.
  - Added `upload_batch_id`, `account_number`, `stop_contact`, `dispute_status` to `borrowers` table with indexes on `name`, `due_date`, `outstanding_amount`, `phone`.
  - Added `start_date`, `end_date`, `retry_limit`, `cooling_off_hours`, `priority_weight` to `campaigns` table.
  - Added `is_active_call` flag and `uq_campaign_borrower` unique constraint to `campaign_borrowers` table.
  - Executed migration script `backend/app/database/migrate_phase2.py` against PostgreSQL.
- **Backend Services & Repositories**:
  - `BorrowerImportService`: Implemented two-step upload pipeline (`preview_upload` and `commit_upload`). Saves raw file in `storage/uploads/`, auto-detects column names, normalizes Indian phones to E.164, detects within-file and database duplicates, parses dates, derives eligibility, and caches preview for atomic commit.
  - `BorrowerRepository`: Implemented paginated directory queries with search across ID, name, phone, account number, multi-criteria filtering, and deep relation loading for borrower dossiers.
  - `CampaignRepository`: Implemented campaign lifecycle management, real-time metric aggregation (status counts, total outstanding debt), and batch borrower assignment with restriction enforcement (skipping stop-contact, do-not-call, and already assigned records).
  - API Routers: Registered `/api/v1/borrowers` and `/api/v1/campaigns` endpoints under `v1_router`.
- **Frontend Components**:
  - `BorrowerUploadPage.tsx`: Drag-and-drop file ingestion, template downloads, column mapping review, valid vs invalid row breakdown, and commit action.
  - `BorrowersPage.tsx`: Searchable directory with masked phones, status badges, and dossier launcher.
  - `BorrowerDetailModal.tsx`: Comprehensive borrower dossier with safety governance toggles, campaign history, call attempts, and commitments.
  - `CampaignsPage.tsx`: Campaign portfolio view with status filters, debt volume summaries, and creation modal.
  - `CampaignDetailPage.tsx`: Detailed campaign control panel with progress metrics, status triggers, and borrower roster table.
  - `AssignBorrowersModal.tsx`: Batch borrower assignment modal with search, select-all, and priority selection.
- **Verification**:
  - Created `data/sample/borrowers_sample_compliant.csv` and `data/sample/borrowers_sample_with_validation_scenarios.xlsx`.
  - Verified 9/9 pytest tests pass in `backend/tests`.
  - Verified Vite production build (`npm run build`) succeeded with 0 errors.

## 2026-11-24: Pylance / Pyright Model Reference Error Fixes
- **Root Cause**:
  - In SQLAlchemy 2.0 with type annotations (e.g. `Mapped[Optional["UploadBatch"]]`), static type checkers like Pyright/Pylance inspect string type literals to resolve typing symbols.
  - Target related model classes were defined in separate model files and registered in `backend/app/models/__init__.py`. While runtime SQLAlchemy mappers resolved these strings without issue, the local module namespaces in `borrower.py`, `campaign.py`, `upload.py`, and other models lacked imported references to those symbols, triggering `reportUndefinedVariable` errors.
- **Resolution**:
  - Applied the standard SQLAlchemy 2.0 type-checking pattern using `if TYPE_CHECKING:` imports across:
    - `backend/app/models/borrower.py` (`UploadBatch`, `CampaignBorrower`, `CallSession`, `Commitment`)
    - `backend/app/models/campaign.py` (`User`, `CallSession`, `Borrower`)
    - `backend/app/models/upload.py` (`User`, `Borrower`)
    - `backend/app/models/user.py` (`AuditLog`)
    - `backend/app/models/call.py` (`Campaign`, `Borrower`, `VoiceAnalysis`, `Handoff`, `MonitoringAlert`)
    - `backend/app/models/audit.py` (`User`)
    - `backend/app/models/voice.py` (`CallSession`)
    - `backend/app/models/handoff.py` (`CallSession`, `User`)
    - `backend/app/models/monitoring.py` (`CallSession`, `User`)
  - Preserved all foreign keys, relationship configurations, cascade settings, and `back_populates` declarations intact.
  - Did NOT use `# type: ignore` workarounds or circular runtime imports.
- **Verification**:
  - Python byte compilation (`compileall`): Passed cleanly across all backend modules.
  - SQLAlchemy model mapper configuration (`configure_mappers()`): All mappers initialized and mapped cleanly with 0 errors.
  - Pyright static analysis (`npx pyright backend/app/models/`): 0 errors, 0 warnings, 0 informations.
  - Backend pytest test suite: 9/9 tests passed in 4.15s against PostgreSQL.

## 2026-11-24: Local Application Startup & Live End-to-End Workflow Verification
- **Runtime Services**:
  - Started Uvicorn FastAPI backend on `http://127.0.0.1:8000` via Windows PowerShell background daemon with `--reload`.
  - Started Vite React frontend dev server on `http://localhost:5173` via Windows PowerShell background daemon with reverse proxying (`/api` -> `8000`, `/ws` -> `8000`).
- **Pre-flight & Service Status**:
  - PostgreSQL port 5432: Connected and verified (`SELECT 1` succeeded).
  - Redis port 6379: Checked; not required for Phase 1/2 (scheduled for Phase 8 concurrent queue).
  - API Health (`/api/v1/health`): Responded with `status: healthy`, `app_name: VOXGUARD`, `version: 1.0.0`.
  - API Readiness (`/api/v1/readiness`): Responded with `status: ready`, `database: connected`, `voice_engine: ready`, `calling_queue: ready`.
  - Vite Proxy: Verified `http://localhost:5173/api/v1/health` forwards seamlessly to backend.
- **Authentication Verification**:
  - Logged in and verified JWT issuance and role matching via `/api/v1/auth/me` across all 4 seeded roles:
    - `admin@voxguard.bank` -> `Role: ADMIN`
    - `campaign@voxguard.bank` -> `Role: CAMPAIGN_MANAGER`
    - `collector@voxguard.bank` -> `Role: HUMAN_COLLECTOR`
    - `supervisor@voxguard.bank` -> `Role: SUPERVISOR`
- **End-to-End Workflow Verification (via Frontend Proxy `http://localhost:5173`)**:
  - **Audit Logs**: Verified live database event query (`/api/v1/audit-logs`) returning persisted audit trail items.
  - **Template Downloads**: Verified instant download of both `.csv` and `.xlsx` borrower templates.
  - **Borrower Ingestion Pipeline**:
    - Dispatched multipart CSV upload to `/api/v1/borrowers/upload-preview`.
    - Verified validation breakdown: 4 rows evaluated, 4 valid, 0 invalid, batch ID assigned.
    - Committed valid records via `/api/v1/borrowers/upload-commit`.
    - Queried Master Borrower Directory `/api/v1/borrowers` and retrieved deep relation Borrower Dossier `/api/v1/borrowers/{id}`.
  - **Campaign Orchestration**:
    - Created new recovery campaign via `POST /api/v1/campaigns` (`E2E Recovery Drive`, target English, cooling-off 24h, retry limit 3).
    - Batch-assigned eligible borrowers via `POST /api/v1/campaigns/{id}/assign`.
    - Verified protection filters: eligible borrowers assigned to `QUEUED` calling state, ineligible/zero-balance records filtered out.
    - Activated campaign status to `ACTIVE` via `PATCH /api/v1/campaigns/{id}`.
    - Verified Campaign Roster via `GET /api/v1/campaigns/{id}/borrowers` showing assigned borrowers and `is_active_call: False` locks.
- **Frontend Page Transformations**:
  - Verified Vite transformation pipeline served all page components (`LoginPage.tsx`, `DashboardPage.tsx`, `BorrowersPage.tsx`, `BorrowerUploadPage.tsx`, `CampaignsPage.tsx`, `CampaignDetailPage.tsx`, `AuditLogsPage.tsx`) with HTTP 200 and zero compilation errors.
- **Backend Test Suite**:
  - Re-verified all 9 pytest tests pass in `backend/tests` against live PostgreSQL in 4.17s.


