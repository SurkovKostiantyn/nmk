@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo [SYSTEM] Starting GitHub/Git login procedure...
echo ======================================================
echo.

:: 1. Set global git config
echo [GIT] Setting global user configuration...
git config --global user.email "kskrua@gmail.com"
git config --global user.name "SurkovKostiantyn"

if %errorlevel% equ 0 (
    echo [SUCCESS] Git global config updated:
    echo           Email: kskrua@gmail.com
    echo           Name:  SurkovKostiantyn
) else (
    echo [ERROR] Failed to set Git global config.
)

echo.

:: 2. Check for GitHub CLI
where gh >nul 2>&1
if !errorlevel! equ 0 (
    echo [CLI] GitHub CLI detected. 
    echo [TIP] To log in via CLI, run: gh auth login
)

echo.
echo ======================================================
echo [DONE] Login configuration complete.
echo [TIP] Your identity is set. Git will ask for credentials on next push/pull.
echo ======================================================
echo.
pause