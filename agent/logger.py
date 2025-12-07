"""
Structured logging module for 0xGuard agents.

All logs include:
- timestamp (ISO format)
- agent (actor name)
- message
- category: "attack" | "proof" | "status" | "error"
- auditId (if available)
"""
import json
import threading
import sys
import platform
from datetime import datetime
from pathlib import Path
from typing import Optional, Literal

# File locking support (Unix only, Windows uses different approach)
try:
    import fcntl
    HAS_FCNTL = True
except ImportError:
    HAS_FCNTL = False

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

# Type definitions
Category = Literal["attack", "proof", "status", "error"]

# Thread lock for safe file writing (fallback)
_log_lock = threading.Lock()
_log_file = Path(__file__).parent.parent / "logs.json"


def _ensure_log_file():
    """Initialize logs.json as empty array if it doesn't exist."""
    if not _log_file.exists():
        with _log_lock:
            try:
                # Create parent directory if needed
                _log_file.parent.mkdir(parents=True, exist_ok=True)
                # Create empty array file
                _log_file.write_text("[]")
            except Exception as e:
                print(f"Error creating log file: {e}", file=sys.stderr)


def _map_log_type_to_category(log_type: str, is_vulnerability: bool = False) -> Category:
    """
    Map log_type to category.
    
    Args:
        log_type: Original log type (info, attack, proof, error, etc.)
        is_vulnerability: If True, treat as attack category
        
    Returns:
        Category: Mapped category
    """
    log_type_lower = log_type.lower()
    
    if is_vulnerability or log_type_lower in ("attack", "vulnerability", "exploit"):
        return "attack"
    elif log_type_lower in ("proof", "zk_proof", "midnight"):
        return "proof"
    elif log_type_lower in ("error", "warning", "critical"):
        return "error"
    else:
        return "status"


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
    
    All logs include:
    - timestamp: ISO format timestamp
    - agent: Actor name
    - message: Log message
    - category: "attack" | "proof" | "status" | "error"
    - auditId: Optional audit ID
    
    Args:
        actor: The actor name (e.g., "RedTeam", "Target", "Judge")
        message: The log message
        icon: Emoji icon for the actor
        log_type: Type of log (info, attack, vulnerability, proof, error, etc.)
        is_vulnerability: If True, highlights the log as a vulnerability
        audit_id: Optional audit ID to group logs by audit
    """
    timestamp = datetime.now().isoformat()
    category = _map_log_type_to_category(log_type, is_vulnerability)
    
    log_entry = {
        "timestamp": timestamp,
        "agent": actor,
        "message": message,
        "category": category,
        "icon": icon,
        "type": log_type,  # Keep original type for backward compatibility
        "is_vulnerability": is_vulnerability,
    }
    
    # Add audit_id to log entry if provided
    if audit_id:
        log_entry["auditId"] = audit_id
    
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
    Write log entry to file using append-only mode with file locking.
    
    Uses append-only mode to prevent corruption:
    1. Read existing logs
    2. Append new log
    3. Write back (with file locking)
    
    Args:
        log_entry: Log entry dictionary
    """
    _ensure_log_file()
    
    with _log_lock:
        try:
            # Read existing logs with file locking (Unix) or thread-safe write (Windows)
            if _log_file.exists():
                if HAS_FCNTL and platform.system() != 'Windows':
                    # Use fcntl file locking on Unix systems
                    try:
                        with open(_log_file, 'r+') as f:
                            # Try to acquire exclusive lock (non-blocking)
                            try:
                                fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                            except (IOError, OSError):
                                # Lock failed, try again with blocking lock
                                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                            
                            try:
                                content = f.read()
                                logs = json.loads(content) if content.strip() else []
                            except json.JSONDecodeError:
                                # File corrupted, start fresh
                                logs = []
                            
                            # Append new log
                            logs.append(log_entry)
                            
                            # Keep last 10000 entries to prevent file from growing too large
                            if len(logs) > 10000:
                                logs = logs[-10000:]
                            
                            # Write back
                            f.seek(0)
                            f.truncate()
                            f.write(json.dumps(logs, indent=2))
                            f.flush()
                            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                    except (IOError, OSError):
                        # File locking failed, fall back to simple read/write
                        content = _log_file.read_text()
                        logs = json.loads(content) if content.strip() else []
                        logs.append(log_entry)
                        if len(logs) > 10000:
                            logs = logs[-10000:]
                        _log_file.write_text(json.dumps(logs, indent=2))
                else:
                    # Windows or no fcntl: use thread-safe read/write (lock already held)
                    content = _log_file.read_text()
                    logs = json.loads(content) if content.strip() else []
                    logs.append(log_entry)
                    if len(logs) > 10000:
                        logs = logs[-10000:]
                    _log_file.write_text(json.dumps(logs, indent=2))
            else:
                # File doesn't exist, create it with first log
                logs = [log_entry]
                _log_file.write_text(json.dumps(logs, indent=2))
                
        except (json.JSONDecodeError, IOError, OSError) as e:
            # If file is corrupted or can't be written, create new one
            try:
                _log_file.write_text(json.dumps([log_entry], indent=2))
            except Exception:
                # Last resort: print to stderr
                print(f"Failed to write log: {json.dumps(log_entry)}", file=sys.stderr)


