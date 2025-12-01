import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

# Thread lock for safe file writing
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
) -> None:
    """
    Write a structured log entry to logs.json.
    
    Args:
        actor: The actor name (e.g., "RedTeam", "Target", "Judge")
        message: The log message
        icon: Emoji icon for the actor
        log_type: Type of log (info, attack, vulnerability, proof, etc.)
        is_vulnerability: If True, highlights the log as a vulnerability
    """
    _ensure_log_file()
    
    timestamp = datetime.now().strftime("%H:%M:%S")
    
    log_entry = {
        "timestamp": timestamp,
        "actor": actor,
        "icon": icon,
        "message": message,
        "type": log_type,
        "is_vulnerability": is_vulnerability,
    }
    
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


def clear_logs() -> None:
    """Clear all logs from logs.json."""
    with _log_lock:
        _log_file.write_text("[]")

