@echo off
REM Starts the mortgage portal for local development: the FastAPI backend on
REM port 8500 (in its own window) and the Angular dev server on port 4200
REM (in this window), both with hot reload.
REM
REM   scripts\dev.bat
REM
REM Prefers uv if it's installed, falls back to a plain venv otherwise, so
REM it runs on a machine that only has a plain Python + Node toolchain.

setlocal enabledelayedexpansion

set "HERE=%~dp0.."
set "BACKEND=%HERE%\backend"
set "FRONTEND=%HERE%\frontend"

echo == Mortgage Borrower Portal: local dev ==

where python >nul 2>nul
if errorlevel 1 (
    call :offer_runtime_install "Python" "Python.Python.3.12" "https://www.python.org/downloads/"
    if errorlevel 1 (
        pause
        exit /b 1
    )
    echo Python was installed ^(or the install was attempted^).
    echo Close this window and run dev.bat again so the PATH change takes effect.
    pause
    exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
    call :offer_runtime_install "Node.js" "OpenJS.NodeJS.LTS" "https://nodejs.org/"
    if errorlevel 1 (
        pause
        exit /b 1
    )
    echo Node.js was installed ^(or the install was attempted^).
    echo Close this window and run dev.bat again so the PATH change takes effect.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo npm not found even though Node.js is. Try reinstalling Node.js from https://nodejs.org/
    pause
    exit /b 1
)

set "ANSWER_ALL=0"

cd /d "%BACKEND%"

if not exist ".venv" (
    call :confirm_install "backend dependencies (creates .venv, installs requirements.txt)"
    if errorlevel 1 (
        echo Backend dependencies are required to run the app. Exiting.
        pause
        exit /b 1
    )
    echo -- creating backend virtual environment --
    where uv >nul 2>nul
    if errorlevel 1 (
        python -m venv .venv
    ) else (
        uv venv .venv
    )
    echo -- installing backend dependencies --
    where uv >nul 2>nul
    if errorlevel 1 (
        .venv\Scripts\pip install -r requirements.txt >nul
    ) else (
        uv pip install -r requirements.txt --python .venv >nul
    )
)

echo -- starting backend on http://localhost:8500 (separate window) --
start "Mortgage Portal - backend" cmd /k ".venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8500"

cd /d "%FRONTEND%"

if not exist "node_modules" (
    call :confirm_install "frontend dependencies (npm install)"
    if errorlevel 1 (
        echo Frontend dependencies are required to run the app. Exiting.
        pause
        exit /b 1
    )
    echo -- installing frontend dependencies --
    call npm install
)

echo -- starting frontend on http://localhost:4200 --
echo ^(close the backend window separately when you are done^)
call npm start

echo.
echo -- frontend server stopped --
pause

endlocal
goto :eof

REM Offers to auto-install a missing runtime via winget. Always asks first,
REM since this is a system-wide install that will prompt for admin
REM permission, not something scoped to this project. Sets errorlevel 0 if
REM an install was attempted, 1 if declined or winget itself is unavailable
REM (both cases already print where to install it manually).
:offer_runtime_install
where winget >nul 2>nul
if errorlevel 1 (
    echo %~1 not found, and winget is not available to install it automatically.
    echo Install it manually from %~3
    exit /b 1
)
set "RUNTIME_REPLY="
set /p RUNTIME_REPLY="%~1 not found. Install it automatically via winget? [Y/N]: "
if /i "%RUNTIME_REPLY:~0,1%"=="Y" (
    echo -- installing %~1 via winget, you may see an admin permission prompt --
    call winget install -e --id %~2 --accept-package-agreements --accept-source-agreements
    exit /b 0
)
echo Install it manually from %~3
exit /b 1

REM Prompts for All/Yes/No (or a/y/n, any case). Sets errorlevel 0 to proceed,
REM 1 to skip. "All" is remembered in ANSWER_ALL so later calls this run
REM proceed without asking again.
:confirm_install
if "%ANSWER_ALL%"=="1" exit /b 0
:confirm_install_ask
set "REPLY="
set /p REPLY="Install %~1? [A]ll / [Y]es / [N]o: "
if /i "%REPLY:~0,1%"=="A" (
    set "ANSWER_ALL=1"
    exit /b 0
)
if /i "%REPLY:~0,1%"=="Y" exit /b 0
if /i "%REPLY:~0,1%"=="N" exit /b 1
echo Please answer A, Y, or N.
goto confirm_install_ask
