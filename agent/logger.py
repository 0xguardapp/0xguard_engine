import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

# Import Redis client
try:
    from redis_client import (
        is_redis_available,
        append_log as redis_append_log,
        get_logs as redis_get_logs
    )
    REDIS_CLIENT_AVAILABLE = True
except ImportError:
    REDIS_CLIENT_AVAILABLE = False

# Thread lock for safe file writing (fallback)
_log_lock = threading.Lock()
_log_file = Path("logs.json")


def _ensure_log_file():
    """Initialize logs.json as empty array if it doesn't exist."""
    if not _log_file.exists():
        with _log_lock:
            _log_file.write_text("[]")


def log(
    actor: str,
    message: str,
    icon: str = "🔵",
    log_type: str = "info",
    is_vulnerability: bool = False,
    audit_id: Optional[str] = None,
) -> None:
    """
    Write a structured log entry to Redis (preferred) or logs.json (fallback).
    
    Args:
        actor: The actor name (e.g., "RedTeam", "Target", "Judge")
        message: The log message
        icon: Emoji icon for the actor
        log_type: Type of log (info, attack, vulnerability, proof, etc.)
        is_vulnerability: If True, highlights the log as a vulnerability
        audit_id: Optional audit ID to group logs by audit (for concurrent audits)
    """
    timestamp = datetime.now().strftime("%H:%M:%S")
    
    log_entry = {
        "timestamp": timestamp,
        "actor": actor,
        "icon": icon,
        "message": message,
        "type": log_type,
        "is_vulnerability": is_vulnerability,
    }
    
    # Add audit_id to log entry if provided
    if audit_id:
        log_entry["audit_id"] = audit_id
    
    # Try Redis first (preferred method)
    if REDIS_CLIENT_AVAILABLE and is_redis_available():
        try:
            if redis_append_log(log_entry, audit_id=audit_id):
                # Also write to file as backup (optional, for backward compatibility)
                _write_to_file_fallback(log_entry)
                return
        except Exception:
            # Fall through to file-based logging if Redis fails
            pass
    
    # Fallback to file-based logging
    _write_to_file_fallback(log_entry)


def _write_to_file_fallback(log_entry: dict) -> None:
    """
    Write log entry to file (fallback method).
    
    Args:
        log_entry: Log entry dictionary
    """
    _ensure_log_file()
    
    with _log_lock:
        try:
            # Read existing logs
            if _log_file.exists():
                content = _log_file.read_text()
                logs = json.loads(content) if content.strip() else []
            else:
                logs = []
            
            # Append new log
            logs.append(log_entry)
            
            # Write back (keep last 1000 entries to prevent file from growing too large)
            if len(logs) > 1000:
                logs = logs[-1000:]
            
            _log_file.write_text(json.dumps(logs, indent=2))
        except (json.JSONDecodeError, IOError) as e:
            # If file is corrupted or can't be written, create new one
            _log_file.write_text(json.dumps([log_entry], indent=2))


def clear_logs(audit_id: Optional[str] = None) -> None:
    """
    Clear all logs from Redis (preferred) or logs.json (fallback).
    
    Args:
        audit_id: Optional audit ID to clear specific audit logs.
                 If None, clears all logs.
    """
    # Try Redis first
    if REDIS_CLIENT_AVAILABLE and is_redis_available():
        try:
            from redis_client import clear_logs as redis_clear_logs
            if redis_clear_logs(audit_id=audit_id):
                # Also clear file if clearing all logs
                if audit_id is None:
                    with _log_lock:
                        _log_file.write_text("[]")
                return
        except Exception:
            # Fall through to file-based clearing if Redis fails
            pass
    
    # Fallback to file-based clearing
    with _log_lock:
        _log_file.write_text("[]")


