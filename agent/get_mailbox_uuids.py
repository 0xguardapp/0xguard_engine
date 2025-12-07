#!/usr/bin/env python3
"""
Script to get mailbox UUIDs for all three agents from AgentVerse API
"""
import sys
import httpx
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from judge import create_judge_agent
from target import create_target_agent
from red_team import create_red_team_agent
from config import get_config


async def get_mailbox_uuid(agent_address: str, agent_name: str, api_key: str = None) -> dict:
    """
    Get mailbox UUID for an agent from AgentVerse API.
    
    Args:
        agent_address: The agent's address
        agent_name: Name of the agent (for display)
        api_key: AgentVerse API key for authentication
        
    Returns:
        dict with agent_name, address, and mailbox_uuid
    """
    url = f"https://agentverse.ai/v2/agents/{agent_address}/mailbox/uuid"
    
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                mailbox_uuid = data.get("mailbox_uuid") or data.get("uuid") or data.get("mailbox") or str(data)
                return {
                    "agent": agent_name,
                    "address": agent_address,
                    "mailbox_uuid": mailbox_uuid,
                    "status": "success",
                    "full_response": data
                }
            else:
                return {
                    "agent": agent_name,
                    "address": agent_address,
                    "mailbox_uuid": None,
                    "status": "error",
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
    except Exception as e:
        return {
            "agent": agent_name,
            "address": agent_address,
            "mailbox_uuid": None,
            "status": "error",
            "error": str(e)
        }


async def main():
    """Get mailbox UUIDs for all agents"""
    import asyncio
    
    print("=" * 70)
    print("📬 Getting Mailbox UUIDs from AgentVerse")
    print("=" * 70)
    print()
    
    # Get API key from config
    config = get_config()
    api_key = config.AGENTVERSE_KEY
    
    if not api_key or not api_key.strip():
        print("❌ ERROR: AGENTVERSE_KEY is not configured!")
        print("   Please set AGENTVERSE_KEY in agent/.env file")
        return
    
    print(f"✅ Using AGENTVERSE_KEY: {api_key[:10]}...{api_key[-10:]}")
    print()
    
    # Create agents to get their addresses
    print("🔍 Getting agent addresses...")
    judge = create_judge_agent(port=8002)
    target = create_target_agent(port=8000, judge_address=judge.address)
    red_team = create_red_team_agent(
        target_address=target.address,
        port=8001,
        judge_address=judge.address
    )
    
    judge_addr = judge.address
    target_addr = target.address
    red_team_addr = red_team.address
    
    print(f"✅ Judge Agent:   {judge_addr}")
    print(f"✅ Target Agent:  {target_addr}")
    print(f"✅ Red Team Agent: {red_team_addr}")
    print()
    
    # Get mailbox UUIDs
    print("📡 Fetching mailbox UUIDs from AgentVerse API...")
    print()
    
    results = await asyncio.gather(
        get_mailbox_uuid(judge_addr, "Judge", api_key),
        get_mailbox_uuid(target_addr, "Target", api_key),
        get_mailbox_uuid(red_team_addr, "Red Team", api_key)
    )
    
    # Display results
    print("=" * 70)
    print("📋 Mailbox UUID Results")
    print("=" * 70)
    print()
    
    for result in results:
        agent_name = result["agent"]
        address = result["address"]
        mailbox_uuid = result["mailbox_uuid"]
        status = result["status"]
        
        print(f"🤖 {agent_name} Agent:")
        print(f"   Address: {address}")
        
        if status == "success" and mailbox_uuid:
            print(f"   ✅ Mailbox UUID: {mailbox_uuid}")
            if "full_response" in result:
                print(f"   📦 Full Response: {result['full_response']}")
        else:
            print(f"   ❌ Failed to get mailbox UUID")
            if "error" in result:
                print(f"   Error: {result['error']}")
        print()
    
    # Summary
    successful = sum(1 for r in results if r["status"] == "success" and r["mailbox_uuid"])
    print("=" * 70)
    print(f"📊 Summary: {successful}/3 agents retrieved mailbox UUIDs")
    print("=" * 70)
    
    # Output for .env file
    print()
    print("📝 Add these to your agent/.env file:")
    print()
    for result in results:
        if result["status"] == "success" and result["mailbox_uuid"]:
            agent_name = result["agent"].upper().replace(" ", "_")
            mailbox_uuid = result["mailbox_uuid"]
            print(f"# {result['agent']} Agent Mailbox")
            print(f"{agent_name}_MAILBOX_KEY={mailbox_uuid}")
            print()


if __name__ == "__main__":
    import asyncio
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Cancelled by user")

