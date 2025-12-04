@echo off
REM setup.bat - Installation script for Judge Agent (Windows)

echo 🚀 Setting up Judge Agent...

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Python is not installed. Please install Python 3.11 or higher.
    exit /b 1
)

echo ✓ Python found

REM Get the directory where the script is located
cd /d "%~dp0"

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
) else (
    echo ✓ Virtual environment already exists
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️  Upgrading pip...
python -m pip install --upgrade pip --quiet

REM Install dependencies
echo 📥 Installing dependencies...
if exist "requirements.txt" (
    pip install -r requirements.txt
) else (
    echo ❌ Error: requirements.txt not found in current directory
    exit /b 1
)

REM Copy environment template if .env doesn't exist
if not exist ".env" (
    if exist "env.example" (
        echo 📋 Copying environment template...
        copy env.example .env >nul
        echo ✓ Created .env file from env.example
    ) else if exist ".env.example" (
        echo 📋 Copying environment template...
        copy .env.example .env >nul
        echo ✓ Created .env file from .env.example
    ) else (
        echo ⚠️  Warning: No .env.example or env.example file found
    )
) else (
    echo ✓ .env file already exists
)

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo    1. Edit .env file with your credentials
echo    2. Activate the virtual environment: venv\Scripts\activate
echo    3. Run the Judge Agent: python judge_agent_main.py
echo.

pause

