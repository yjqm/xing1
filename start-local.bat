@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   Agentic AI Interact Platform - Start
echo ============================================
echo.

REM ---------- 0. Locate Node.js ----------
set "NODE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE="
if not defined NODE for /d %%D in ("%USERPROFILE%\.workbuddy\binaries\node\versions\*") do if exist "%%~fD\node.exe" set "NODE=%%~fD\node.exe"
if not defined NODE if exist "C:\Program Files\nodejs\node.exe" set "NODE=C:\Program Files\nodejs\node.exe"
if not defined NODE (
  echo [error] Node.js not found. Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
echo [info] Node: %NODE%

REM ---------- 1. MySQL (portable, no install) ----------
set "MYSQL_HOME=C:\Users\Lenovo\.workbuddy\binaries\mysql\mysql-8.4.9-winx64"
set "MYSQL_INI=C:\Users\Lenovo\.workbuddy\binaries\mysql\my.ini"

netstat -ano | findstr ":3306 " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo [1/3] MySQL already running on 3306 - skipped.
) else (
  if not exist "%MYSQL_HOME%\bin\mysqld.exe" (
    echo [error] MySQL not found at %MYSQL_HOME%
    pause
    exit /b 1
  )
  echo [1/3] Starting MySQL on 3306 ...
  start "IC-MySQL" /min "%MYSQL_HOME%\bin\mysqld.exe" --defaults-file="%MYSQL_INI%" --console
  echo       Waiting for MySQL to accept connections ...
  for /l %%i in (1,1,30) do (
    timeout /t 1 /nobreak >nul
    "%MYSQL_HOME%\bin\mysqladmin.exe" --protocol=tcp -h127.0.0.1 -P3306 -uroot -pic_local_2026 ping >nul 2>nul
    if not errorlevel 1 goto mysql_ready
  )
  echo [warn] MySQL did not report ready in 30s. Check the IC-MySQL window.
)
:mysql_ready
echo [1/3] MySQL ready.

REM ---------- 2. Node backend (serves frontend too) ----------
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo [2/3] Backend already running on 3000 - skipped.
) else (
  echo [2/3] Starting backend on 3000 ...
  start "IC-Backend" /min cmd /c "cd /d %~dp0server && "%NODE%" src\index.js"
)

REM ---------- 3. Open browser ----------
echo [3/3] Opening browser ...
timeout /t 5 /nobreak >nul
start "" http://localhost:3000/

echo.
echo Done.
echo   Home    : http://localhost:3000/
echo   App     : http://localhost:3000/app.html
echo   Admin   : http://localhost:3000/admin.html
echo.
echo Run stop-local.bat to shut everything down.
echo.
endlocal
