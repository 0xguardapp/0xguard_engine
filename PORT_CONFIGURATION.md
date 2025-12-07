# Port Configuration - 0xGuard

This document defines the port assignments for all services to avoid conflicts.

## Port Assignments

| Service | Port | Description |
|---------|------|-------------|
| **Target Agent** | 8000 | Target agent that receives attacks |
| **Red Team Agent** | 8001 | Red team agent that performs attacks |
| **Judge Agent** | 8002 | Judge agent that monitors and verifies |
| **Agent API Server** | 8003 | FastAPI server managing agent lifecycle |
| **Midnight API** | 8100 | Midnight Network FastAPI bridge server |
| **Midnight Devnet** | 6300 | Midnight proof server (devnet) |
| **Frontend** | 3000 | Next.js frontend application |

## Configuration Files

### Environment Variables (agent/.env)

```bash
# Agent Ports
TARGET_PORT=8000
JUDGE_PORT=8002
RED_TEAM_PORT=8001
AGENT_API_PORT=8003

# Midnight Integration
MIDNIGHT_API_URL=http://localhost:8100
MIDNIGHT_DEVNET_URL=http://localhost:6300
```

### config.py Defaults

All ports are configured in `agent/config.py` with the following defaults:
- `TARGET_PORT`: 8000
- `JUDGE_PORT`: 8002
- `RED_TEAM_PORT`: 8001
- `AGENT_API_PORT`: 8003
- `MIDNIGHT_API_URL`: http://localhost:8100

### Docker Compose

Ports are mapped in `docker-compose.yml`:
- Target: `8000:8000`
- Judge: `8002:8002`
- Red Team: `8001:8001`
- Agent API: `8003:8003`
- Midnight API: `8100:8100`
- Midnight Devnet: `6300:6300`

### PM2 Ecosystem

Ports are configured in `ecosystem.config.js`:
- Target: `TARGET_PORT: 8000`
- Judge: `JUDGE_PORT: 8002`
- Red Team: `RED_TEAM_PORT: 8001`
- Agent API: `AGENT_API_PORT: 8003`
- Midnight API: `PORT: 8100`

## Port Conflict Resolution

**Issue:** Target agent port (8000) conflicted with Midnight FastAPI server (default 8000).

**Resolution:**
- ✅ Midnight API moved to port **8100**
- ✅ Target Agent remains on port **8000**
- ✅ All other ports unchanged

## Verification

To verify port configuration:

```bash
# Check all ports are correctly assigned
grep -r "8000\|8001\|8002\|8003\|8100" agent/config.py agent/env.example docker-compose.yml ecosystem.config.js

# Verify no conflicts
netstat -an | grep -E "8000|8001|8002|8003|8100" | grep LISTEN
```

## Important Notes

1. **Midnight API must use port 8100** - This is critical to avoid conflicts with Target Agent
2. **All agents load ports from config.py** - Ensures consistency across the system
3. **Environment variables override defaults** - Set in `agent/.env` file
4. **Docker Compose maps ports** - External:Internal port mapping

