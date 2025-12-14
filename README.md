# 0xGuard - Autonomous Security Intelligence Platform

[https://0xguard.app]
[https://x.com/0xguarddotapp]
Contract : 

<div align="center">

![0xGuard](https://img.shields.io/badge/0xGuard-AI%20Security%20Audit-FF6B6B?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11+-blue?style=for-the-badge&logo=python)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)

**A decentralized security auditing system that uses AI agents to discover vulnerabilities, verify them with zero-knowledge proofs, and award bounties on-chain.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Components](#-components)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

0xGuard is an autonomous security intelligence platform that combines AI agents, zero-knowledge proofs, and blockchain technology to create a decentralized security auditing ecosystem. The system uses three autonomous agents working together:

- **Red Team Agent**: Generates and executes attack vectors using AI
- **Target Agent**: Simulates vulnerable systems and responds to attacks
- **Judge Agent**: Monitors communications, verifies vulnerabilities with ZK proofs, and awards bounty tokens

### Key Innovations

- 🤖 **AI-Powered Vulnerability Discovery**: Uses advanced AI (ASI.Cloud, Gemini) to generate and test attack vectors
- 🔐 **Zero-Knowledge Proof Verification**: Verifies vulnerabilities on Midnight Network with ZK proofs
- 💰 **On-Chain Bounty System**: Awards tokens automatically when vulnerabilities are verified
- 🌐 **Decentralized Storage**: Uses Unibase/Membase for persistent agent memory and knowledge sharing
- 📊 **Real-Time Dashboard**: Next.js frontend for monitoring audits and agent status
- 🔗 **ERC-8004 Compliance**: On-chain agent identity, reputation, and validation registries

---

## ✨ Features

### Core Capabilities

- **Autonomous Security Auditing**: AI agents automatically discover and verify security vulnerabilities
- **Zero-Knowledge Proof Integration**: Privacy-preserving vulnerability verification on Midnight Network
- **Multi-Agent Coordination**: Judge, Target, and Red Team agents communicate via uAgents protocol
- **On-Chain Bounties**: Automated token rewards for verified vulnerabilities
- **Decentralized Memory**: Persistent agent knowledge using Membase/Unibase
- **Real-Time Monitoring**: Live dashboard showing agent status, logs, and audit progress
- **Smart Contract Integration**: ERC-8004 compliant agent registries and ERC-3009 gasless token transfers

### Agent Features

- **Judge Agent**: Monitors attacks, verifies proofs, awards bounties
- **Target Agent**: Simulates vulnerable systems, responds to attacks
- **Red Team Agent**: Generates AI-powered attacks, learns from failures
- **Agent Registry**: On-chain identity and reputation tracking
- **Knowledge Sharing**: Agents share learned exploits via Unibase

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Dashboard  │  │  Agent View │  │ Audit Logs  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Agent API Server (FastAPI)                     │
│         Agent Lifecycle Management & REST API               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Red Team    │ │  Target     │ │   Judge     │
│   Agent     │ │   Agent     │ │   Agent     │
│  (Port 8001)│ │ (Port 8000) │ │ (Port 8002) │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │                │
       └───────────────┼────────────────┘
                       │
           ┌───────────┼───────────┐
           │           │           │
           ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Midnight │ │ Unibase  │ │  Redis   │
    │  Network │ │ Membase  │ │  Logs    │
    │ (ZK Proof)│ │ (Memory) │ │ (Cache)  │
    └──────────┘ └──────────┘ └──────────┘
           │           │           │
           └───────────┼───────────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │Optimism  │ │ Smart    │ │  Agent   │
    │ Sepolia  │ │Contracts │ │Registry  │
    │ Blockchain│ │(ERC-8004)│ │          │
    └──────────┘ └──────────┘ └──────────┘
```

### Component Communication Flow

1. **Attack Generation**: Red Team Agent uses AI to generate attack vectors
2. **Attack Execution**: Red Team sends attacks to Target Agent
3. **Response Monitoring**: Judge Agent monitors all communications
4. **Proof Verification**: Judge verifies vulnerabilities with ZK proofs on Midnight
5. **Bounty Award**: Judge awards tokens via smart contracts
6. **Knowledge Sharing**: Successful exploits stored in Unibase for future reference

---

## 📦 Components

### Backend (`/agent`)

Python-based agent system using the uAgents framework:

- **Agent System**: Three autonomous agents (Judge, Target, Red Team)
- **API Server**: FastAPI server for agent lifecycle management
- **Midnight Client**: Zero-knowledge proof submission and verification
- **Unibase Integration**: Decentralized storage for agent memory
- **Redis Client**: Logging and caching
- **Agent Registry**: On-chain agent registration (ERC-8004)

**Key Files:**
- `judge_agent.py` - Judge agent implementation
- `target.py` - Target agent implementation
- `red_team.py` - Red team agent implementation
- `api_server.py` - FastAPI server
- `midnight_client.py` - Midnight Network integration
- `agent_registry_adapter.py` - On-chain registration

### Frontend (`/frontend`)

Next.js 16 + TypeScript dashboard:

- **Real-Time Monitoring**: Live agent status and logs
- **Audit Dashboard**: View and manage security audits
- **Wallet Integration**: Connect wallet, register agents, start audits
- **ZK Proof Viewer**: Display Midnight proof verification status
- **Agent Cards**: Visual status indicators for each agent

**Key Features:**
- Next.js App Router
- Tailwind CSS styling
- WalletConnect/RainbowKit integration
- Real-time log polling
- TypeScript type safety

### Smart Contracts (`/contracts`)

Solidity smart contracts for agent management:

- **AgentIdentityRegistry** (ERC-8004): On-chain agent identity management
- **AgentReputationRegistry** (ERC-8004): Reputation scoring system
- **AgentValidationRegistry** (ERC-8004): Agent validation status
- **AgentToken** (ERC-20 + ERC-3009): Gasless token transfers for bounties

**Networks:**
- Optimism Sepolia (Chain ID: 11155420)
- Midnight Network (for ZK proofs)

### Midnight Integration (`/midnight-dev`)

Zero-knowledge proof verification system:

- **Devnet**: Local Midnight development network
- **API Server**: FastAPI bridge for ZK proof submission
- **Contract Integration**: Verifiable audit proofs on-chain

### Membase (`/membase`)

Decentralized memory layer for AI agents:

- **Persistent Memory**: Long-term conversation storage
- **Knowledge Base**: Vector storage for learned exploits
- **On-Chain Identity**: Agent registration and permissions

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Docker & Docker Compose** (optional, for containerized deployment)
- **Redis** (optional, for logging)

### Quick Start with Docker

The fastest way to get started:

```bash
# Clone the repository
git clone https://github.com/your-org/0xguard.git
cd 0xguard

# Copy environment files
cp agent/env.example agent/.env
cp frontend/.env.example frontend/.env.local

# Edit configuration files with your API keys and credentials
# See Configuration section below

# Start all services with Docker Compose
docker-compose up -d

# Access the frontend at http://localhost:3000
# Agent API at http://localhost:8003
```

### Manual Installation

See [Installation](#-installation) section for step-by-step setup.

---

## 📥 Installation

### 1. Backend Setup

```bash
cd agent

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
nano .env.local
```

### 3. Smart Contracts Setup

```bash
cd contracts

# Install dependencies
npm install

# Configure Hardhat (edit hardhat.config.js)
# Set your private key and RPC URLs
```

### 4. Midnight Devnet (Optional)

```bash
cd midnight-dev

# Install dependencies
npm install

# Start devnet (requires Docker)
npm run devnet:start
```

---

## ⚙️ Configuration

### Backend Configuration (`agent/.env`)

Required variables:

```bash
# Agent Ports
TARGET_PORT=8000
JUDGE_PORT=8002
RED_TEAM_PORT=8001
AGENT_API_PORT=8003

# Agent Seeds (for deterministic address generation)
TARGET_SECRET_KEY=fetch_ai_agent_seed_or_random_hex
JUDGE_SEED=judge_secret_seed_phrase
RED_TEAM_SEED=red_team_secret_seed_phrase

# Unibase/Membase
UNIBASE_ACCOUNT=0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B
UNIBASE_RPC_URL=https://testnet.unibase.io
MEMBASE_ACCOUNT=default
MEMBASE_ID=judge-agent

# AI Services
ASI_API_KEY=your_asi_api_key_here  # For attack generation
GEMINI_API_KEY=your_gemini_api_key_here  # Optional fallback

# Agent Communication
AGENTVERSE_KEY=your_agentverse_key_here
MAILBOX_KEY=your_mailbox_key_here

# Midnight Integration (Optional)
MIDNIGHT_API_URL=http://localhost:8100
MIDNIGHT_DEVNET_URL=http://localhost:6300

# Redis (Optional, for logging)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Blockchain (Optional, for on-chain registration)
OPTIMISM_SEPOLIA_RPC_URL=https://sepolia.optimism.io
PRIVATE_KEY=your_private_key_here
IDENTITY_REGISTRY_ADDRESS=0x...
REPUTATION_REGISTRY_ADDRESS=0x...
VALIDATION_REGISTRY_ADDRESS=0x...
```

### Frontend Configuration (`frontend/.env.local`)

Required variables:

```bash
# Backend API
AGENT_API_URL=http://localhost:8003
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8003

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Blockchain (Optional)
NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL=https://sepolia.optimism.io
NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS=0x...
```

### Getting API Keys

- **ASI.Cloud**: [Get API Key](https://asi.cloud/)
- **AgentVerse**: [Get JWT Token](https://agentverse.ai/)
- **Mailbox**: [Get JWT Token](https://agentverse.ai/)
- **WalletConnect**: [Get Project ID](https://cloud.walletconnect.com/)

See `agent/env.example` and `frontend/.env.example` for all configuration options.

---

## 💻 Usage

### Starting the System

#### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

#### Option 2: Manual Start

**Terminal 1 - Agent API Server:**
```bash
cd agent
source venv/bin/activate
python api_server.py
```

**Terminal 2 - Judge Agent:**
```bash
cd agent
source venv/bin/activate
python run_judge.py
```

**Terminal 3 - Target Agent:**
```bash
cd agent
source venv/bin/activate
python run_target.py
```

**Terminal 4 - Red Team Agent:**
```bash
cd agent
source venv/bin/activate
python run_red_team.py
```

**Terminal 5 - Frontend:**
```bash
cd frontend
npm run dev
```

### Starting an Audit

#### Via Frontend

1. Open http://localhost:3000
2. Connect your wallet (MetaMask, Coinbase, etc.)
3. Agent auto-registers on wallet connection
4. Click "Start Audit"
5. Enter target address and intensity
6. Monitor real-time logs and agent status

#### Via API

```bash
# Start audit
curl -X POST http://localhost:8003/api/agents/start \
  -H "Content-Type: application/json" \
  -d '{
    "target_address": "0x...",
    "intensity": "medium"
  }'

# Check agent status
curl http://localhost:8003/api/agents/status

# Get audit logs
curl http://localhost:8003/audit/{audit_id}/logs
```

### Python API

```python
from judge_agent_main import IntegratedJudgeAgent
from config import get_config

# Load configuration
config = get_config()

# Initialize agent
judge = IntegratedJudgeAgent(config)

# Monitor an attack
event_id = await judge.monitor_attack(
    red_team_id="red_team_alpha",
    target_id="target_app",
    attack_data={
        "exploit_type": "sql_injection",
        "payload": "' OR '1'='1"
    }
)

# Process attack result
result = await judge.process_attack_result(
    event_id["event_id"],
    {
        "success": True,
        "secret_key": "fetch_ai_2024"
    }
)
```

---

## 🛠️ Development

### Project Structure

```
0xguard/
├── agent/                    # Backend agent system
│   ├── api_server.py        # FastAPI server
│   ├── judge_agent.py       # Judge agent
│   ├── target.py            # Target agent
│   ├── red_team.py          # Red team agent
│   ├── midnight_client.py   # Midnight integration
│   ├── agent_registry_adapter.py  # On-chain registration
│   ├── requirements.txt     # Python dependencies
│   └── tests/              # Test suite
│
├── frontend/                # Next.js frontend
│   ├── app/                # App Router pages
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript types
│   └── package.json        # Node dependencies
│
├── contracts/              # Smart contracts
│   ├── AgentIdentityRegistry.sol
│   ├── AgentReputationRegistry.sol
│   ├── AgentValidationRegistry.sol
│   ├── AgentToken.sol
│   └── scripts/           # Deployment scripts
│
├── midnight-dev/           # Midnight integration
│   ├── contracts/         # Midnight contracts
│   ├── integration/       # Integration code
│   └── scripts/          # Deployment scripts
│
├── membase/                # Membase integration
│   └── src/               # Membase source code
│
├── docker-compose.yml      # Docker orchestration
└── README.md              # This file
```

### Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Target Agent | 8000 | Target agent endpoint |
| Red Team Agent | 8001 | Red team agent endpoint |
| Judge Agent | 8002 | Judge agent endpoint |
| Agent API Server | 8003 | FastAPI REST API |
| Midnight API | 8100 | Midnight bridge server |
| Midnight Devnet | 6300 | Midnight proof server |
| Frontend | 3000 | Next.js web app |

See [PORT_CONFIGURATION.md](./PORT_CONFIGURATION.md) for details.

### Code Style

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Strict mode enabled, ESLint configured
- **Solidity**: Solidity 0.8.20+, OpenZeppelin standards

---

## 🧪 Testing

### Backend Tests

```bash
cd agent
source venv/bin/activate

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_judge_agent.py -v

# Run with coverage
pytest tests/ --cov=. --cov-report=html
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Integration Tests

```bash
cd agent
source venv/bin/activate

# Full integration test
python test_full_integration.py

# Test specific integrations
python test_midnight_integration.py
python test_unibase_integration.py
python test_asi.py
```

### Smart Contract Tests

```bash
cd contracts
npx hardhat test
```

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

See [README-DEPLOY.md](./README-DEPLOY.md) for detailed deployment instructions.

**Quick Production Checklist:**
- [ ] Set all environment variables
- [ ] Configure production RPC URLs
- [ ] Deploy smart contracts
- [ ] Set up Redis (optional)
- [ ] Configure reverse proxy (nginx)
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs
```

---

## 📚 Documentation

### Component Documentation

- **[Agent System](./agent/README.md)** - Backend agent documentation
- **[Frontend](./frontend/README.md)** - Next.js frontend documentation
- **[Smart Contracts](./contracts/README.md)** - Contract documentation
- **[Midnight Integration](./agent/MIDNIGHT_INTEGRATION.md)** - ZK proof guide
- **[Unibase Integration](./agent/UNIBASE_INTEGRATION.md)** - Storage setup
- **[Membase](./membase/README.md)** - Memory layer documentation

### Quick Start Guides

- **[Agent Quick Start](./agent/QUICKSTART.md)** - Get agents running quickly
- **[Midnight Quick Start](./midnight-dev/QUICKSTART.md)** - ZK proof setup
- **[Port Configuration](./PORT_CONFIGURATION.md)** - Port assignments

### Integration Guides

- **[Integration Summary](./INTEGRATION_SUMMARY.md)** - Full system integration
- **[Project Status](./PROJECT_STATUS.md)** - Current implementation status
- **[Proof Verification](./agent/PROOF_VERIFICATION.md)** - ZK proof verification

### API Documentation

- **Agent API**: http://localhost:8003/docs (when running)
- **Midnight API**: http://localhost:8100/docs (when running)

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Add tests** for new functionality
5. **Ensure all tests pass** (`pytest tests/`)
6. **Commit your changes** (`git commit -m 'Add amazing feature'`)
7. **Push to the branch** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Use meaningful commit messages
- Keep PRs focused and small

---

## 🔗 Links & Resources

### Core Technologies

- **[uAgents Framework](https://docs.fetch.ai/uagents/)** - Agent communication protocol
- **[Midnight Network](https://docs.midnight.network/)** - Zero-knowledge blockchain
- **[Unibase](https://openos-labs.gitbook.io/unibase-docs/)** - Decentralized storage
- **[Next.js](https://nextjs.org/)** - React framework
- **[Hardhat](https://hardhat.org/)** - Ethereum development environment

### External Services

- **[ASI.Cloud](https://asi.cloud/)** - AI-powered attack generation
- **[AgentVerse](https://agentverse.ai/)** - Agent registration and discovery
- **[WalletConnect](https://walletconnect.com/)** - Wallet connection protocol

### Standards & Specifications

- **[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)** - Agent Identity Standard
- **[ERC-3009](https://eips.ethereum.org/EIPS/eip-3009)** - Gasless Token Transfers

---

## 📝 License

[Add your license here]

---

## 🙏 Acknowledgments

- Fetch.ai for the uAgents framework
- Midnight Network for zero-knowledge infrastructure
- Unibase for decentralized storage solutions
- All contributors and supporters

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/0xguard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/0xguard/discussions)
- **Email**: support@0xguard.io

---

<div align="center">

**Built with ❤️ by the 0xGuard Team**

[Website](https://0xguard.io) • [Documentation](https://docs.0xguard.io) • [Discord](https://discord.gg/0xguard)

</div>

