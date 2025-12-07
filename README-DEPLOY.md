# 0xGuard Deployment Guide

This guide covers deploying 0xGuard using Docker Compose or PM2.

## Docker Compose Deployment (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- `agent/.env` file configured with required environment variables

### Quick Start

```bash
# Build and start all services
docker compose up --build

# Start in detached mode
docker compose up --build -d

# View logs
docker compose logs -f

# Stop all services
docker compose stop

# Stop and remove containers
docker compose down
```

### Start with Midnight API and Devnet

```bash
# Start all services including Midnight devnet and API
docker compose --profile midnight up --build
```

This will start:
- Midnight Devnet (port 6300) - Local blockchain for testing
- Midnight FastAPI (port 8100) - Contract interaction API

### Test Midnight Devnet Standalone

```bash
# Pull and run devnet
docker pull midnightnetwork/devnet:latest
docker run -d -p 6300:6300 --name midnight-devnet midnightnetwork/devnet:latest

# Test health endpoint
curl http://localhost:6300/health

# Or use the test script
./test-midnight-devnet.sh
```

### Service URLs

- **Frontend**: http://localhost:3000
- **Agent API**: http://localhost:8003
- **Judge Agent**: http://localhost:8002
- **Target Agent**: http://localhost:8000
- **Red Team Agent**: http://localhost:8001
- **Midnight API** (optional): http://localhost:8100

### Health Checks

All services include health checks:
- Agent API: `/health` endpoint
- Frontend: `/api/audits` endpoint
- Agents: Process checks

### Shared Volumes

- `./logs.json` - Shared log file (read-write for agents, read-only for frontend)
- `./logs/` - Log directory for individual service logs

## PM2 Deployment (Non-Docker)

### Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- PM2 installed globally: `npm install -g pm2`

### Setup

```bash
# Install frontend dependencies
cd frontend && npm install && cd ..

# Install Python dependencies
cd agent && pip install -r requirements.txt && cd ..

# Create logs directory
mkdir -p logs

# Ensure logs.json exists
touch logs.json
echo "[]" > logs.json
```

### Start All Services

```bash
# Start all services
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit
```

### Individual Service Management

```bash
# Start specific service
pm2 start 0xguard-agent-api

# Stop specific service
pm2 stop 0xguard-judge

# Restart specific service
pm2 restart 0xguard-frontend

# Delete specific service
pm2 delete 0xguard-target
```

### PM2 Commands

```bash
# Save current process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
pm2 save

# View detailed info
pm2 info 0xguard-agent-api

# View logs for specific service
pm2 logs 0xguard-frontend

# Restart all services
pm2 restart all

# Stop all services
pm2 stop all

# Delete all services
pm2 delete all
```

### Enable Midnight API (PM2)

Edit `ecosystem.config.js` and uncomment the `enabled: true` line in the midnight-api app config, then:

```bash
pm2 restart ecosystem.config.js
```

## Environment Variables

Ensure `agent/.env` is configured with:

```env
# Agent API
AGENT_API_PORT=8003
AGENT_API_URL=http://localhost:8003

# Agent Ports
TARGET_PORT=8000
JUDGE_PORT=8002
RED_TEAM_PORT=8001

# Unibase
UNIBASE_ACCOUNT=0x...
BOUNTY_TOKEN_ADDRESS=0x...
UNIBASE_RPC_URL=https://testnet.unibase.io

# Midnight (optional)
MIDNIGHT_API_URL=http://localhost:8100
MIDNIGHT_SIMULATION_MODE=false

# Other required variables (see agent/env.example)
```

## Troubleshooting

### Docker Issues

```bash
# Check service health
docker compose ps

# View service logs
docker compose logs agent-api
docker compose logs judge-agent

# Restart specific service
docker compose restart agent-api

# Rebuild specific service
docker compose up --build agent-api
```

### PM2 Issues

```bash
# Check if processes are running
pm2 status

# View error logs
pm2 logs --err

# Clear logs
pm2 flush

# Check system resources
pm2 monit
```

### Logs Location

- **Docker**: Logs are in `./logs/` directory and `./logs.json`
- **PM2**: Logs are in `./logs/` directory with individual files per service

## Production Considerations

1. **Security**: Use proper secrets management (not `.env` files in production)
2. **Monitoring**: Set up monitoring for all services
3. **Backups**: Regularly backup `logs.json` and important data
4. **Resource Limits**: Adjust memory limits in docker-compose.yml or ecosystem.config.js
5. **SSL/TLS**: Use reverse proxy (nginx/traefik) for HTTPS in production
6. **Scaling**: Adjust instance counts based on load

