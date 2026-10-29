@echo off
title CivicFix — Infrastructure Monitoring & Repair Intelligence
color 0A

cd /d "%~dp0"

echo ======================================================================
echo   Launching CivicFix (Frontend + Backend + MySQL Engine)...
echo ======================================================================
echo.

python run_civicfix.py

if %errorlevel% neq 0 (
    echo.
    echo ======================================================================
    echo [ERROR] The application stopped unexpectedly with code %errorlevel%.
    echo ======================================================================
    echo.
    pause
)
