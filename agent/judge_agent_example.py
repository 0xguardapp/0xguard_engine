"""
Example usage of JudgeAgent class.

This demonstrates how to initialize and use the JudgeAgent to monitor attacks,
verify exploits, and trigger bounties.
"""
import asyncio
from datetime import datetime
from judge_agent import JudgeAgent, AttackData, AttackResult


async def main():
    """Example usage of JudgeAgent."""
    
    # Configuration for JudgeAgent
    config = {
        "agent_id": "judge_agent_example",
        "secret_key": "fetch_ai_2024",  # Target's actual SECRET_KEY
        "unibase_config": {
            "enabled": True
        },
        "membase_config": {
            "enabled": True  # Will use MEMBASE_ENABLED from environment if not set
        },
        "bounty_rates": {
            "low": 50,
            "medium": 150,
            "high": 300,
            "critical": 500
        },
        "verification_rules": {
            "max_age_minutes": 5,
            "require_secret_key": True,
            "prevent_replay": True,
            "min_severity": "low"
        }
    }
    
    # Initialize JudgeAgent
    judge = JudgeAgent(config)
    
    # Example: Monitor an attack
    red_team_id = "agent1qf2mssnkhf29fk7vj2fy8ekmhdfke0ptu4k9dyvfcuk7tt6easatge9z96d"
    target_id = "target_001"
    
    attack_data = AttackData(
        exploit_type="sql_injection",
        payload="' OR '1'='1",
        timestamp=datetime.now()
    )
    
    print("Monitoring attack...")
    monitor_result = await judge.monitor_attack(red_team_id, target_id, attack_data)
    print(f"Monitor result: {monitor_result}")
    
    # Example: Verify an exploit
    attack_result = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",  # Correct SECRET_KEY
        target_id=target_id,
        exploit_details={
            "exploit_type": "sql_injection",
            "payload": "' OR '1'='1",
            "timestamp": datetime.now().isoformat()
        }
    )
    
    print("\nVerifying exploit...")
    verification = judge.verify_exploit(attack_result)
    print(f"Verification result: {verification}")
    
    # Example: Trigger bounty if verified
    if verification.is_valid:
        print(f"\nTriggering bounty: {verification.bounty_amount} tokens...")
        bounty_result = await judge.trigger_bounty(
            red_team_id=red_team_id,
            bounty_amount=verification.bounty_amount,
            exploit_data=attack_result.exploit_details
        )
        print(f"Bounty result: {bounty_result}")
    
    # Get statistics
    print("\nJudge Agent Statistics:")
    stats = judge.get_statistics()
    for key, value in stats.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())

