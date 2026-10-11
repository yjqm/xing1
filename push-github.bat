@echo off
chcp 65001 >nul
cd /d "%~dp0"

set DEFAULT_REPO=agentic-ai-teaching-platform
set USER=yjqm

echo.
echo ============================================
echo   Push to GitHub (SSH)
echo ============================================
echo.
set /p REPO=Repository name [default: %DEFAULT_REPO%]:
if "%REPO%"=="" set REPO=%DEFAULT_REPO%

echo.
echo Target: git@github.com:%USER%/%REPO%.git
echo.

git remote remove origin >nul 2>&1
git remote add origin git@github.com:%USER%/%REPO%.git

echo Testing SSH connection to GitHub...
ssh -T -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=15 git@github.com 2>&1 | findstr /I "successfully authenticated" >nul
if errorlevel 1 (
    echo.
    echo [X] SSH key not authorized yet.
    echo     Add this public key to GitHub first:
    echo     https://github.com/settings/ssh/new
    echo.
    echo     Your public key:
    type "%USERPROFILE%\.ssh\id_ed25519.pub"
    echo.
    pause
    exit /b 1
)

echo [OK] SSH authenticated. Pushing...
git branch -M main
git push -u origin main

echo.
if errorlevel 1 (
    echo [X] Push failed. Check that the repo exists and is empty.
    echo     Create it at: https://github.com/new
) else (
    echo [OK] Done: https://github.com/%USER%/%REPO%
)
echo.
pause
