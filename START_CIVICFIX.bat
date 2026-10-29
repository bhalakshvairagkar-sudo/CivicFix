@echo off
title CivicFix — Infrastructure Monitoring & Repair Intelligence
color 0A

cd /d "%~dp0"

echo ======================================================================
echo   Launching CivicFix (Frontend + Backend)...
echo ======================================================================
echo.

if exist .venv\Scripts\python.exe (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

%PYTHON_EXE% run_civicfix.py

if %errorlevel% neq 0 (
    echo.
    echo ======================================================================
    echo [ERROR] The application stopped unexpectedly with code %errorlevel%.
    echo ======================================================================
    echo.
    pause
)
