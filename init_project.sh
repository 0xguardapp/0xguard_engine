#!/bin/bash

# init_project.sh - Initialize and test all project components

set -e  # Exit on error (but we'll catch errors and continue)

echo "🚀 Initializing 0xGuard Project..."
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track what works and what doesn't
WORKING=()
NOT_WORKING=()
WARNINGS=()

# Function to check command
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is NOT installed"
        return 1
    fi
}

# Function to test component
test_component() {
    local name=$1
    local command=$2
    echo ""
    echo "Testing: $name"
    echo "----------------------------------------"
    if eval "$command" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $name: WORKING"
        WORKING+=("$name")
        return 0
    else
        echo -e "${RED}✗${NC} $name: NOT WORKING"
        NOT_WORKING+=("$name")
        return 1
    fi
}

# ============================================================================
# 1. Check Prerequisites
# ============================================================================
echo "📋 Checking Prerequisites..."
echo "----------------------------------------"

# Check Python
if check_command python3; then
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    echo "   Python version: $PYTHON_VERSION"
    if [ "$(printf '%s\n' "3.11" "$PYTHON_VERSION" | sort -V | head -n1)" != "3.11" ]; then
        echo -e "${YELLOW}⚠${NC}  Warning: Python 3.11+ recommended"
        WARNINGS+=("Python version $PYTHON_VERSION (3.11+ recommended)")
    fi
else
    NOT_WORKING+=("Python 3")
fi

# Check Node.js
if check_command node; then
    NODE_VERSION=$(node --version)
    echo "   Node.js version: $NODE_VERSION"
else
    NOT_WORKING+=("Node.js")
fi

# Check npm
if check_command npm; then
    NPM_VERSION=$(npm --version)
    echo "   npm version: $NPM_VERSION"
else
    NOT_WORKING+=("npm")
fi

# Check Docker (optional, for Midnight devnet)
if check_command docker; then
    echo "   Docker: Available (for Midnight devnet)"
else
    WARNINGS+=("Docker not found (needed for Midnight devnet)")
fi

# ============================================================================
# 2. Setup Agent (Python)
# ============================================================================
echo ""
echo "🐍 Setting up Agent (Python)..."
echo "----------------------------------------"

cd agent

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv || {
        echo -e "${RED}✗${NC} Failed to create virtual environment"
        NOT_WORKING+=("Agent venv creation")
        cd ..
        continue
    }
fi

# Activate venv
source venv/bin/activate

# Install dependencies
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install --upgrade pip --quiet
    pip install -r requirements.txt || {
        echo -e "${YELLOW}⚠${NC}  Some dependencies may have failed to install"
        WARNINGS+=("Agent dependencies installation")
    }
else
    echo -e "${RED}✗${NC} requirements.txt not found"
    NOT_WORKING+=("Agent requirements.txt")
fi

# Copy .env if needed
if [ ! -f ".env" ] && [ -f "env.example" ]; then
    cp env.example .env
    echo "Created .env file from env.example"
    WARNINGS+=("Please configure agent/.env file")
fi

# Test Python imports
echo "Testing Python imports..."
python3 -c "
import sys
errors = []
try:
    from judge_agent import JudgeAgent
    print('  ✓ judge_agent import: OK')
except Exception as e:
    print(f'  ✗ judge_agent import: {e}')
    errors.append('judge_agent import')

try:
    from config import Config
    print('  ✓ config import: OK')
except Exception as e:
    print(f'  ✗ config import: {e}')
    errors.append('config import')

try:
    from unibase import save_bounty_token
    print('  ✓ unibase import: OK')
except Exception as e:
    print(f'  ✗ unibase import: {e}')
    errors.append('unibase import')

sys.exit(0 if len(errors) == 0 else 1)
" && WORKING+=("Agent Python imports") || NOT_WORKING+=("Agent Python imports")

deactivate
cd ..

# ============================================================================
# 3. Setup Frontend (Node.js)
# ============================================================================
echo ""
echo "⚛️  Setting up Frontend (Next.js)..."
echo "----------------------------------------"

cd frontend

