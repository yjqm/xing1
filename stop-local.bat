@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo Stopping Interactive Classroom local services ...

REM --- Node backend on port 3000 ---
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
  echo   killing backend pid %%P
  taskkill /PID %%P /F >nul 2>nul
)

REM --- MySQL on port 3306 (graceful shutdown so data files stay clean) ---
set "MYSQL_HOME=C:\Users\Lenovo\.workbuddy\binaries\mysql\mysql-8.4.9-winx64"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3306 " ^| findstr "LISTENING"') do (
  echo   shutting down MySQL pid %%P
  "%MYSQL_HOME%\bin\mysqladmin.exe" --protocol=tcp -h127.0.0.1 -P3306 -uroot -pic_local_2026 shutdown >nul 2>nul
  if errorlevel 1 taskkill /PID %%P /F >nul 2>nul
)

timeout /t 2 /nobreak >nul
echo Done.
endlocal
