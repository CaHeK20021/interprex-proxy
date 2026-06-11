@echo off
cd /d "%~dp0"

echo === Interprex Proxy - Push to GitHub ===
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git not found. Download from https://git-scm.com
    pause
    exit /b 1
)

if not exist ".git" (
    echo [1/5] git init...
    git init
    if errorlevel 1 goto :error
) else (
    echo [1/5] Git already initialized, skipping.
)

echo [2/5] git add .
git add .
if errorlevel 1 goto :error

echo [3/5] git commit...
git commit -m "Initial commit: Interprex proxy for Gemini API"
if errorlevel 1 echo Commit skipped (may already exist)

echo [4/5] git branch -M main
git branch -M main

echo [5/5] git push...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/CaHeK20021/interprex-proxy.git
git push -u origin main
if errorlevel 1 goto :error

echo.
echo === DONE! ===
echo Check: https://github.com/CaHeK20021/interprex-proxy
echo.
pause
exit /b 0

:error
echo.
echo === ERROR ===
echo Check:
echo  1. Repo exists at https://github.com/CaHeK20021/interprex-proxy
echo  2. You are logged in to git
echo  3. Internet connection is working
echo.
pause
exit /b 1
