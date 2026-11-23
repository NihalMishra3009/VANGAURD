# VOXGUARD — Testing and Verification Guide

## Test Suite Overview

- Framework: `pytest` with `pytest-asyncio` (Mode AUTO, function scope)
- Database: Local PostgreSQL 17 test connection (`NullPool` to guarantee isolated connection per async loop)
- Frontend: Vite TypeScript Compiler (`tsc -b`) & Rollup bundle analysis

## Execution Commands

### 1. Backend Automated Tests
```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -v
```

### 2. Frontend Production Compilation
```powershell
Set-Location frontend
npm run build
```

### 3. Database Connectivity & Table Check
```powershell
$env:PGPASSWORD='postgres'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -d voxguard -c "\dt"
```

## Current Test Results

### Phase 2 Verification (2026-11-24)
- `backend/tests/test_auth.py::test_login_success`: PASSED
- `backend/tests/test_auth.py::test_login_invalid_password`: PASSED
- `backend/tests/test_auth.py::test_get_current_user_me`: PASSED
- `backend/tests/test_auth.py::test_rbac_access_control`: PASSED
- `backend/tests/test_borrowers.py::test_borrower_template_download`: PASSED
- `backend/tests/test_borrowers.py::test_upload_preview_and_commit`: PASSED
- `backend/tests/test_campaigns.py::test_campaign_lifecycle_and_assignment`: PASSED
- `backend/tests/test_health.py::test_health_check`: PASSED
- `backend/tests/test_health.py::test_readiness_check`: PASSED
- **Total Backend Tests: 9 Passed, 0 Failed, Duration: 4.42s**
- **Frontend Build**: 0 errors, 2206 modules transformed, `index.html`, CSS, and JS bundles built in 644ms.
- **Sample File Testing**: Verified `data/sample/borrowers_sample_compliant.csv` and `data/sample/borrowers_sample_with_validation_scenarios.xlsx` against `BorrowerImportService` directly.
