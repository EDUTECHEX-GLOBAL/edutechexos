@echo off
:: ============================================================
:: start-aw-sync.bat — EduTechExOS x ActivityWatch bridge
::
:: HOW TO USE:
::   1. Set your token in aw-sync.js (line 23) OR set the env var:
::      Right-click My PC → Properties → Advanced → Environment Variables
::      Add: EDUTECHEX_TOKEN = <your token from EduTechExOS>
::
::   2. Double-click this file to start syncing, OR
::      add it to Windows Startup so it runs automatically:
::      Press Win+R, type: shell:startup
::      Copy (or create a shortcut of) this .bat file there.
:: ============================================================

title EduTechExOS AW Sync

:: Check Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Download from https://nodejs.org and try again.
    pause
    exit /b 1
)

:: Move to the folder where this .bat lives (project root)
cd /d "%~dp0"

echo [aw-sync] Starting EduTechExOS ActivityWatch bridge...
echo [aw-sync] Minimise this window — it syncs every 5 minutes automatically.
echo.

node aw-sync.js

:: If node exits unexpectedly, pause so the user can read the error
echo.
echo [aw-sync] Process stopped. Press any key to close.
pause >nul
