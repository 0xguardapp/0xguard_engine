"""
Example usage of Integrated Judge Agent.

This demonstrates how to use the IntegratedJudgeAgent to monitor attacks,
verify exploits, and trigger bounties in a complete workflow.
"""
import asyncio
from datetime import datetime
from judge_agent_main import IntegratedJudgeAgent
from config import get_config


async def example_workflow():
    """Example complete workflow."""
    
    # Initialize with default config (loads from environment)
    judge = IntegratedJudgeAgent()
    
    print("="*60)
    print("Integrated Judge Agent - Example Workflow")
    print("="*60 + "\n")
    
    # Example 1: Monitor an attack
    print("1. Monitoring attack...")
    event_id = await judge.monitor_attack(
        red_team_id="red_team_alpha",
        target_id="target_vulnerable_app",
        attack_data={
            "exploit_type": "sql_injection",
            "payload": "' OR '1'='1",
            "timestamp": datetime.now()
        }
    )
    print(f"   ✅ Event ID: {event_id['event_id']}\n")
    
    # Example 2: Process successful attack result
    print("2. Processing attack result (successful exploit)...")
    result = await judge.process_attack_result(
        event_id["event_id"],
        {
            "success": True,
            "secret_key": judge.config.TARGET_SECRET_KEY,  # Correct secret key
            "timestamp": datetime.now()
        }
    )
    
    if result.get("success"):
        print(f"   ✅ Bounty paid: {result['bounty_paid']} tokens")
        print(f"   📝 TX Hash: {result['tx_hash']}")
        print(f"   🎯 Severity: {result['severity']}\n")
    else:
        print(f"   ❌ Rejected: {result.get('reason', result.get('error'))}\n")
    
    # Example 3: Process failed attack
    print("3. Monitoring another attack...")
    event_id2 = await judge.monitor_attack(
        red_team_id="red_team_beta",
        target_id="target_secure_app",
        attack_data={
            "exploit_type": "xss",
            "payload": "<script>alert('xss')</script>",
            "timestamp": datetime.now()
        }
    )
    print(f"   ✅ Event ID: {event_id2['event_id']}\n")
    
    print("4. Processing attack result (failed exploit)...")
    result2 = await judge.process_attack_result(
        event_id2["event_id"],
        {
            "success": False,
            "secret_key": None,
            "timestamp": datetime.now()
        }
    )
    
    if not result2.get("success"):
        print(f"   ❌ Rejected: {result2.get('reason', result2.get('error'))}\n")
    
    # Example 4: Get statistics
    print("5. Getting statistics...")
    stats = await judge.get_statistics()
    print(f"   Attacks monitored: {stats['attacks_monitored']}")
    print(f"   Exploits verified: {stats['exploits_verified']}")
    print(f"   Bounties paid: {stats['bounties_paid']}")
    print(f"   Total bounty amount: {stats['total_bounty_amount']} tokens\n")
    
    # Example 5: Get Red Team earnings
    print("6. Getting Red Team earnings...")
    earnings = await judge.get_red_team_earnings("red_team_alpha")
    print(f"   Total earned: {earnings['total_earned']} tokens")
    print(f"   Bounty count: {earnings['bounty_count']}")
    print(f"   Average bounty: {earnings['avg_bounty']} tokens\n")
    
    # Flush logs and shutdown
    await judge.flush_logs()
    await judge.shutdown()
    
    print("="*60)
    print("Example workflow complete!")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(example_workflow())

