# CivicFix Windows Repeatable Setup Script
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  CivicFix — Automated Windows Environment & Database Setup" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Continue = "Stop"
$civicFixRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Virtual Environment Setup
Write-Host "[1/4] Configuring Python Virtual Environment..." -ForegroundColor Yellow
if (-not (Test-Path "$civicFixRoot\.venv")) {
    python -m venv "$civicFixRoot\.venv"
    Write-Host "      Created virtual environment in .venv" -ForegroundColor Green
} else {
    Write-Host "      Existing virtual environment found in .venv" -ForegroundColor Green
}

$pyExe = "$civicFixRoot\.venv\Scripts\python.exe"
& $pyExe -m pip install --quiet --upgrade pip
& $pyExe -m pip install --quiet -r "$civicFixRoot\requirements.txt"
Write-Host "      Python dependencies verified and up to date." -ForegroundColor Green

# 2. Frontend Dependencies Setup
Write-Host "
[2/4] Verifying Frontend NPM packages..." -ForegroundColor Yellow
if (-not (Test-Path "$civicFixRoot\frontend\node_modules")) {
    Push-Location "$civicFixRoot\frontend"
    npm.cmd install --silent
    Pop-Location
    Write-Host "      NPM dependencies installed." -ForegroundColor Green
} else {
    Write-Host "      NPM dependencies already installed." -ForegroundColor Green
}

# 3. MySQL Connectivity & Diagnostics
Write-Host "
[3/4] Testing MySQL Connectivity..." -ForegroundColor Yellow
Push-Location "$civicFixRoot\backend"
& $pyExe -c "
from database import ping_database, settings
status = ping_database()
if status['status'] == 'connected':
    print(f'      [OK] Successfully connected to MySQL {status[\"version\"]} on {status[\"host\"]}:{status[\"port\"]} (Database: {status[\"database\"]}, latency: {status[\"latency_ms\"]}ms)')
    exit(0)
else:
    print(f'      [ERROR] Could not connect to MySQL at {status[\"host\"]}:{status[\"port\"]}')
    print(f'      Reason: {status.get(\"message\", \"Unknown error\")}')
    print('      Ensure the MySQL service is started (e.g. Start-Service MySQL97) and DB_PASSWORD in backend/.env is correct.')
    exit(1)
"
$dbConnected = ($LASTEXITCODE -eq 0)
Pop-Location

# 4. Database Schema Migration and Seeding
if ($dbConnected) {
    Write-Host "
[4/4] Applying SQL Schema and Seeding Baseline Data..." -ForegroundColor Yellow
    Push-Location "$civicFixRoot\backend"
    & $pyExe scripts\init_db.py
    & $pyExe scripts\seed_data.py
    Pop-Location
    Write-Host "      Database initialized and seeded successfully!" -ForegroundColor Green
    Write-Host "
======================================================================" -ForegroundColor Cyan
    Write-Host "  Setup Complete! You can now launch CivicFix with START_CIVICFIX.bat" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
} else {
    Write-Host "
======================================================================" -ForegroundColor Red
    Write-Host "  Database connection failed. Please check your credentials in backend/.env" -ForegroundColor Red
    Write-Host "======================================================================" -ForegroundColor Red
}
