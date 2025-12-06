# Environment Variables Reference

Complete reference for all environment variables used in 0xGuard.

## Quick Setup

Copy `agent/env.example` to `.env` and fill in your values:

```bash
cp agent/env.example .env
```

## Configuration Sections

### Unibase Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `UNIBASE_ACCOUNT` | Yes | - | Unibase account address |
| `UNIBASE_RPC_URL` | No | `https://testnet.unibase.io` | Unibase RPC endpoint |
| `UNIBASE_CHAIN_ID` | No | `1337` | Unibase chain ID |

### Membase Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MEMBASE_ACCOUNT` | Yes | - | Membase account identifier |
| `MEMBASE_CONVERSATION_ID` | No | `bounty-audit-log` | Membase conversation ID |
| `MEMBASE_ID` | No | `judge-agent` | Membase agent ID |

### Judge Agent Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JUDGE_PRIVATE_KEY` | Yes | - | Judge agent private key |
| `BOUNTY_TOKEN_ADDRESS` | Yes | - | Bounty token contract address |

### Target System Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TARGET_SECRET_KEY` | No | `sk_production_12345` | Target system secret key |
| `TARGET_API_URL` | No | `http://localhost:5000` | Target API URL |

### Agent API Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AGENT_API_PORT` | No | `8003` | Port for agent API server |
| `AGENT_API_URL` | No | `http://localhost:8003` | Agent API URL (used by frontend) |

### Redis Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | No | `localhost` | Redis server hostname |
| `REDIS_PORT` | No | `6379` | Redis server port |
| `REDIS_DB` | No | `0` | Redis database number (0-15) |

### Midnight Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MIDNIGHT_API_URL` | No | `http://localhost:8000` | Midnight FastAPI server URL |
| `MIDNIGHT_DEVNET_URL` | No | `http://localhost:6300` | Midnight devnet URL |
| `MIDNIGHT_BRIDGE_URL` | No | `http://localhost:3000` | Midnight bridge URL |
| `MIDNIGHT_CONTRACT_ADDRESS` | No | (empty) | Midnight contract address |
| `MIDNIGHT_SIMULATION_MODE` | No | `false` | Enable simulation mode (testing only) |

### API Keys & External Services

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ASI_API_KEY` | Yes | - | ASI.Cloud API key |
| `AGENTVERSE_KEY` | Yes | - | AgentVerse API key |
| `MAILBOX_KEY` | Yes | - | Mailbox API key |

### Monitoring & Logging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `SENTRY_DSN` | No | (empty) | Sentry DSN for error tracking |

## Environment-Specific Configuration

### Development

```bash
# Use simulation mode for Midnight
MIDNIGHT_SIMULATION_MODE=true

# Use local Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Use testnet
UNIBASE_RPC_URL=https://testnet.unibase.io
```

### Production

```bash
# Disable simulation mode
MIDNIGHT_SIMULATION_MODE=false

# Use production Redis
REDIS_HOST=redis.production.internal
REDIS_PORT=6379

# Use mainnet
UNIBASE_RPC_URL=https://mainnet.unibase.io
```

## Validation

The Judge Agent validates required configuration on startup:

```python
from config import get_config

config = get_config()
config.validate()  # Raises ValueError if required vars are missing
```

Required variables:
- `UNIBASE_ACCOUNT`
- `MEMBASE_ACCOUNT`
- `JUDGE_PRIVATE_KEY`
- `BOUNTY_TOKEN_ADDRESS`

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use secrets management** in production (AWS Secrets Manager, HashiCorp Vault, etc.)
3. **Rotate API keys** regularly
4. **Use different keys** for development and production
5. **Restrict access** to environment variables

## Frontend Environment Variables

Frontend uses Next.js environment variables (prefixed with `NEXT_PUBLIC_` for client-side):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_AGENT_API_URL` | Agent API URL (default: `http://localhost:8003`) |
| `REDIS_HOST` | Redis host (server-side only) |
| `REDIS_PORT` | Redis port (server-side only) |
| `REDIS_DB` | Redis database (server-side only) |

## Troubleshooting

### Missing Required Variables

If you see errors about missing configuration:

1. Check `.env` file exists
2. Verify variable names match exactly (case-sensitive)
3. Ensure no extra spaces or quotes
4. Restart the application after changing `.env`

### Variable Not Loading

1. **Python**: Ensure `python-dotenv` is installed and `.env` is in the correct location
2. **Next.js**: Restart dev server after changing `.env`
3. **Check file encoding**: Use UTF-8 without BOM

### Default Values Not Working

Default values are only used if the environment variable is not set. If you set it to an empty string, that's the value that will be used.

## Additional Resources

- [Redis Setup Guide](./REDIS_SETUP.md)
- [Midnight API Setup Guide](./MIDNIGHT_API_SETUP.md)
- [Python-dotenv Documentation](https://pypi.org/project/python-dotenv/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

