# 0xGuard Configuration Checklist

This document provides a comprehensive checklist of all configuration requirements before running the 0xGuard system.

**Last Updated:** 2025-01-27  
**Based on:** CODEBASE_REVIEW.md analysis

---

## Prerequisites

- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Virtual environment created (`agent/venv/`)
- [ ] All dependencies installed (`pip install -r agent/requirements.txt`)
- [ ] Frontend dependencies installed (`cd frontend && npm install`)
- [ ] Midnight devnet Docker container (if using real Midnight network)

---

## 1. Agent Backend Configuration

### Required Environment Variables

**File:** `agent/.env` (create from `agent/env.example`)

#### Critical (Required)
- [ ] **UNIBASE_ACCOUNT** - Unibase account address for bounty tokens
  - Example: `0x742d35Cc6634C0532925a3b844Bc9e8bE1`
  - **Status:** Required by `config.py` validation
  - **Where:** Unibase testnet account

- [ ] **MEMBASE_ACCOUNT** - Membase account for persistent memory
  - Example: `default`
  - **Status:** Required by `config.py` validation
  - **Where:** Membase account setup

- [ ] **JUDGE_PRIVATE_KEY** - Private key for Judge agent
  - Example: `your_private_key_here`
  - **Status:** Required by `config.py` validation
  - **Security:** ⚠️ Keep secure, never commit to git

- [ ] **BOUNTY_TOKEN_ADDRESS** - Address of bounty token contract
  - Example: `0x...`
  - **Status:** Required by `config.py` validation
  - **Where:** Unibase contract address

#### Optional (Recommended)
- [ ] **UNIBASE_RPC_URL** - Unibase RPC endpoint (default: `https://testnet.unibase.io`)
- [ ] **UNIBASE_CHAIN_ID** - Chain ID (default: `1337`)
- [ ] **MEMBASE_CONVERSATION_ID** - Conversation ID for logs (default: `bounty-audit-log`)
- [ ] **MEMBASE_ID** - Membase identifier (default: `judge-agent`)
- [ ] **TARGET_SECRET_KEY** - Target system secret key for verification (default: `sk_production_12345`)
- [ ] **LOG_LEVEL** - Logging level (default: `INFO`)
- [ ] **AGENT_API_PORT** - Agent API server port (default: `8003`)

#### API Keys & Secrets

- [ ] **ASI_API_KEY** - ASI.Cloud API key for AI attack generation
  - **Status:** ⚠️ Has hardcoded default in code (should be removed)
  - **Location:** Hardcoded in `agent/judge.py:35`, `agent/target.py:24`, `agent/red_team.py:25`
  - **Action Required:** Set in `.env` and remove hardcoded defaults
  - **Get from:** https://asi.cloud/

- [ ] **AGENTVERSE_KEY** - Agentverse API key for agent registration
  - **Status:** ⚠️ Has hardcoded default in code (should be removed)
  - **Location:** Hardcoded in `agent/judge.py:39`, `agent/target.py:28`, `agent/red_team.py:29`
  - **Action Required:** Set in `.env` and remove hardcoded defaults
  - **Get from:** https://agentverse.ai/

- [ ] **MAILBOX_KEY** - Agentverse mailbox key (optional)
  - **Status:** ⚠️ Has hardcoded default in `agent/judge.py:154`
  - **Action Required:** Set in `.env` or remove hardcoded default
  - **Get from:** Agentverse dashboard

#### Agent Ports Configuration
- [ ] **JUDGE_PORT** - Judge agent port (default: `8002`)
- [ ] **TARGET_PORT** - Target agent port (default: `8000`)
- [ ] **RED_TEAM_PORT** - Red Team agent port (default: `8001`)
- [ ] **JUDGE_IP** / **TARGET_IP** / **RED_TEAM_IP** - Agent IP addresses (default: `localhost`)
- [ ] **AGENT_IP** - Common IP for all agents (default: `localhost`)

