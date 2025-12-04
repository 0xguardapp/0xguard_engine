"""
Judge Agent - Monitors security testing and triggers bounties.

This module provides a class-based JudgeAgent implementation that:
- Monitors Red Team agent attacks on Target systems
- Verifies successful exploits (SECRET_KEY extraction)
- Triggers gasless bounty payouts via Unibase
- Logs all activities to Membase
- Handles edge cases and errors with comprehensive security measures
"""
import os
import sys
import json
import asyncio
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum

# Add agent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from logger import log
from unibase import save_bounty_token
from mcp_helper import save_mcp_message, get_mcp_messages, MEMBASE_ENABLED


class Severity(Enum):
    """Vulnerability severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AttackData:
    """Attack data structure."""
    exploit_type: str
    payload: str
    timestamp: datetime


@dataclass
class AttackResult:
    """Attack result structure."""
    success: bool
    secret_key: Optional[str]
    target_id: str
    exploit_details: Dict[str, Any]


@dataclass
class VerificationResult:
    """Exploit verification result."""
    is_valid: bool
    severity: str
    bounty_amount: int
    reason: str


@dataclass
class BountyResult:
    """Bounty payout result."""
    success: bool
    tx_hash: str
    bounty_paid: int
    recipient: str
    timestamp: datetime


class JudgeAgent:
    """
    Judge Agent that monitors security testing and triggers bounties.
    
    This agent monitors Red Team attacks, verifies successful exploits,
    and triggers gasless bounty payouts via Unibase while logging all
    activities to Membase.
    
    Attributes:
        agent_id: Unique identifier for the judge agent
        unibase_client: Unibase client for bounty transactions
        membase_client: Membase client for logging
        bounty_rates: Dictionary mapping severity to bounty amounts
        verification_rules: Rules for exploit validation
        attack_history: History of monitored attacks
        bounty_history: History of bounties paid
        rate_limits: Rate limiting tracking
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize JudgeAgent with configuration.
        
        Args:
            config: Configuration dictionary containing:
                - agent_id: str (unique identifier)
                - unibase_config: dict (Unibase credentials/config)
                - membase_config: dict (Membase connection config)
                - bounty_rates: dict (severity -> amount mapping)
                - verification_rules: dict (validation rules)
                - secret_key: str (target's actual SECRET_KEY for verification)
        """
        self.agent_id = config.get("agent_id", "judge_agent_default")
        self.secret_key = config.get("secret_key", "fetch_ai_2024")
        
        # Initialize Unibase client (using existing unibase module)
        self.unibase_enabled = config.get("unibase_config", {}).get("enabled", True)
        
        # Initialize Membase client (using existing mcp_helper module)
        self.membase_enabled = config.get("membase_config", {}).get("enabled", MEMBASE_ENABLED)
        
        # Bounty rates configuration (tokens per severity level)
        self.bounty_rates = config.get("bounty_rates", {
            "low": 50,
            "medium": 150,
            "high": 300,
            "critical": 500
        })
        
        # Verification rules
        self.verification_rules = config.get("verification_rules", {
            "max_age_minutes": 5,  # Attack must be recent (<5 min)
            "require_secret_key": True,  # Must extract SECRET_KEY
            "prevent_replay": True,  # Prevent duplicate submissions
            "min_severity": "low"  # Minimum severity to award bounty
        })
        
        # Attack and bounty tracking
        self.attack_history: Dict[str, List[Dict[str, Any]]] = {}  # red_team_id -> [attacks]
        self.bounty_history: List[Dict[str, Any]] = []
        self.verified_exploits: set = set()  # Track verified exploit hashes
        
        # Rate limiting tracking
        self.rate_limits: Dict[str, Dict[str, Any]] = {}  # red_team_id -> {count, window_start, last_submission}
        
        # Security limits
        self.max_bounties_per_hour = 10
        self.cooldown_seconds = 120  # 2 minutes
        self.max_single_bounty = 1000
        self.daily_cap = 10000
        
        # Daily tracking
        self.daily_bounty_total = 0
        self.daily_reset_date = datetime.now().date()
        
        log("JudgeAgent", f"Initialized: {self.agent_id}", "⚖️", "info")
    
    def _reset_daily_tracking(self) -> None:
        """Reset daily bounty tracking if new day."""
        today = datetime.now().date()
        if today > self.daily_reset_date:
            self.daily_bounty_total = 0
            self.daily_reset_date = today
            log("JudgeAgent", "Daily bounty tracking reset", "⚖️", "info")
    
    def _check_rate_limit(self, red_team_id: str) -> tuple[bool, str]:
        """
        Check if Red Team has exceeded rate limits.
        
        Args:
            red_team_id: Red Team identifier
            
        Returns:
            tuple: (allowed, reason)
        """
        now = datetime.now()
        
        # Initialize rate limit tracking for this Red Team
        if red_team_id not in self.rate_limits:
            self.rate_limits[red_team_id] = {
                "count": 0,
                "window_start": now,
                "last_submission": None
            }
        
        limits = self.rate_limits[red_team_id]
        
        # Check hourly limit
        time_since_window = (now - limits["window_start"]).total_seconds()
        if time_since_window >= 3600:  # Reset hourly window
            limits["count"] = 0
            limits["window_start"] = now
        
        if limits["count"] >= self.max_bounties_per_hour:
            return False, f"Rate limit exceeded: {limits['count']}/{self.max_bounties_per_hour} bounties per hour"
        
        # Check cooldown
        if limits["last_submission"]:
            time_since_last = (now - limits["last_submission"]).total_seconds()
            if time_since_last < self.cooldown_seconds:
                remaining = int(self.cooldown_seconds - time_since_last)
                return False, f"Cooldown active: {remaining} seconds remaining"
        
        return True, "OK"
    
    def _update_rate_limit(self, red_team_id: str) -> None:
        """Update rate limit tracking after successful bounty."""
        if red_team_id not in self.rate_limits:
            self.rate_limits[red_team_id] = {
                "count": 0,
                "window_start": datetime.now(),
                "last_submission": None
            }
        
        self.rate_limits[red_team_id]["count"] += 1
        self.rate_limits[red_team_id]["last_submission"] = datetime.now()
    
    async def monitor_attack(
        self,
        red_team_id: str,
        target_id: str,
        attack_data: AttackData
    ) -> Dict[str, Any]:
        """
        Monitor attack execution and capture target response.
        
        Args:
            red_team_id: Red Team agent identifier
            target_id: Target system identifier
            attack_data: Attack data containing exploit_type, payload, timestamp
            
        Returns:
            dict: Verification result with status and details
        """
        log("JudgeAgent", f"Monitoring attack: {red_team_id} → {target_id}", "⚖️", "info")
        log("JudgeAgent", f"Exploit type: {attack_data.exploit_type}, Payload: {attack_data.payload[:50]}...", "⚖️", "info")
        
        # Track attack in history
        if red_team_id not in self.attack_history:
            self.attack_history[red_team_id] = []
        
        attack_record = {
            "red_team_id": red_team_id,
            "target_id": target_id,
            "exploit_type": attack_data.exploit_type,
            "payload": attack_data.payload,
            "timestamp": attack_data.timestamp.isoformat(),
            "status": "monitored"
        }
        
        self.attack_history[red_team_id].append(attack_record)
        
        # Keep only last 100 attacks per Red Team
        if len(self.attack_history[red_team_id]) > 100:
            self.attack_history[red_team_id] = self.attack_history[red_team_id][-100:]
        
        # Log to Membase
        await self.log_to_membase({
            "event_type": "attack",
            "red_team_id": red_team_id,
            "target_id": target_id,
            "exploit_type": attack_data.exploit_type,
            "payload": attack_data.payload,
            "timestamp": attack_data.timestamp.isoformat()
        })
        
        return {
            "status": "monitored",
            "red_team_id": red_team_id,
            "target_id": target_id,
            "attack_timestamp": attack_data.timestamp.isoformat()
        }
    
    def verify_exploit(self, attack_result: AttackResult) -> VerificationResult:
        """
        Verify if exploit is valid and authentic.
        
        Args:
            attack_result: Attack result containing success, secret_key, target_id, exploit_details
            
        Returns:
            VerificationResult: Verification result with validity, severity, bounty amount, and reason
        """
        log("JudgeAgent", f"Verifying exploit for target: {attack_result.target_id}", "⚖️", "info")
        
        # Check if attack was successful
        if not attack_result.success:
            return VerificationResult(
                is_valid=False,
                severity="low",
                bounty_amount=0,
                reason="Attack was not successful"
            )
        
        # Verify SECRET_KEY extraction
        if self.verification_rules.get("require_secret_key", True):
            if not attack_result.secret_key:
                return VerificationResult(
                    is_valid=False,
                    severity="low",
                    bounty_amount=0,
                    reason="SECRET_KEY not extracted"
                )
            
            if attack_result.secret_key != self.secret_key:
                return VerificationResult(
                    is_valid=False,
                    severity="low",
                    bounty_amount=0,
                    reason=f"SECRET_KEY mismatch: expected '{self.secret_key}', got '{attack_result.secret_key}'"
                )
        
        # Check for replay attacks
        if self.verification_rules.get("prevent_replay", True):
            exploit_hash = self._hash_exploit(attack_result.exploit_details)
            if exploit_hash in self.verified_exploits:
                return VerificationResult(
                    is_valid=False,
                    severity="low",
                    bounty_amount=0,
                    reason="Duplicate exploit submission (replay attack detected)"
                )
            
            # Mark as verified
            self.verified_exploits.add(exploit_hash)
        
        # Check timestamp (attack must be recent)
        max_age_minutes = self.verification_rules.get("max_age_minutes", 5)
        if "timestamp" in attack_result.exploit_details:
            try:
                attack_time = datetime.fromisoformat(attack_result.exploit_details["timestamp"])
                age_minutes = (datetime.now() - attack_time).total_seconds() / 60
                
                if age_minutes > max_age_minutes:
                    return VerificationResult(
                        is_valid=False,
                        severity="low",
                        bounty_amount=0,
                        reason=f"Attack too old: {age_minutes:.1f} minutes (max: {max_age_minutes} minutes)"
                    )
            except (ValueError, KeyError, TypeError):
                pass  # Continue if timestamp parsing fails
        
        # Determine severity
        severity = self._determine_severity(attack_result.exploit_details)
        
        # Check minimum severity requirement
        min_severity = self.verification_rules.get("min_severity", "low")
        severity_levels = ["low", "medium", "high", "critical"]
        if severity_levels.index(severity) < severity_levels.index(min_severity):
            return VerificationResult(
                is_valid=False,
                severity=severity,
                bounty_amount=0,
                reason=f"Severity '{severity}' below minimum '{min_severity}'"
            )
        
        # Calculate bounty amount
        bounty_amount = self.bounty_rates.get(severity, 0)
        
        # Enforce maximum single bounty
        if bounty_amount > self.max_single_bounty:
            bounty_amount = self.max_single_bounty
            log("JudgeAgent", f"Capping bounty at maximum: {self.max_single_bounty}", "⚖️", "warning")
        
        log("JudgeAgent", f"Exploit verified: {severity} severity, {bounty_amount} tokens", "⚖️", "info")
        
        return VerificationResult(
            is_valid=True,
            severity=severity,
            bounty_amount=bounty_amount,
            reason="Exploit verified successfully"
        )
    
    def _hash_exploit(self, exploit_details: Dict[str, Any]) -> str:
        """
        Generate hash for exploit to detect duplicates.
        
        Args:
            exploit_details: Exploit details dictionary
            
        Returns:
            str: SHA256 hash of exploit
        """
        # Create deterministic hash from exploit details
        hash_input = json.dumps(exploit_details, sort_keys=True).encode()
        return hashlib.sha256(hash_input).hexdigest()
    
    def _determine_severity(self, exploit_details: Dict[str, Any]) -> str:
        """
        Determine exploit severity based on details.
        
        Args:
            exploit_details: Exploit details dictionary
            
        Returns:
            str: Severity level (low/medium/high/critical)
        """
        # Default to high severity for SECRET_KEY extraction
        exploit_type = exploit_details.get("exploit_type", "").lower()
        
        if "secret_key" in exploit_type or "credential" in exploit_type:
            return "critical"
        elif "sql" in exploit_type or "injection" in exploit_type:
            return "high"
        elif "xss" in exploit_type or "csrf" in exploit_type:
            return "medium"
        else:
            return "high"  # Default to high for unknown types
    
    async def trigger_bounty(
        self,
        red_team_id: str,
        bounty_amount: int,
        exploit_data: Dict[str, Any]
    ) -> BountyResult:
        """
        Trigger gasless bounty payout via Unibase.
        
        Args:
            red_team_id: Red Team identifier receiving bounty
            bounty_amount: Bounty amount in tokens
            exploit_data: Exploit data dictionary
            
        Returns:
            BountyResult: Bounty payout result with transaction details
        """
        log("JudgeAgent", f"Triggering bounty: {bounty_amount} tokens to {red_team_id[:20]}...", "⚖️", "info")
        
        # Reset daily tracking if needed
        self._reset_daily_tracking()
        
        # Check daily cap
        if self.daily_bounty_total + bounty_amount > self.daily_cap:
            available = self.daily_cap - self.daily_bounty_total
            if available <= 0:
                log("JudgeAgent", f"Daily cap reached: {self.daily_cap} tokens", "⚖️", "error")
                return BountyResult(
                    success=False,
                    tx_hash="",
                    bounty_paid=0,
                    recipient=red_team_id,
                    timestamp=datetime.now()
                )
            else:
                bounty_amount = available
                log("JudgeAgent", f"Reducing bounty to fit daily cap: {bounty_amount} tokens", "⚖️", "warning")
        
        # Check rate limits
        allowed, reason = self._check_rate_limit(red_team_id)
        if not allowed:
            log("JudgeAgent", f"Rate limit check failed: {reason}", "⚖️", "warning")
            return BountyResult(
                success=False,
                tx_hash="",
                bounty_paid=0,
                recipient=red_team_id,
                timestamp=datetime.now()
            )
        
        # Trigger Unibase transaction with retry logic
        tx_hash = ""
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                exploit_string = exploit_data.get("payload", exploit_data.get("exploit_string", ""))
                
                if self.unibase_enabled:
                    tx_hash = await save_bounty_token(
                        recipient_address=red_team_id,
                        exploit_string=exploit_string,
                        use_mcp=None  # Auto-detect Membase usage
                    )
                    
                    if tx_hash and tx_hash != "0x0000...":
                        break  # Success
                
                retry_count += 1
                if retry_count < max_retries:
                    await asyncio.sleep(1)  # Wait 1 second before retry
                    
            except Exception as e:
                log("JudgeAgent", f"Bounty transaction attempt {retry_count + 1} failed: {str(e)}", "⚖️", "error")
                retry_count += 1
                if retry_count < max_retries:
                    await asyncio.sleep(1)
        
        if not tx_hash or tx_hash == "0x0000...":
            log("JudgeAgent", "Failed to trigger bounty after retries", "⚖️", "error")
            return BountyResult(
                success=False,
                tx_hash="",
                bounty_paid=0,
                recipient=red_team_id,
                timestamp=datetime.now()
            )
        
        # Update tracking
        self._update_rate_limit(red_team_id)
        self.daily_bounty_total += bounty_amount
        
        bounty_record = {
            "red_team_id": red_team_id,
            "bounty_amount": bounty_amount,
            "tx_hash": tx_hash,
            "timestamp": datetime.now().isoformat(),
            "exploit_data": exploit_data
        }
        self.bounty_history.append(bounty_record)
        
        # Keep only last 1000 bounties
        if len(self.bounty_history) > 1000:
            self.bounty_history = self.bounty_history[-1000:]
        
        # Log to Membase
        await self.log_to_membase({
            "event_type": "payout",
            "red_team_id": red_team_id,
            "bounty_amount": bounty_amount,
            "tx_hash": tx_hash,
            "timestamp": datetime.now().isoformat(),
            "exploit_data": exploit_data
        })
        
        log("JudgeAgent", f"Bounty paid: {bounty_amount} tokens, TX: {tx_hash}", "⚖️", "info")
        
        return BountyResult(
            success=True,
            tx_hash=tx_hash,
            bounty_paid=bounty_amount,
            recipient=red_team_id,
            timestamp=datetime.now()
        )
    
    async def log_to_membase(self, event_data: Dict[str, Any]) -> bool:
        """
        Log event to Membase.
        
        Args:
            event_data: Event data dictionary containing:
                - event_type: str (attack, verification, payout)
                - timestamp: str (ISO format)
                - red_team_id: str
                - target_id: str (optional)
                - bounty_amount: int (optional)
                - tx_hash: str (optional)
                - exploit_data: dict (optional)
        
        Returns:
            bool: True if logged successfully, False otherwise
        """
        if not self.membase_enabled:
            return False
        
        try:
            event_type = event_data.get("event_type", "unknown")
            timestamp = event_data.get("timestamp", datetime.now().isoformat())
            
            # Format message for Membase
            message_parts = [
                f"EVENT: {event_type.upper()}",
                f"TIMESTAMP: {timestamp}",
                f"JUDGE_ID: {self.agent_id}"
            ]
            
            if "red_team_id" in event_data:
                message_parts.append(f"RED_TEAM: {event_data['red_team_id']}")
            
            if "target_id" in event_data:
                message_parts.append(f"TARGET: {event_data['target_id']}")
            
            if "bounty_amount" in event_data:
                message_parts.append(f"BOUNTY: {event_data['bounty_amount']} tokens")
            
            if "tx_hash" in event_data:
                message_parts.append(f"TX_HASH: {event_data['tx_hash']}")
            
            if "exploit_type" in event_data:
                message_parts.append(f"EXPLOIT_TYPE: {event_data['exploit_type']}")
            
            if "payload" in event_data:
                payload = event_data["payload"]
                if len(payload) > 100:
                    payload = payload[:100] + "..."
                message_parts.append(f"PAYLOAD: {payload}")
            
            message = " | ".join(message_parts)
            
            # Determine conversation ID based on event type
            conversation_id = f"0xguard_{event_type}s"
            
            success = await save_mcp_message(
                content=message,
                msg_type="assistant",
                conversation_id=conversation_id
            )
            
            if success:
                log("JudgeAgent", f"Logged {event_type} event to Membase", "💾", "info")
            else:
                log("JudgeAgent", f"Failed to log {event_type} event to Membase", "💾", "warning")
            
            return success
            
        except Exception as e:
            log("JudgeAgent", f"Error logging to Membase: {str(e)}", "💾", "error")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get judge agent statistics.
        
        Returns:
            dict: Statistics including bounties paid, attacks monitored, etc.
        """
        total_attacks = sum(len(attacks) for attacks in self.attack_history.values())
        total_bounties = len(self.bounty_history)
        total_bounty_amount = sum(b["bounty_amount"] for b in self.bounty_history)
        
        return {
            "agent_id": self.agent_id,
            "total_attacks_monitored": total_attacks,
            "total_bounties_paid": total_bounties,
            "total_bounty_amount": total_bounty_amount,
            "daily_bounty_total": self.daily_bounty_total,
            "daily_cap_remaining": self.daily_cap - self.daily_bounty_total,
            "unique_red_teams": len(self.attack_history),
            "verified_exploits": len(self.verified_exploits)
        }

