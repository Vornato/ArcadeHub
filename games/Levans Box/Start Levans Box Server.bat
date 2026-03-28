@echo off
setlocal
cd /d "%~dp0"

title Levans Box Server

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this machine.
  echo Install Node.js, then run this file again.
  echo Download: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd was not found on this machine.
  echo Reinstall Node.js or repair your PATH, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "server.js" (
  echo server.js was not found in:
  echo %cd%
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\express\package.json" (
  echo ============================================
  echo   Levans Box Server
  echo ============================================
  echo.
  echo Dependencies were not found.
  echo Running npm install...
  echo.
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

set "HOST=0.0.0.0"
if not defined PORT set "PORT=3094"

echo ============================================
echo   Levans Box Server
echo ============================================
echo.
echo Starting server on port %PORT%...
echo.
echo Host screen:
echo   http://127.0.0.1:%PORT%/
echo.
echo Mobile join page:
echo   Open the LAN /play URL printed by the server below.
echo.
echo Notes:
echo 1. Keep this window open while hosting.
echo 2. If Windows Firewall asks, allow Private network access.
echo 3. Players on the same Wi-Fi should open your LAN URL.
echo.
echo Press Ctrl+C in this window to stop the server.
echo.

if /i "%LEVANS_BOX_DRY_RUN%"=="1" (
  echo Dry run complete. server.js was not started.
  exit /b 0
)

node server.js

echo.
echo Server stopped.
pause
