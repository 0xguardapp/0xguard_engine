"""
Integrated Judge Agent - Orchestrates complete bounty payout flow.

This module integrates all components:
- JudgeAgent for monitoring and verification
- AuditLogger for Membase audit logging
- Unibase for gasless bounty payouts
- Comprehensive error handling and monitoring
"""
import os
import sys
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List
from pathlib import Path
from dataclasses import dataclass, asdict
import traceback

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "membase"))

from logger import log
from judge_agent import JudgeAgent, AttackData, AttackResult, VerificationResult, BountyResult
from unibase import save_bounty_token
from config import Config, get_config

# Try to import AuditLogger
try:
    from audit_logger import AuditLogger, AttackEvent, VerificationEvent, PayoutEvent
    AUDIT_LOGGER_AVAILABLE = True
except ImportError:
    AUDIT_LOGGER_AVAILABLE = False
    AuditLogger = None
    AttackEvent = None
    VerificationEvent = None
    PayoutEvent = None


class IntegratedJudgeAgent:
    """
    Integrated Judge Agent that orchestrates the complete bounty payout flow.
    
    This class integrates:
    - JudgeAgent for monitoring and verification
    - AuditLogger for Membase audit logging
    - Unibase for gasless bounty payouts
    - Comprehensive error handling and monitoring
    """
    
    def __init__(self, config: Optional[Config] = None):
        """
        Initialize Integrated Judge Agent.
        
        Args:
            config: Configuration object (loads from env if None)
        """
        self.config = config or get_config()
        
        # Validate configuration
        try:
            self.config.validate()
        except ValueError as e:
            log("JudgeAgent", f"Configuration validation warning: {str(e)}", "⚖️", "warning")
        
        log("JudgeAgent", "Initializing Integrated Judge Agent...", "⚖️", "info")
        
        # Initialize JudgeAgent core
        # Get bounty rates from config
        bounty_rates = {
            "low": self.config.BOUNTY_LOW,
            "medium": self.config.BOUNTY_MEDIUM,
            "high": self.config.BOUNTY_HIGH,
            "critical": self.config.BOUNTY_CRITICAL
        }
        
        # Get verification rules from config
        verification_rules = {
            "max_age_minutes": self.config.EXPLOIT_TIMEOUT_MINUTES,
            "require_secret_key": True,  # Default
            "prevent_replay": True,  # Default
            "min_severity": "low"  # Default
        }
        
        judge_config = {
            "agent_id": "judge_agent_main",
            "secret_key": self.config.TARGET_SECRET_KEY,
            "unibase_config": {
                "enabled": True  # Default enabled
            },
            "membase_config": {
                "enabled": bool(self.config.MEMBASE_ACCOUNT)  # Enable if account is set
            },
            "bounty_rates": bounty_rates,
            "verification_rules": verification_rules
        }
        
        self.judge = JudgeAgent(judge_config)
        
        # Initialize AuditLogger if available
        self.audit_logger: Optional[AuditLogger] = None
        if AUDIT_LOGGER_AVAILABLE and self.config.MEMBASE_ACCOUNT:
            try:
                self.audit_logger = AuditLogger(
                    membase_account=self.config.MEMBASE_ACCOUNT,
                    conversation_id=self.config.MEMBASE_CONVERSATION_ID,
                    membase_id=self.config.MEMBASE_ID
                )
                log("JudgeAgent", "AuditLogger initialized", "💾", "info")
            except Exception as e:
                log("JudgeAgent", f"Failed to initialize AuditLogger: {str(e)}", "💾", "error")
                self.audit_logger = None
        else:
            log("JudgeAgent", "AuditLogger not available or disabled", "💾", "warning")
        
        # Active attacks tracking
        self.active_attacks: Dict[str, Dict[str, Any]] = {}
        
        # Statistics
        self.stats = {
            "attacks_monitored": 0,
            "exploits_verified": 0,
            "bounties_paid": 0,
            "total_bounty_amount": 0,
            "errors": 0,
            "start_time": datetime.now()
        }
        
        log("JudgeAgent", "Integrated Judge Agent initialized successfully", "⚖️", "info")
    
    async def monitor_attack(
        self,
        red_team_id: str,
        target_id: str,
        attack_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Monitor an ongoing attack and capture results.
        
        Args:
            red_team_id: Red Team identifier
            target_id: Target system identifier
            attack_data: Attack data dictionary with:
                - exploit_type: str
                - payload: str
                - timestamp: datetime (optional)
        
        Returns:
            dict: Monitoring result with event_id and status
        """
        try:
            log("JudgeAgent", f"Monitoring attack: {red_team_id} → {target_id}", "⚖️", "info")
            
            # Prepare attack data
            timestamp = attack_data.get("timestamp", datetime.now())
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp)
            
            attack = AttackData(
                exploit_type=attack_data.get("exploit_type", "unknown"),
                payload=attack_data.get("payload", ""),
                timestamp=timestamp
            )
            
            # Monitor via JudgeAgent
            monitor_result = await self.judge.monitor_attack(
                red_team_id=red_team_id,
                target_id=target_id,
                attack_data=attack
            )
            
            # Generate event ID
            event_id = self._generate_event_id("attack", red_team_id, target_id)
            
            # Store in active attacks
            self.active_attacks[event_id] = {
                "red_team_id": red_team_id,
                "target_id": target_id,
                "attack_data": attack_data,
                "monitor_result": monitor_result,
                "timestamp": timestamp,
                "status": "monitoring"
            }
            
            # Log to AuditLogger if available
            if self.audit_logger:
                try:
                    await self.audit_logger.log_attack_attempt({
                        "red_team_id": red_team_id,
                        "target_id": target_id,
                        "attack_type": attack.exploit_type,
                        "timestamp": timestamp,
                        "success": False  # Will be updated when result comes in
                    })
                except Exception as e:
                    log("JudgeAgent", f"Failed to log attack to AuditLogger: {str(e)}", "💾", "error")
            
            self.stats["attacks_monitored"] += 1
            
            return {
                "event_id": event_id,
                "status": "monitoring",
                "red_team_id": red_team_id,
                "target_id": target_id
            }
            
        except Exception as e:
            self.stats["errors"] += 1
            error_msg = f"Error monitoring attack: {str(e)}"
            log("JudgeAgent", error_msg, "⚖️", "error")
            log("JudgeAgent", traceback.format_exc(), "⚖️", "error")
            return {
                "event_id": None,
                "status": "error",
                "error": error_msg
            }
    
    async def process_attack_result(
        self,
        event_id: str,
        attack_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process attack result and trigger bounty if valid.
        
        Args:
            event_id: Event ID from monitor_attack
            attack_result: Attack result dictionary with:
                - success: bool
                - secret_key: str (optional)
                - timestamp: datetime (optional)
        
        Returns:
            dict: Processing result with success status and details
        """
        try:
            log("JudgeAgent", f"Processing attack result for event: {event_id}", "⚖️", "info")
            
            # Check if event exists
            if event_id not in self.active_attacks:
                error_msg = f"Unknown attack event: {event_id}"
                log("JudgeAgent", error_msg, "⚖️", "error")
                return {
                    "success": False,
                    "error": error_msg
                }
            
            attack_info = self.active_attacks[event_id]
            red_team_id = attack_info["red_team_id"]
            target_id = attack_info["target_id"]
            attack_data = attack_info["attack_data"]
            
            # Prepare attack result for verification
            timestamp = attack_result.get("timestamp", datetime.now())
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp)
            
            result = AttackResult(
                success=attack_result.get("success", False),
                secret_key=attack_result.get("secret_key"),
                target_id=target_id,
                exploit_details={
                    "exploit_type": attack_data.get("exploit_type", "unknown"),
                    "payload": attack_data.get("payload", ""),
                    "timestamp": timestamp.isoformat()
                }
            )
            
            # Step 1: Verify exploit
            log("JudgeAgent", "Verifying exploit...", "⚖️", "info")
            verification = self.judge.verify_exploit(result)
            
            # Log verification to AuditLogger
            if self.audit_logger:
                try:
                    await self.audit_logger.log_exploit_verification({
                        "exploit_id": event_id,
                        "is_valid": verification.is_valid,
                        "severity": verification.severity,
                        "secret_key_match": (
                            verification.is_valid and
                            result.secret_key == self.config.secret_key
                        ),
                        "verification_time": datetime.now(),
                        "target_id": target_id
                    })
                except Exception as e:
                    log("JudgeAgent", f"Failed to log verification: {str(e)}", "💾", "error")
            
            if not verification.is_valid:
                log("JudgeAgent", f"Exploit verification failed: {verification.reason}", "⚖️", "warning")
                attack_info["status"] = "rejected"
                attack_info["rejection_reason"] = verification.reason
                return {
                    "success": False,
                    "reason": verification.reason,
                    "severity": verification.severity
                }
            
            self.stats["exploits_verified"] += 1
            log("JudgeAgent", f"Exploit verified: {verification.severity} severity", "⚖️", "info")
            
            # Step 2: Trigger bounty payout
            log("JudgeAgent", f"Triggering bounty: {verification.bounty_amount} tokens", "⚖️", "info")
            
            bounty_result = await self.judge.trigger_bounty(
                red_team_id=red_team_id,
                bounty_amount=verification.bounty_amount,
                exploit_data=result.exploit_details
            )
            
            if not bounty_result.success:
                error_msg = f"Failed to trigger bounty payout"
                log("JudgeAgent", error_msg, "⚖️", "error")
                attack_info["status"] = "bounty_failed"
                return {
                    "success": False,
                    "error": error_msg,
                    "severity": verification.severity
                }
            
            # Step 3: Log payout to AuditLogger
            if self.audit_logger:
                try:
                    await self.audit_logger.log_bounty_payout({
                        "bounty_id": f"bounty_{event_id}",
                        "red_team_id": red_team_id,
                        "amount": verification.bounty_amount,
                        "tx_hash": bounty_result.tx_hash,
                        "status": "confirmed" if bounty_result.success else "failed",
                        "timestamp": datetime.now(),
                        "exploit_id": event_id
                    })
                except Exception as e:
                    log("JudgeAgent", f"Failed to log payout: {str(e)}", "💾", "error")
            
            # Update statistics
            self.stats["bounties_paid"] += 1
            self.stats["total_bounty_amount"] += verification.bounty_amount
            
            # Cleanup
            attack_info["status"] = "completed"
            attack_info["bounty_paid"] = verification.bounty_amount
            attack_info["tx_hash"] = bounty_result.tx_hash
            
            log("JudgeAgent", f"✅ Bounty paid: {verification.bounty_amount} tokens", "⚖️", "info")
            log("JudgeAgent", f"📝 TX Hash: {bounty_result.tx_hash}", "⚖️", "info")
            
            return {
                "success": True,
                "bounty_paid": verification.bounty_amount,
                "tx_hash": bounty_result.tx_hash,
                "severity": verification.severity,
                "event_id": event_id
            }
            
        except Exception as e:
            self.stats["errors"] += 1
            error_msg = f"Error processing attack result: {str(e)}"
            log("JudgeAgent", error_msg, "⚖️", "error")
            log("JudgeAgent", traceback.format_exc(), "⚖️", "error")
            return {
                "success": False,
                "error": error_msg
            }
    
    def _generate_event_id(self, event_type: str, red_team_id: str, target_id: str) -> str:
        """
        Generate unique event ID.
        
        Args:
            event_type: Type of event
            red_team_id: Red Team identifier
            target_id: Target identifier
        
        Returns:
            str: Unique event ID
        """
        import hashlib
        import uuid
        
        unique_str = f"{event_type}_{red_team_id}_{target_id}_{datetime.now().isoformat()}_{uuid.uuid4().hex[:8]}"
        return f"evt_{hashlib.sha256(unique_str.encode()).hexdigest()[:16]}"
    
    async def get_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive statistics.
        
        Returns:
            dict: Statistics including attacks, bounties, errors, etc.
        """
        judge_stats = self.judge.get_statistics()
        
        uptime = (datetime.now() - self.stats["start_time"]).total_seconds()
        
        return {
            **judge_stats,
            **self.stats,
            "uptime_seconds": int(uptime),
            "uptime_hours": round(uptime / 3600, 2),
            "active_attacks": len(self.active_attacks),
            "audit_logger_enabled": self.audit_logger is not None
        }
    
    async def get_red_team_earnings(
        self,
        red_team_id: str,
        timeframe: Optional[timedelta] = None
    ) -> Dict[str, Any]:
        """
        Get Red Team earnings statistics.
        
        Args:
            red_team_id: Red Team identifier
            timeframe: Optional time delta for filtering
        
        Returns:
            dict: Earnings statistics
        """
        if self.audit_logger:
            try:
                return await self.audit_logger.get_red_team_earnings(red_team_id, timeframe)
            except Exception as e:
                log("JudgeAgent", f"Error getting earnings: {str(e)}", "⚖️", "error")
        
        # Fallback: calculate from active attacks
        total = sum(
            attack.get("bounty_paid", 0)
            for attack in self.active_attacks.values()
            if attack.get("red_team_id") == red_team_id and attack.get("status") == "completed"
        )
        
        return {
            "total_earned": total,
            "bounty_count": sum(
                1 for attack in self.active_attacks.values()
                if attack.get("red_team_id") == red_team_id and attack.get("status") == "completed"
            ),
            "avg_bounty": total / max(1, sum(
                1 for attack in self.active_attacks.values()
                if attack.get("red_team_id") == red_team_id and attack.get("status") == "completed"
            )),
            "last_payout": None
        }
    
    async def get_attack_statistics(self, target_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get attack statistics.
        
        Args:
            target_id: Optional target ID to filter by
        
        Returns:
            dict: Attack statistics
        """
        if self.audit_logger:
            try:
                return await self.audit_logger.get_attack_statistics(target_id)
            except Exception as e:
                log("JudgeAgent", f"Error getting attack stats: {str(e)}", "⚖️", "error")
        
        # Fallback: calculate from active attacks
        attacks = [
            attack for attack in self.active_attacks.values()
            if target_id is None or attack.get("target_id") == target_id
        ]
        
        return {
            "total_attacks": len(attacks),
            "success_rate": 0.0,
            "vulnerability_types": {},
            "total_bounties_paid": sum(
                attack.get("bounty_paid", 0) for attack in attacks
                if attack.get("status") == "completed"
            ),
            "top_red_teams": []
        }
    
    async def flush_logs(self) -> None:
        """Flush all pending logs."""
        if self.audit_logger:
            try:
                await self.audit_logger.flush()
            except Exception as e:
                log("JudgeAgent", f"Error flushing logs: {str(e)}", "💾", "error")
    
    async def shutdown(self) -> None:
        """Gracefully shutdown the agent."""
        log("JudgeAgent", "Shutting down Integrated Judge Agent...", "⚖️", "info")
        
        # Flush all logs
        await self.flush_logs()
        
        # Print final statistics
        stats = await self.get_statistics()
        log("JudgeAgent", f"Final statistics: {json.dumps(stats, indent=2, default=str)}", "⚖️", "info")
        
        log("JudgeAgent", "Shutdown complete", "⚖️", "info")


