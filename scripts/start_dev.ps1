# VOXGUARD Development Startup Script for Windows PowerShell
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  VOXGUARD — AI-Powered Voice Intelligence Platform       " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Activate Virtual Environment
if (Test-Path ".\.venv\Scripts\Activate.ps1") {
    Write-Host "[1/3] Activating Python virtual environment..." -ForegroundColor Green
    & ".\.venv\Scripts\Activate.ps1"
} else {
    Write-Host "[!] Virtual environment not found in .venv" -ForegroundColor Red
    exit 1
}

# 2. Check Database Tables and Seed Users
Write-Host "[2/3] Checking PostgreSQL database and default seed accounts..." -ForegroundColor Green
& ".\.venv\Scripts\python.exe" -m backend.app.database.init_db

# 3. Instruction to start servers
Write-Host "`n[3/3] System ready! Start the servers with:" -ForegroundColor Cyan
Write-Host "  Terminal 1 (Backend):" -ForegroundColor White
Write-Host "    .\.venv\Scripts\uvicorn.exe backend.app.main:app --host 127.0.0.1 --port 8000 --reload" -ForegroundColor Yellow
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor White
Write-Host "    cd frontend; npm run dev" -ForegroundColor Yellow
Write-Host "`nAccess application at: http://localhost:5173" -ForegroundColor Green
Write-Host "Default Login Accounts (Password for all: VoxGuard@2026):" -ForegroundColor Gray
Write-Host "  - Admin:             admin@voxguard.bank" -ForegroundColor Gray
Write-Host "  - Campaign Manager:  campaign@voxguard.bank" -ForegroundColor Gray
Write-Host "  - Human Collector:   collector@voxguard.bank" -ForegroundColor Gray
Write-Host "  - Supervisor:        supervisor@voxguard.bank" -ForegroundColor Gray
