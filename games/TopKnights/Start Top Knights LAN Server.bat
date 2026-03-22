@echo off
setlocal
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo This script requires administrator privileges to properly configure the firewall for LAN access.
  echo Please right-click the batch file and select "Run as administrator".
  echo.
  pause
  exit /b 1
)

title Top Knights LAN Server

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this machine.
  echo Install Node.js, then run this file again.
  echo Download: https://nodejs.org/
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

set "HOST=0.0.0.0"
set "PORT=4173"

echo ============================================
echo   Top Knights LAN Server
echo ============================================
echo.
echo Starting local server on port %PORT%...
echo.
echo IMPORTANT: Open the game in your browser by visiting:
echo   http://127.0.0.1:%PORT%
echo.
echo For LAN play:
echo 1. Keep this window open while hosting.
echo 2. If Windows Firewall asks, allow Private network access.
echo 3. Open the LOCAL or LAN URL printed by the server below.
echo 4. Other players on your network should open your LAN URL,
echo    not the GitHub Pages URL.
echo.
echo Press Ctrl+C in this window to stop the server.
echo.

node server.js

echo.
echo Server stopped.
pause