# Main execution
async def main():
    """Main execution function."""
    try:
        # Load configuration
        config = get_config()
        
        # Validate configuration (optional - will warn but not fail)
        try:
            config.validate()
        except ValueError as e:
            log("JudgeAgent", f"Configuration warning: {str(e)}", "⚖️", "warning")
            log("JudgeAgent", "Continuing with default values...", "⚖️", "info")
        
        # Initialize Judge Agent
        judge = IntegratedJudgeAgent(config)
        
        log("JudgeAgent", "🔍 Judge Agent initialized", "⚖️", "info")
        log("JudgeAgent", "⏳ Monitoring for attacks...", "⚖️", "info")
        
        # Example attack flow
        print("\n" + "="*60)
        print("Example Attack Flow")
        print("="*60 + "\n")
        
        # Monitor an attack
        event_id = await judge.monitor_attack(
            red_team_id="red_team_alpha",
            target_id="target_vulnerable_app",
            attack_data={
                "exploit_type": "sql_injection",
                "payload": "' OR '1'='1",
                "timestamp": datetime.now()
            }
        )
        
        print(f"✅ Attack monitored: {event_id['event_id']}")
        
        # Simulate attack completion
        await asyncio.sleep(1)  # Simulate processing time
        
        attack_result = {
            "success": True,
            "secret_key": config.secret_key,  # Use configured secret key
            "timestamp": datetime.now()
        }
        
        # Process attack result
        result = await judge.process_attack_result(event_id["event_id"], attack_result)
        
        if result.get("success"):
            print(f"\n✅ Bounty paid: {result['bounty_paid']} tokens")
            print(f"📝 TX Hash: {result['tx_hash']}")
            print(f"🎯 Severity: {result['severity']}")
        else:
            print(f"\n❌ Attack rejected: {result.get('reason', result.get('error', 'Unknown error'))}")
        
        # Print statistics
        print("\n" + "="*60)
        print("Statistics")
        print("="*60 + "\n")
        stats = await judge.get_statistics()
        print(json.dumps(stats, indent=2, default=str))
        
        # Get Red Team earnings
        print("\n" + "="*60)
        print("Red Team Earnings")
        print("="*60 + "\n")
        earnings = await judge.get_red_team_earnings("red_team_alpha")
        print(json.dumps(earnings, indent=2, default=str))
        
        # Shutdown
        await judge.shutdown()
        
    except KeyboardInterrupt:
        log("JudgeAgent", "Interrupted by user", "⚖️", "info")
    except Exception as e:
        log("JudgeAgent", f"Fatal error: {str(e)}", "⚖️", "error")
        log("JudgeAgent", traceback.format_exc(), "⚖️", "error")
        raise


if __name__ == "__main__":
    asyncio.run(main())