def get_logs(
    audit_id: Optional[str] = None,
    category: Optional[Category] = None,
    since: Optional[str] = None,
    limit: Optional[int] = None
) -> list:
    """
    Retrieve logs with optional filtering.
    
    Args:
        audit_id: Filter by audit ID
        category: Filter by category ("attack" | "proof" | "status" | "error")
        since: Filter logs since this ISO timestamp
        limit: Maximum number of logs to return
        
    Returns:
        list: Filtered log entries
    """
    # Try Redis first
    if REDIS_CLIENT_AVAILABLE and is_redis_available():
        try:
            logs = redis_get_logs(audit_id=audit_id)
            # Apply additional filters
            return _filter_logs(logs, category=category, since=since, limit=limit)
        except Exception:
            # Fall through to file-based retrieval
            pass
    
    # Fallback to file-based retrieval
    _ensure_log_file()
    
    try:
        if _log_file.exists():
            if HAS_FCNTL and platform.system() != 'Windows':
                # Use fcntl file locking on Unix systems
                with open(_log_file, 'r') as f:
                    try:
                        fcntl.flock(f.fileno(), fcntl.LOCK_SH)  # Shared lock for reading
                    except (IOError, OSError):
                        # File locking not available, continue without lock
                        pass
                    
                    try:
                        content = f.read()
                        logs = json.loads(content) if content.strip() else []
                    finally:
                        try:
                            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                        except (IOError, OSError):
                            pass
            else:
                # Windows or no fcntl: simple read (lock not critical for reads)
                content = _log_file.read_text()
                logs = json.loads(content) if content.strip() else []
        else:
            logs = []
    except (json.JSONDecodeError, IOError, OSError):
        logs = []
    
    return _filter_logs(logs, audit_id=audit_id, category=category, since=since, limit=limit)


def _filter_logs(
    logs: list,
    audit_id: Optional[str] = None,
    category: Optional[Category] = None,
    since: Optional[str] = None,
    limit: Optional[int] = None
) -> list:
    """
    Filter logs by various criteria.
    
    Args:
        logs: List of log entries
        audit_id: Filter by audit ID
        category: Filter by category
        since: Filter logs since this ISO timestamp
        limit: Maximum number of logs to return
        
    Returns:
        list: Filtered log entries
    """
    filtered = logs
    
    # Filter by audit_id
    if audit_id:
        filtered = [log for log in filtered if log.get("auditId") == audit_id]
    
    # Filter by category
    if category:
        filtered = [log for log in filtered if log.get("category") == category]
    
    # Filter by since timestamp
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            filtered = [
                log for log in filtered
                if datetime.fromisoformat(log.get("timestamp", "").replace('Z', '+00:00')) >= since_dt
            ]
        except (ValueError, TypeError):
            # Invalid timestamp, skip filtering
            pass
    
    # Apply limit
    if limit is not None and limit > 0:
        filtered = filtered[-limit:]  # Get most recent N logs
    
    return filtered


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
                        _ensure_log_file()
                        _log_file.write_text("[]")
                return
        except Exception:
            # Fall through to file-based clearing if Redis fails
            pass
    
    # Fallback to file-based clearing
    if audit_id is None:
        # Clear all logs
        with _log_lock:
            _ensure_log_file()
            _log_file.write_text("[]")
    else:
        # Remove logs for specific audit_id
        logs = get_logs()
        filtered_logs = [log for log in logs if log.get("auditId") != audit_id]
        with _log_lock:
            _ensure_log_file()
            _log_file.write_text(json.dumps(filtered_logs, indent=2))