if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install || {
            echo -e "${YELLOW}⚠${NC}  Frontend dependencies installation had issues"
            WARNINGS+=("Frontend npm install")
        }
    else
        echo "Frontend dependencies already installed"
    fi
    
    # Test if Next.js works
    if [ -f "next.config.ts" ] || [ -f "next.config.js" ]; then
        WORKING+=("Frontend setup")
    else
        NOT_WORKING+=("Frontend Next.js config")
    fi
else
    echo -e "${RED}✗${NC} package.json not found"
    NOT_WORKING+=("Frontend package.json")
fi

cd ..

# ============================================================================
# 4. Setup Midnight Contracts
# ============================================================================
echo ""
echo "🌙 Setting up Midnight Contracts..."
echo "----------------------------------------"

cd contracts/midnight

if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        echo "Installing Midnight contract dependencies..."
        npm install || {
            echo -e "${YELLOW}⚠${NC}  Midnight dependencies installation had issues"
            WARNINGS+=("Midnight contracts npm install")
        }
    else
        echo "Midnight dependencies already installed"
    fi
    
    # Check if contract files exist
    if [ -f "src/AuditVerifier.compact" ] || [ -d "src" ]; then
        WORKING+=("Midnight contracts setup")
    else
        NOT_WORKING+=("Midnight contract source files")
    fi
else
    echo -e "${RED}✗${NC} package.json not found"
    NOT_WORKING+=("Midnight contracts package.json")
fi

cd ../..

# ============================================================================
# 5. Setup Midnight Dev Environment
# ============================================================================
echo ""
echo "🔧 Setting up Midnight Dev Environment..."
echo "----------------------------------------"

cd midnight-dev

if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        echo "Installing Midnight dev dependencies..."
        npm install || {
            echo -e "${YELLOW}⚠${NC}  Midnight dev dependencies installation had issues"
            WARNINGS+=("Midnight dev npm install")
        }
    else
        echo "Midnight dev dependencies already installed"
    fi
    
    # Check for contract files
    if [ -f "contracts/AuditVerifier.compact" ]; then
        WORKING+=("Midnight dev setup")
    else
        WARNINGS+=("Midnight dev contract files")
    fi
else
    echo -e "${RED}✗${NC} package.json not found"
    NOT_WORKING+=("Midnight dev package.json")
fi

cd ..

# ============================================================================
# 6. Setup Membase
# ============================================================================
echo ""
echo "💾 Checking Membase..."
echo "----------------------------------------"

if [ -d "membase" ]; then
    if [ -f "membase/pyproject.toml" ] || [ -f "membase/setup.py" ]; then
        echo "Membase directory found"
        WORKING+=("Membase directory")
    else
        WARNINGS+=("Membase setup files")
    fi
else
    WARNINGS+=("Membase directory not found")
fi

# ============================================================================
# 7. Run Basic Tests
# ============================================================================
echo ""
echo "🧪 Running Basic Tests..."
echo "----------------------------------------"

# Test Agent config
cd agent
source venv/bin/activate
if python3 -c "from config import Config; c = Config(); print('Config OK')" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Agent config: OK"
    WORKING+=("Agent config test")
else
    echo -e "${RED}✗${NC} Agent config: FAILED"
    NOT_WORKING+=("Agent config test")
fi
deactivate
cd ..

# ============================================================================
# 8. Summary Report
# ============================================================================
echo ""
echo "=================================="
echo "📊 INITIALIZATION SUMMARY"
echo "=================================="
echo ""

if [ ${#WORKING[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ WORKING COMPONENTS:${NC}"
    for item in "${WORKING[@]}"; do
        echo "   ✓ $item"
    done
    echo ""
fi

if [ ${#NOT_WORKING[@]} -gt 0 ]; then
    echo -e "${RED}❌ NOT WORKING:${NC}"
    for item in "${NOT_WORKING[@]}"; do
        echo "   ✗ $item"
    done
    echo ""
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNINGS:${NC}"
    for item in "${WARNINGS[@]}"; do
        echo "   ⚠ $item"
    done
    echo ""
fi

echo "=================================="
echo ""
echo "📝 Next Steps:"
echo "   1. Configure agent/.env with your credentials"
echo "   2. Test agent: cd agent && source venv/bin/activate && python judge_agent_main_example.py"
echo "   3. Test frontend: cd frontend && npm run dev"
echo "   4. Test Midnight: cd midnight-dev && npm test"
echo ""

