"""
Redis client utility for 0xGuard logging system.
Provides thread-safe Redis connection and operations for log storage.
"""
import os
import json
import threading
from typing import Optional, List, Dict, Any
from pathlib import Path

try:
    import redis
    from redis.exceptions import ConnectionError, TimeoutError, RedisError
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None
    ConnectionError = Exception
    TimeoutError = Exception
    RedisError = Exception

# Thread lock for connection initialization
_connection_lock = threading.Lock()
_redis_client: Optional[Any] = None
_redis_available = False
_connection_attempted = False
_last_error_time = 0
_ERROR_COOLDOWN = 60  # Don't log errors more than once per minute


def get_redis_client():
    """
    Get or create Redis client instance (singleton pattern).
    
    Returns:
        redis.Redis: Redis client instance, or None if Redis is unavailable
    """
    global _redis_client, _redis_available, _connection_attempted, _last_error_time
    import time
    
    if not REDIS_AVAILABLE:
        return None
    
    # If we've recently failed to connect, don't retry immediately
    if not _redis_available and _last_error_time > 0:
        elapsed = time.time() - _last_error_time
        if elapsed < _ERROR_COOLDOWN:
            return None
    
    if _redis_client is not None and _redis_available:
        return _redis_client
    
    # Prevent multiple simultaneous connection attempts
    if _connection_attempted:
        return None
    
    with _connection_lock:
        # Double-check after acquiring lock
        if _redis_client is not None and _redis_available:
            return _redis_client
        
        _connection_attempted = True
        
        try:
            host = os.getenv("REDIS_HOST", "localhost")
            port = int(os.getenv("REDIS_PORT", "6379"))
            db = int(os.getenv("REDIS_DB", "0"))
            
            _redis_client = redis.Redis(
                host=host,
                port=port,
                db=db,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            _redis_client.ping()
            _redis_available = True
            _last_error_time = 0
            _connection_attempted = False
            
            return _redis_client
        except (ConnectionError, TimeoutError, RedisError) as e:
            _redis_available = False
            _redis_client = None
            _connection_attempted = False
            current_time = time.time()
            # Only log errors occasionally to avoid spam
            if current_time - _last_error_time > _ERROR_COOLDOWN:
                print(f"[Redis] Connection error (falling back to file-based logging): {type(e).__name__}")
            _last_error_time = current_time
            return None
        except Exception as e:
            _redis_available = False
            _redis_client = None
            _connection_attempted = False
            current_time = time.time()
            # Only log errors occasionally to avoid spam
            if current_time - _last_error_time > _ERROR_COOLDOWN:
                print(f"[Redis] Connection error (falling back to file-based logging): {type(e).__name__}")
            _last_error_time = current_time
            return None


def is_redis_available() -> bool:
    """
    Check if Redis is available and connected.
    
    Returns:
        bool: True if Redis is available, False otherwise
    """
    if not REDIS_AVAILABLE:
        return False
    
    client = get_redis_client()
    if client is None:
        return False
    
    try:
        client.ping()
        return True
    except Exception:
        return False


def append_log(
    log_entry: Dict[str, Any],
    audit_id: Optional[str] = None
) -> bool:
    """
    Append a log entry to Redis.
    
    Args:
        log_entry: Log entry dictionary with timestamp, actor, message, etc.
        audit_id: Optional audit ID to group logs by audit
        
    Returns:
        bool: True if successful, False otherwise
    """
    if not is_redis_available():
        return False
    
    try:
        client = get_redis_client()
        if client is None:
            return False
        
        # Serialize log entry
        log_json = json.dumps(log_entry)
        
        # Use audit-specific key if provided, otherwise use global key
        if audit_id:
            key = f"logs:audit:{audit_id}"
        else:
            key = "logs:global"
        
        # Use LPUSH to append (newest first) and LTRIM to keep last 1000 entries
        pipe = client.pipeline()
        pipe.lpush(key, log_json)
        pipe.ltrim(key, 0, 999)  # Keep last 1000 entries (0-999)
        pipe.execute()
        
        return True
    except Exception:
        return False


def get_logs(
    audit_id: Optional[str] = None,
    limit: int = 1000,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Get logs from Redis.
    
    Args:
        audit_id: Optional audit ID to filter logs
        limit: Maximum number of logs to return
        offset: Offset for pagination
        
    Returns:
        List[Dict[str, Any]]: List of log entries
    """
    if not is_redis_available():
        return []
    
    try:
        client = get_redis_client()
        if client is None:
            return []
        
        # Use audit-specific key if provided, otherwise use global key
        if audit_id:
            key = f"logs:audit:{audit_id}"
        else:
            key = "logs:global"
        
        # Get logs (LRANGE returns oldest to newest, so we reverse for newest first)
        logs_json = client.lrange(key, offset, offset + limit - 1)
        
        # Parse JSON entries
        logs = []
        for log_json in reversed(logs_json):  # Reverse to get newest first
            try:
                log_entry = json.loads(log_json)
                logs.append(log_entry)
            except json.JSONDecodeError:
                continue
        
        return logs
    except Exception:
        return []


def get_all_audit_ids() -> List[str]:
    """
    Get all audit IDs that have logs in Redis.
    
    Returns:
        List[str]: List of audit IDs
    """
    if not is_redis_available():
        return []
    
    try:
        client = get_redis_client()
        if client is None:
            return []
        
        # Get all keys matching pattern
        keys = client.keys("logs:audit:*")
        
        # Extract audit IDs
        audit_ids = []
        for key in keys:
            # Key format: logs:audit:{audit_id}
            parts = key.split(":", 2)
            if len(parts) == 3:
                audit_ids.append(parts[2])
        
        return audit_ids
    except Exception:
        return []


def clear_logs(audit_id: Optional[str] = None) -> bool:
    """
    Clear logs from Redis.
    
    Args:
        audit_id: Optional audit ID to clear specific audit logs.
                 If None, clears all logs.
        
    Returns:
        bool: True if successful, False otherwise
    """
    if not is_redis_available():
        return False
    
    try:
        client = get_redis_client()
        if client is None:
            return False
        
        if audit_id:
            key = f"logs:audit:{audit_id}"
            client.delete(key)
        else:
            # Clear all log keys
            keys = client.keys("logs:*")
            if keys:
                client.delete(*keys)
        
        return True
    except Exception:
        return False


def get_log_count(audit_id: Optional[str] = None) -> int:
    """
    Get the number of log entries for an audit or globally.
    
    Args:
        audit_id: Optional audit ID to count logs for specific audit
        
    Returns:
        int: Number of log entries
    """
    if not is_redis_available():
        return 0
    
    try:
        client = get_redis_client()
        if client is None:
            return 0
        
        if audit_id:
            key = f"logs:audit:{audit_id}"
        else:
            key = "logs:global"
        
        return client.llen(key)
    except Exception:
        return 0