#### Agent Seeds (Optional - for deterministic addresses)
- [ ] **JUDGE_SEED** - Seed phrase for Judge agent
- [ ] **TARGET_SEED** - Seed phrase for Target agent
- [ ] **RED_TEAM_SEED** - Seed phrase for Red Team agent

#### Mailbox Configuration
- [ ] **USE_MAILBOX** - Enable mailbox (default: `true`)
- [ ] **MAILBOX_KEY** - Agentverse mailbox key (if using mailbox)

---

## 2. Midnight Integration Configuration

### Required Environment Variables

**File:** `agent/.env` or `contracts/midnight/api/python/.env`

#### Critical (If using real Midnight network)
- [ ] **MIDNIGHT_MNEMONIC** - Midnight wallet mnemonic
  - **Status:** Required by Midnight API config
  - **Security:** ⚠️ Keep secure, never commit to git
  - **Location:** `contracts/midnight/api/python/config.py:18`

#### Optional (Defaults provided)
- [ ] **MIDNIGHT_DEVNET_URL** - Midnight devnet URL (default: `http://localhost:6300`)
- [ ] **MIDNIGHT_BRIDGE_URL** - Bridge service URL (default: `http://localhost:3000`)
- [ ] **MIDNIGHT_API_URL** - Midnight FastAPI server URL (default: `http://localhost:8000`)
- [ ] **MIDNIGHT_CONTRACT_ADDRESS** - Deployed contract address (optional)
- [ ] **MIDNIGHT_PROOF_SERVER** - Proof server URL (default: `http://127.0.0.1:6300`)
- [ ] **MIDNIGHT_ENVIRONMENT** - Network environment: `testnet` or `mainnet` (default: `testnet`)

**Note:** Currently uses simulation mode. To use real Midnight network:
1. Start Midnight devnet Docker container
2. Set `MIDNIGHT_MNEMONIC` environment variable
3. Initialize Midnight API server

---

## 3. Frontend Configuration

### Environment Variables

**File:** `frontend/.env.local` (create new file)

- [ ] **AGENT_API_URL** - Agent backend API URL
  - Default: `http://localhost:8003`
  - **Status:** Used in `frontend/app/api/audit/start/route.ts` and `frontend/app/api/agent-status/route.ts`
  - **Action Required:** Set if agent API runs on different host/port

#### Next.js Configuration
- [ ] **NEXT_PUBLIC_APP_URL** - Public app URL (optional, for production)
- [ ] **NODE_ENV** - Environment: `development` or `production` (auto-set by Next.js)

**Note:** Frontend uses wallet-based authentication (no additional config needed)

---

## 4. Database Configuration

### Current Status: ⚠️ No Database Configured

**Current Implementation:**
- Uses file-based storage (`logs.json` in project root)
- Mock audit data in `frontend/app/api/audits/route.ts`
- Membase uses internal SQLite (automatically configured)

**Future Database Setup (Not Required Now):**
When implementing database integration:
- [ ] Choose database: SQLite (recommended) or PostgreSQL
- [ ] Set connection string
- [ ] Run migrations
- [ ] Update API routes to use database

**For Now:** No database configuration needed - system works with file-based storage.

---

## 5. Hardcoded Values That Should Be Environment Variables

### ⚠️ Security Issues Found

#### Critical: Hardcoded API Keys

1. **ASI_API_KEY** - Hardcoded default in multiple files
   - `agent/judge.py:35`
   - `agent/target.py:24`
   - `agent/red_team.py:25`
   - **Action:** Remove hardcoded defaults, require env var

2. **AGENTVERSE_KEY** - Hardcoded default in multiple files
   - `agent/judge.py:39`
   - `agent/target.py:28`
   - `agent/red_team.py:29`
   - **Action:** Remove hardcoded defaults, require env var

3. **MAILBOX_KEY** - Hardcoded default
   - `agent/judge.py:154`
   - **Action:** Remove hardcoded default, require env var

