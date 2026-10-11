@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ================================================
echo   Interactive Classroom - One-click Start
echo ================================================
echo.

REM ---------- 1/3 Backend on port 3000 ----------
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>nul
if errorlevel 1 (
  echo [1/3] Starting backend on port 3000...
  start "IC-Backend" cmd /k "call %~dp0server\start.bat"
) else (
  echo [1/3] Backend already running on port 3000 - skipped.
)

REM ---------- 2/3 Frontend on port 8765 ----------
set "PY=python"
where python >nul 2>nul
if errorlevel 1 set "PY=py"
netstat -ano | findstr ":8765 " | findstr "LISTENING" >nul 2>nul
if errorlevel 1 (
  echo [2/3] Starting frontend on port 8765...
  start "IC-Frontend" cmd /k "cd /d %~dp0 && %PY% -m http.server 8765"
) else (
  echo [2/3] Frontend already running on port 8765 - skipped.
)

REM ---------- 3/3 Open browser ----------
echo [3/3] Waiting for servers, then opening browser...
timeout /t 4 /nobreak >nul
start "" http://localhost:8765/app.html

echo.
echo Done. The IC-Backend and IC-Frontend windows will stay open.
echo Close those windows to stop the servers.
echo.
echo Press any key to close this window.
pause >nul
exit /b 0
