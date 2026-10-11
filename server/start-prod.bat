@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0."

REM --- Port 3000 in-use check: skip if a backend is already running ---
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo [info] Port 3000 is already in use - a backend instance is running.
  echo Just open the browser, no need to start another one.
  pause
  exit /b 0
)

REM --- Locate Node.js ---
REM 1) node on PATH  2) scan the managed runtime (its version folder name changes over time)
set "NODE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE="
if not defined NODE for /d %%D in ("%USERPROFILE%\.workbuddy\binaries\node\versions\*") do if exist "%%~fD\node.exe" set "NODE=%%~fD\node.exe"
if not defined NODE (echo [error] Node.js not found. Install Node.js LTS from https://nodejs.org/ and run this file again. & pause & exit /b 1)
echo [info] Using Node: %NODE%

REM Production / server mode. Cookie security is controlled by .env COOKIE_SECURE
REM (1 = HTTPS only, 0 = plain HTTP), so this works with or without TLS in front.
set NODE_ENV=production

echo Syncing front-end files into server/public ...
"%NODE%" scripts/sync-public.js

echo Starting interactive-classroom backend (production / server mode)...
echo On first run it auto-creates the database and tables.
echo Press Ctrl+C or close this window to stop.
echo.

"%NODE%" src/index.js

echo.
echo Backend stopped.
pause
