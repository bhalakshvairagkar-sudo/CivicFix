@echo off
title CivicFix ? Database & Environment Setup
color 0B
cd /d "%~dp0"

echo ======================================================================
echo   Running CivicFix Windows Automated Setup...
echo ======================================================================
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0setup_windows.ps1"

echo.
pause
