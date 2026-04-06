@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo [SYSTEM] Starting full GitHub/Git logout procedure...
echo ======================================================
echo.

:: 1. Remove GH CLI credentials if installed
where gh >nul 2>&1
if !errorlevel! equ 0 (
    echo [CLI] GitHub CLI detected. Attempting to logout...
    gh auth logout -h github.com >nul 2>&1
    if !errorlevel! equ 0 (
        echo [SUCCESS] Disconnected from GitHub CLI.
    ) else (
        echo [INFO] GitHub CLI was already logged out or not configured.
    )
)

:: 2. Remove Windows Credential Manager entries
echo [CREDENTIALS] Searching for GitHub entries in Windows...

set "targets=git:https://github.com LegacyGeneric:target=git:https://github.com gh:github.com GitHub - https://api.github.com"

for %%T in (%targets%) do (
    cmdkey /list | findstr /C:"%%T" > nul
    if !errorlevel! equ 0 (
        echo [FOUND] Removing: %%T
        cmdkey /delete:%%T > nul
    )
)

:: 3. Clear Git Credential Manager cache
where git >nul 2>&1
if !errorlevel! equ 0 (
    echo [GIT] Clearing local Git Credential Manager store...
    echo url=https://github.com | git credential-manager erase >nul 2>&1
    git config --global --unset-all credential.helper >nul 2>&1
)

echo.
echo ======================================================
echo [DONE] Logout process complete.
echo [TIP] Next time you pull/push, you will be asked for credentials.
echo ======================================================
echo.
pause