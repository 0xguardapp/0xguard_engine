#!/bin/bash

# setup.sh - Installation script for Judge Agent

set -e  # Exit on error

echo "🚀 Setting up Judge Agent..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi

# Check Python version (requires 3.11+)
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.11"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Error: Python 3.11 or higher is required. Found: $PYTHON_VERSION"
    exit 1
fi

echo "✓ Python version: $PYTHON_VERSION"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo "📥 Installing dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "❌ Error: requirements.txt not found in current directory"
    exit 1
fi

# Copy environment template if .env doesn't exist
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        echo "📋 Copying environment template..."
        cp env.example .env
        echo "✓ Created .env file from env.example"
    elif [ -f ".env.example" ]; then
        echo "📋 Copying environment template..."
        cp .env.example .env
        echo "✓ Created .env file from .env.example"
    else
        echo "⚠️  Warning: No .env.example or env.example file found"
    fi
else
    echo "✓ .env file already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env file with your credentials:"
echo "      nano .env"
echo "      # or"
echo "      vim .env"
echo ""
echo "   2. Activate the virtual environment:"
echo "      source venv/bin/activate"
echo ""
echo "   3. Run the Judge Agent:"
echo "      python judge_agent_main.py"
echo ""
echo "   Or run the example:"
echo "      python judge_agent_main_example.py"
echo ""

