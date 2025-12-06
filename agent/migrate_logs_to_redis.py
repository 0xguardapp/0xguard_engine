#!/usr/bin/env python3
"""
Migration script to migrate logs.json to Redis.

This script reads existing logs from logs.json and migrates them to Redis,
preserving structure and timestamps. Logs are stored with audit_id grouping
if available, otherwise in the global logs key.

Usage:
    python migrate_logs_to_redis.py [--dry-run] [--clear-redis]
"""
import json
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Any

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from redis_client import (
        is_redis_available,
        append_log as redis_append_log,
        clear_logs as redis_clear_logs,
        get_log_count
    )
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("ERROR: redis_client module not found. Please ensure Redis dependencies are installed.")
    sys.exit(1)


def load_logs_from_file(logs_path: Path) -> List[Dict[str, Any]]:
    """
    Load logs from logs.json file.
    
    Args:
        logs_path: Path to logs.json file
        
    Returns:
        List of log entries
    """
    if not logs_path.exists():
        print(f"Logs file not found: {logs_path}")
        return []
    
    try:
        with open(logs_path, 'r') as f:
            content = f.read().strip()
            if not content:
                return []
            logs = json.loads(content)
            if not isinstance(logs, list):
                print(f"WARNING: logs.json does not contain an array, got {type(logs)}")
                return []
            return logs
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse logs.json: {e}")
        return []
    except Exception as e:
        print(f"ERROR: Failed to read logs.json: {e}")
        return []


def migrate_logs(logs: List[Dict[str, Any]], dry_run: bool = False) -> Dict[str, int]:
    """
    Migrate logs to Redis.
    
    Args:
        logs: List of log entries to migrate
        dry_run: If True, don't actually write to Redis
        
    Returns:
        Dictionary with migration statistics
    """
    stats = {
        "total": len(logs),
        "migrated": 0,
        "skipped": 0,
        "errors": 0,
        "by_audit_id": {}
    }
    
    if not logs:
        print("No logs to migrate.")
        return stats
    
    print(f"Migrating {len(logs)} log entries...")
    
    for i, log_entry in enumerate(logs, 1):
        try:
            # Extract audit_id if present
            audit_id = log_entry.get("audit_id")
            
            if not dry_run:
                # Append to Redis
                if redis_append_log(log_entry, audit_id=audit_id):
                    stats["migrated"] += 1
                    if audit_id:
                        stats["by_audit_id"][audit_id] = stats["by_audit_id"].get(audit_id, 0) + 1
                else:
                    stats["errors"] += 1
                    print(f"WARNING: Failed to migrate log entry {i}")
            else:
                # Dry run - just count
                stats["migrated"] += 1
                if audit_id:
                    stats["by_audit_id"][audit_id] = stats["by_audit_id"].get(audit_id, 0) + 1
            
            if i % 100 == 0:
                print(f"  Processed {i}/{len(logs)} entries...")
                
        except Exception as e:
            stats["errors"] += 1
            print(f"ERROR: Failed to migrate log entry {i}: {e}")
    
    return stats


def main():
    """Main migration function."""
    parser = argparse.ArgumentParser(
        description="Migrate logs.json to Redis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run (test migration without writing)
  python migrate_logs_to_redis.py --dry-run
  
  # Migrate logs to Redis
  python migrate_logs_to_redis.py
  
  # Clear Redis first, then migrate
  python migrate_logs_to_redis.py --clear-redis
        """
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Test migration without writing to Redis"
    )
    parser.add_argument(
        "--clear-redis",
        action="store_true",
        help="Clear existing Redis logs before migration"
    )
    parser.add_argument(
        "--logs-file",
        type=str,
        default=None,
        help="Path to logs.json file (default: ../logs.json)"
    )
    
    args = parser.parse_args()
    
    # Check Redis availability
    if not REDIS_AVAILABLE:
        print("ERROR: Redis client not available")
        sys.exit(1)
    
    if not is_redis_available():
        print("ERROR: Redis is not available. Please ensure Redis is running and configured.")
        sys.exit(1)
    
    print("✓ Redis connection verified")
    
    # Determine logs file path
    if args.logs_file:
        logs_path = Path(args.logs_file)
    else:
        logs_path = Path(__file__).parent.parent / "logs.json"
    
    print(f"Reading logs from: {logs_path}")
    
    # Load logs from file
    logs = load_logs_from_file(logs_path)
    
    if not logs:
        print("No logs found to migrate.")
        sys.exit(0)
    
    print(f"Found {len(logs)} log entries")
    
    # Clear Redis if requested
    if args.clear_redis and not args.dry_run:
        print("Clearing existing Redis logs...")
        redis_clear_logs()
        print("✓ Redis logs cleared")
    
    # Migrate logs
    if args.dry_run:
        print("\n[DRY RUN] Would migrate the following logs:")
    else:
        print("\nMigrating logs to Redis...")
    
    stats = migrate_logs(logs, dry_run=args.dry_run)
    
    # Print statistics
    print("\n" + "="*50)
    print("Migration Statistics:")
    print("="*50)
    print(f"Total entries:     {stats['total']}")
    print(f"Migrated:          {stats['migrated']}")
    print(f"Skipped:           {stats['skipped']}")
    print(f"Errors:            {stats['errors']}")
    
    if stats['by_audit_id']:
        print(f"\nBy audit_id:")
        for audit_id, count in stats['by_audit_id'].items():
            print(f"  {audit_id}: {count} entries")
    
    if not args.dry_run:
        # Verify migration
        print("\nVerifying migration...")
        total_in_redis = get_log_count()
        print(f"Total logs in Redis: {total_in_redis}")
        
        if stats['migrated'] > 0:
            print("\n✓ Migration completed successfully!")
        else:
            print("\n⚠ No logs were migrated. Check for errors above.")
    else:
        print("\n[DRY RUN] No changes made. Run without --dry-run to perform migration.")
    
    print("="*50)


if __name__ == "__main__":
    main()

