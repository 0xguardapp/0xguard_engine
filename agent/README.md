# 0xGuard - Autonomous Security Intelligence System

[![Innovation Lab](https://img.shields.io/badge/Innovation_Lab-0xGuard-FF6B6B)](https://github.com/your-org/0xguard)
[![Category](https://img.shields.io/badge/category-Innovation_Lab-orange)]()
[![Status](https://img.shields.io/badge/status-active-success)]()
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![uAgents](https://img.shields.io/badge/uAgents-0.22.10+-green.svg)](https://github.com/fetchai/uagents)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()

> **Innovation Lab Project**: A decentralized security auditing system that uses AI agents to discover vulnerabilities, verify them with zero-knowledge proofs, and award bounties on-chain.

## 🤖 Agents

### Agent Names and Addresses

The 0xGuard system consists of three autonomous agents that work together to discover and verify security vulnerabilities:

#### 1. **Judge Agent** (`judge_agent`)
- **Name**: `judge_agent`
- **Default Port**: `8002`
- **Address**: Generated dynamically based on seed phrase (see [Getting Agent Addresses](#getting-agent-addresses))
- **Role**: Monitors Red Team and Target communications, verifies vulnerabilities, and awards bounty tokens
- **File**: [`judge.py`](./judge.py)

#### 2. **Target Agent** (`target_agent`)
- **Name**: `target_agent`
- **Default Port**: `8000`
- **Address**: Generated dynamically based on seed phrase (see [Getting Agent Addresses](#getting-agent-addresses))
- **Role**: Simulates a vulnerable system and responds to attack attempts
- **File**: [`target.py`](./target.py)

#### 3. **Red Team Agent** (`red_team_agent`)
- **Name**: `red_team_agent`
- **Default Port**: `8001`
- **Address**: Generated dynamically based on seed phrase (see [Getting Agent Addresses](#getting-agent-addresses))
- **Role**: Generates and executes attack vectors using AI, learns from failures
- **File**: [`red_team.py`](./red_team.py)

### Getting Agent Addresses

Agent addresses are deterministically generated from seed phrases. To get the addresses of your agents:

```python
from judge import create_judge_agent
from target import create_target_agent
from red_team import create_red_team_agent

# Create agents
judge = create_judge_agent(port=8002)
target = create_target_agent(port=8000, judge_address=judge.address)
red_team = create_red_team_agent(
    target_address=target.address,
    port=8001,
    judge_address=judge.address
)

# Print addresses
print(f"Judge: {judge.address}")
print(f"Target: {target.address}")
print(f"Red Team: {red_team.address}")
```

Or run the test suite to see addresses:
```bash
python3.11 test_full_integration.py
```

## 📋 Prerequisites

### Required Resources

- **Python 3.11+** - [Download Python](https://www.python.org/downloads/)
- **uAgents Framework** - [uAgents Documentation](https://docs.fetch.ai/uagents/)
- **Midnight Network** - [Midnight Documentation](https://docs.midnight.network/)
- **Unibase/Membase** - For decentralized storage (optional, file fallback available)

### External Services (Optional)

- **ASI.Cloud API** - For AI-powered attack generation
  - Get API key: [ASI.Cloud](https://asi.cloud/)
  - Set `ASI_API_KEY` environment variable
- **Agentverse** - For agent registration and discovery
  - Set `AGENTVERSE_KEY` environment variable
- **Membase** - For decentralized persistent memory storage
  - Install: `pip install git+https://github.com/unibaseio/membase.git`
  - Set `USE_MEMBASE=true` and configure `MEMBASE_ID`, `MEMBASE_ACCOUNT`, `MEMBASE_SECRET_KEY`
  - Falls back to file-based storage if not configured

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd agent
python3.11 -m pip install "uagents>=0.22.10" "httpx>=0.25.0"

# Optional: Install Membase for persistent memory storage
pip install git+https://github.com/unibaseio/membase.git
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp env.example .env
```

Edit `.env` with your configuration (see [Configuration](#configuration)).

### 3. Run All Agents

```bash
python3.11 run_all_agents.py
```

Or run individual agents:
```bash
# Terminal 1: Judge
python3.11 judge.py

# Terminal 2: Target
python3.11 target.py

# Terminal 3: Red Team
python3.11 red_team.py
```

### 4. Run Tests

```bash
# Full integration test
python3.11 test_full_integration.py

# Individual component tests
python3.11 test_asi.py
python3.11 test_midnight_integration.py
python3.11 test_unibase_integration.py
```

## ⚙️ Configuration

### Environment Variables

See [`env.example`](./env.example) for all configuration options:

```bash
# Judge Agent
JUDGE_IP=localhost
JUDGE_PORT=8002
JUDGE_SEED=judge_secret_seed_phrase

# Target Agent
TARGET_IP=localhost
TARGET_PORT=8000
TARGET_SEED=target_secret_seed_phrase

# Red Team Agent
RED_TEAM_IP=localhost
RED_TEAM_PORT=8001
RED_TEAM_SEED=red_team_secret_seed_phrase

# Common Settings
USE_MAILBOX=true
AGENT_IP=localhost

# Optional: AI Attack Generation
ASI_API_KEY=your_asi_api_key_here

# Optional: Agentverse Registration
AGENTVERSE_KEY=your_agentverse_key_here

# Optional: Membase Configuration (for persistent memory)
USE_MEMBASE=false
MEMBASE_ID=0xguard_agent
MEMBASE_ACCOUNT=default
MEMBASE_SECRET_KEY=your_membase_secret_key
```

## 📚 Documentation

- **[Integration Status](./IMPLEMENTATION_STATUS.md)** - Current implementation status
- **[Midnight Integration](./MIDNIGHT_INTEGRATION.md)** - ZK proof submission guide
- **[Unibase Integration](./UNIBASE_INTEGRATION.md)** - Decentralized storage setup
- **[Test Results](./TEST_RESULTS_FULL.md)** - Comprehensive test results
- **[Communication Tests](./COMMUNICATION_TEST_SUMMARY.md)** - Agent communication verification

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Red Team   │────────▶│   Target    │────────▶│    Judge    │
│   Agent     │ Attack  │   Agent     │Response│   Agent     │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                       │
       │                       │                       │
       ▼                       ▼                       ▼
   ASI.Cloud              Vulnerable            Midnight Network
   (AI Attacks)           System                (ZK Proofs)
                                                       │
                                                       ▼
                                                 Unibase/Membase
                                                 (Bounty Tokens)
```

## 🔗 Links & Resources

### Core Technologies
- **uAgents Framework**: [https://docs.fetch.ai/uagents/](https://docs.fetch.ai/uagents/)
- **Midnight Network**: [https://docs.midnight.network/](https://docs.midnight.network/)
- **Python 3.11+**: [https://www.python.org/downloads/](https://www.python.org/downloads/)

### External Services
- **ASI.Cloud API**: [https://asi.cloud/](https://asi.cloud/) - AI-powered attack generation
- **Agentverse**: [https://agentverse.ai/](https://agentverse.ai/) - Agent registration and discovery
- **Membase/Unibase**: [https://openos-labs.gitbook.io/unibase-docs/](https://openos-labs.gitbook.io/unibase-docs/) - Decentralized persistent memory storage

### Project Documentation
- **Main Repository**: [GitHub Repository URL]
- **Frontend**: [`../frontend/README.md`](../frontend/README.md)
- **Contracts**: [`../contracts/midnight/README.md`](../contracts/midnight/README.md)

## 🧪 Testing

Run the comprehensive test suite:

```bash
python3.11 test_full_integration.py
```

This tests:
- ✅ Logger functionality
- ✅ Unibase file operations
- ✅ Midnight client integration
- ✅ Attack generation
- ✅ Agent communication
- ✅ Message models
- ✅ File operations
- ✅ Full flow simulation

## 📝 License

[Add your license information here]

## 🤝 Contributing

[Add contribution guidelines here]

---

**Innovation Lab Project** - Building the future of decentralized security auditing.