4. **SECRET_KEY** - Hardcoded in code
   - `agent/judge.py:52` - Value: `"fetch_ai_2024"`
   - **Action:** Should use `TARGET_SECRET_KEY` env var instead

#### Port Numbers (Acceptable - have defaults)

Port defaults are acceptable as they have env var overrides:
- Judge: `8002` (can override with `JUDGE_PORT`)
- Target: `8000` (can override with `TARGET_PORT`)
- Red Team: `8001` (can override with `RED_TEAM_PORT`)
- Agent API: `8003` (can override with `AGENT_API_PORT`)
- Midnight API: `8000` (can override with `PORT`)

**Note:** Port conflicts possible if multiple services use same port.

---

## 6. Service Dependencies

### Services That Must Be Running

- [ ] **Agent API Server** - Port 8003
  - Start: `cd agent && python start_api_server.py`
  - Or: `cd agent && python api_server.py`

- [ ] **Midnight FastAPI Server** (Optional - for real Midnight integration)
  - Port: 8000 (default, configurable via `PORT` env var)
  - Start: `cd contracts/midnight/api/python && python main.py`
  - **Status:** Not required if using simulation mode

- [ ] **Midnight Devnet** (Optional - for real Midnight network)
  - Docker container on port 6300
  - **Status:** Not required if using simulation mode

- [ ] **Frontend Next.js Server** - Port 3000 (default)
  - Start: `cd frontend && npm run dev`

---

## 7. File-Based Storage

### Files That Must Exist/Be Writable

- [ ] **`logs.json`** - Project root directory
  - **Status:** Created automatically by logger
  - **Permissions:** Must be writable by agent processes
  - **Location:** `/Users/elibelilty/Documents/GitHub/0xguard/logs.json`

- [ ] **`bounty_tokens.json`** - Project root directory
  - **Status:** Used by Unibase integration
  - **Permissions:** Must be writable

- [ ] **`known_exploits.json`** - Project root directory
  - **Status:** Used for exploit tracking
  - **Permissions:** Must be writable

---

## 8. Network Configuration

### Ports in Use

| Service | Default Port | Env Var Override | Status |
|---------|-------------|------------------|--------|
| Agent API Server | 8003 | `AGENT_API_PORT` | ✅ New |
| Judge Agent | 8002 | `JUDGE_PORT` | ✅ Required |
| Target Agent | 8000 | `TARGET_PORT` | ✅ Required |
| Red Team Agent | 8001 | `RED_TEAM_PORT` | ✅ Required |
| Midnight FastAPI | 8000 | `PORT` | ⚠️ Conflicts with Target |
| Midnight Devnet | 6300 | N/A | Optional |
| Frontend Next.js | 3000 | N/A | ✅ Default |
| Midnight Proof Server | 6300 | `MIDNIGHT_PROOF_SERVER` | Optional |

**⚠️ Port Conflict:** Midnight FastAPI (8000) conflicts with Target Agent (8000)
- **Solution:** Use different ports or run services separately
- **Recommendation:** Change Midnight FastAPI port or Target Agent port

---

## Quick Start Configuration

### Minimum Required Setup

1. **Create Agent .env file:**
   ```bash
   cd agent
   cp env.example .env
   # Edit .env with required values
   ```

2. **Set Critical Variables:**
   ```bash
   # In agent/.env
   UNIBASE_ACCOUNT=0x742d35Cc6634C0532925a3b844Bc9e8bE1
   MEMBASE_ACCOUNT=default
   JUDGE_PRIVATE_KEY=your_private_key_here
   BOUNTY_TOKEN_ADDRESS=0x...
   ASI_API_KEY=your_asi_key_here
   AGENTVERSE_KEY=your_agentverse_key_here
   ```

3. **Optional Frontend Config:**
   ```bash
   cd frontend
   # Create .env.local if needed
   echo "AGENT_API_URL=http://localhost:8003" > .env.local
   ```

---

## Pre-Launch Checklist

### Before Starting Services

