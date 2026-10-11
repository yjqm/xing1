@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
set PY=C:\Users\Lenovo\.workbuddy\binaries\python\envs\default\Scripts\python.exe
if not exist "%PY%" set PY=python
"%PY%" "%~dp0phone-url.py"
echo.
pause
