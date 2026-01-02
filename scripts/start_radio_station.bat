@echo off
REM PYrte Radio Shack - Full Stack Startup Script
REM Starts backend API and Cloudflare tunnel together

echo ============================================================
echo PYrte Radio Shack - Full Stack Startup
echo ============================================================
echo.

cd /d "%~dp0\.."

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found in PATH
    pause
    exit /b 1
)

REM Check cloudflared
cloudflared --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: cloudflared not installed
    echo Install with: winget install Cloudflare.cloudflared
    pause
    exit /b 1
)

echo Starting Backend API...
start "PYrte Backend" cmd /k "cd /d %~dp0\.. && python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Tunnel Manager...
start "PYrte Tunnel" cmd /k "cd /d %~dp0\.. && python scripts/tunnel_manager.py"

echo.
echo ============================================================
echo Radio Station Started!
echo.
echo - Backend API: http://localhost:8000
echo - API Docs: http://localhost:8000/api/docs
echo - Tunnel URL: Check the Tunnel window
echo.
echo Close this window to keep services running.
echo Close the Backend/Tunnel windows to stop services.
echo ============================================================
pause
