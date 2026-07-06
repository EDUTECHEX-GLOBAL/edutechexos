@echo off
:: ============================================================
:: start-aw-sync.bat — EduTechExOS x ActivityWatch bridge
::
:: HOW TO USE:
::   This launches scripts/aw-sync.js, which pairs with the EduTechExOS web app.
::   There is NO token to paste — the running web app sends it to the agent
::   automatically when you log in, and syncing stops when you log out.
::
::   1. Install ActivityWatch (https://activitywatch.net) and make sure it's running.
::   2. Double-click this file to start the agent (leave the window minimised), OR
::      add it to Windows Startup so it runs automatically:
::      Press Win+R, type: shell:startup
::      Copy (or create a shortcut of) this .bat file there.
::   3. Log into EduTechExOS in your browser — syncing begins on its own.
::
::   (For a self-contained agent that logs in with your own email/password
::    instead of the web app, use packages/frontend/public/aw-sync.js.)
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

node scripts/aw-sync.js

:: If node exits unexpectedly, pause so the user can read the error
echo.
echo [aw-sync] Process stopped. Press any key to close.
pause >nul