- [ ] All required environment variables set in `agent/.env`
- [ ] No hardcoded API keys in code (security issue)
- [ ] Ports are available (no conflicts)
- [ ] Virtual environment activated
- [ ] Dependencies installed
- [ ] `logs.json` file writable (will be created automatically)
- [ ] Network connectivity (if using external services)

### Startup Order

1. [ ] Start Agent API Server (`agent/start_api_server.py`)
2. [ ] Start Frontend (`cd frontend && npm run dev`)
3. [ ] (Optional) Start Midnight FastAPI if using real Midnight
4. [ ] (Optional) Start Midnight devnet Docker container

### Verification Steps

- [ ] Agent API health check: `curl http://localhost:8003/health`
- [ ] Frontend loads: `http://localhost:3000`
- [ ] Can start agents from frontend
- [ ] Logs appear in `logs.json`
- [ ] Agent status shows in frontend

---

## Security Recommendations

### ⚠️ Immediate Actions Required

1. **Remove Hardcoded API Keys:**
   - Remove defaults from `agent/judge.py`, `agent/target.py`, `agent/red_team.py`
   - Require env vars instead of defaults
   - Add validation to fail if keys missing

2. **Remove Hardcoded SECRET_KEY:**
   - Use `TARGET_SECRET_KEY` env var instead of hardcoded value
   - Update `agent/judge.py:52`

3. **Remove Hardcoded MAILBOX_KEY:**
   - Make it optional or require env var
   - Update `agent/judge.py:154`

4. **Add .env to .gitignore:**
   - Ensure `.env` files are not committed
   - Verify `.gitignore` includes `.env*`

5. **Use Secrets Management:**
   - For production, use proper secrets management (Vault, AWS Secrets Manager, etc.)
   - Never commit secrets to version control

---

## Configuration File Locations

| File | Location | Purpose |
|------|----------|---------|
| `agent/.env` | `agent/.env` | Agent backend configuration |
| `agent/env.example` | `agent/env.example` | Template for agent config |
| `agent/config.py` | `agent/config.py` | Config validation and loading |
| `frontend/.env.local` | `frontend/.env.local` | Frontend environment variables |
| `contracts/midnight/api/python/config.py` | Midnight API config | Midnight network configuration |

---

## Troubleshooting

### Common Issues

1. **Port Already in Use:**
   - Check: `lsof -i :PORT` or `netstat -an | grep PORT`
   - Solution: Change port in env var or stop conflicting service

2. **Missing Environment Variables:**
   - Check: Run `python agent/config.py` to validate
   - Solution: Set all required vars in `agent/.env`

3. **API Keys Not Working:**
   - Check: Keys are valid and not expired
   - Solution: Get new keys from service providers

4. **Agent API Not Responding:**
   - Check: Server is running on correct port
   - Solution: Verify `AGENT_API_PORT` and firewall settings

---

## Summary

### Required Configuration

**Critical (Must Configure):**
- [ ] `agent/.env` file created
- [ ] `UNIBASE_ACCOUNT` set
- [ ] `MEMBASE_ACCOUNT` set
- [ ] `JUDGE_PRIVATE_KEY` set
- [ ] `BOUNTY_TOKEN_ADDRESS` set

**Recommended:**
- [ ] `ASI_API_KEY` set (remove hardcoded default)
- [ ] `AGENTVERSE_KEY` set (remove hardcoded default)
- [ ] `AGENT_API_PORT` configured
- [ ] Frontend `AGENT_API_URL` configured

**Optional:**
- [ ] Midnight integration (for real ZK proofs)
- [ ] Database integration (future enhancement)

### Security Issues to Fix

1. Remove hardcoded API keys from code
2. Remove hardcoded SECRET_KEY
3. Remove hardcoded MAILBOX_KEY
4. Add proper secrets management

---

**Next Steps:**
1. Create `agent/.env` from template
2. Set all required variables
3. Remove hardcoded secrets from code
4. Test configuration with health checks
5. Start services in correct order

