# Redis Setup Guide

This guide explains how to set up and configure Redis for the 0xGuard logging system.

## Overview

0xGuard uses Redis to store audit logs, replacing the previous file-based `logs.json` system. This provides:
- **Concurrency Safety**: Multiple agents can write logs simultaneously without race conditions
- **Audit Isolation**: Logs are grouped by `audit_id` for concurrent audits
- **Performance**: Fast reads and writes with atomic operations
- **Scalability**: Can handle high-volume logging

## Installation

### macOS (using Homebrew)
```bash
brew install redis
brew services start redis
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Docker
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Windows
Download and install from: https://redis.io/download

## Configuration

Redis configuration is done via environment variables. Add these to your `.env` file:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_DB` | `0` | Redis database number (0-15) |

## Verification

Test Redis connection:

```bash
# Using redis-cli
redis-cli ping
# Should return: PONG

# Or test from Python
python -c "from agent.redis_client import is_redis_available; print('Redis available:', is_redis_available())"
```

## Migration from logs.json

If you have existing logs in `logs.json`, migrate them to Redis:

```bash
# Dry run (test without writing)
python agent/migrate_logs_to_redis.py --dry-run

# Perform migration
python agent/migrate_logs_to_redis.py

# Clear Redis first, then migrate
python agent/migrate_logs_to_redis.py --clear-redis
```

## Log Storage Structure

Logs are stored in Redis using the following key patterns:

- **Global logs**: `logs:global` - All logs (when audit_id is not provided)
- **Audit-specific logs**: `logs:audit:{audit_id}` - Logs for a specific audit

Each log entry is stored as a JSON string in a Redis List, with the following structure:

```json
{
  "timestamp": "HH:MM:SS",
  "actor": "Judge|RedTeam|Target",
  "icon": "🔵",
  "message": "Log message",
  "type": "info|attack|vulnerability|proof",
  "is_vulnerability": false,
  "audit_id": "optional_audit_id"
}
```

## Fallback Behavior

If Redis is unavailable, the logger automatically falls back to file-based logging (`logs.json`). This ensures the system continues to function even if Redis is down.

## Troubleshooting

### Redis Connection Failed

1. **Check if Redis is running:**
   ```bash
   redis-cli ping
   ```

2. **Check Redis configuration:**
   ```bash
   redis-cli CONFIG GET bind
   redis-cli CONFIG GET port
   ```

3. **Check firewall/network:**
   - Ensure port 6379 is accessible
   - Check if Redis is bound to localhost only

### Logs Not Appearing

1. **Verify Redis connection:**
   ```python
   from agent.redis_client import is_redis_available
   print(is_redis_available())
   ```

2. **Check Redis keys:**
   ```bash
   redis-cli KEYS "logs:*"
   ```

3. **Check log count:**
   ```python
   from agent.redis_client import get_log_count
   print(get_log_count())
   ```

### Performance Issues

- **Increase Redis memory limit** if storing many logs
- **Use Redis persistence** (RDB or AOF) for durability
- **Configure log rotation** (logs are automatically trimmed to last 1000 entries per key)

## Production Considerations

1. **Persistence**: Enable Redis persistence (RDB snapshots or AOF) to prevent data loss
2. **Memory Management**: Set `maxmemory` and `maxmemory-policy` in Redis config
3. **Monitoring**: Monitor Redis memory usage and connection count
4. **Backup**: Regularly backup Redis data
5. **Security**: Use Redis AUTH if exposed to network

## Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [Redis Configuration](https://redis.io/topics/config)
- [Redis Persistence](https://redis.io/topics/persistence)

