#!/usr/bin/env python3
"""
Script to register a chat agent with Agentverse.
This script properly handles environment variables and allows custom endpoint URLs.
"""
import os
import sys
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from uagents_core.utils.registration import (
    register_chat_agent,
    RegistrationRequestCredentials,
)


def register_agent(
    endpoint_url: str = None,
    agent_name: str = None,
    agent_type: str = "red-team",
    active: bool = True,
    seed_phrase: str = None,
):
    """
    Register an agent with Agentverse.
    
    Args:
        endpoint_url: Custom endpoint URL (e.g., cloudflare tunnel URL).
                     If None, will construct from environment variables.
        agent_name: Name of the agent to register. If None, uses agent_type.
        agent_type: Type of agent - "red-team", "target", or "judge" (default: "red-team")
        active: Whether the agent should be active (default: True)
        seed_phrase: Seed phrase to use. If None, will try to get from environment.
    """
    # Get API key from environment variable
    agentverse_key = os.environ.get("AGENTVERSE_KEY")
    if not agentverse_key:
        print("❌ Error: AGENTVERSE_KEY environment variable is not set")
        print("   Please set it with: export AGENTVERSE_KEY='your_key_here'")
        sys.exit(1)
    
    # Determine agent name
    if not agent_name:
        agent_name = agent_type
    
    # Get seed phrase from environment variable or parameter
    if not seed_phrase:
        seed_phrase = os.environ.get("AGENT_SEED_PHRASE")
        if not seed_phrase:
            # Try agent-specific seed environment variables
            if agent_type == "red-team":
                seed_phrase = os.environ.get("RED_TEAM_SEED", "pq2ZrvsFvLGWIHVDGfriGJHUUD1AvRFI0uB1_A7F7bA")
            elif agent_type == "target":
                seed_phrase = os.environ.get("TARGET_SEED", "mwVACdxiAXOHyXNDIXAGZ7GZeRLeFVqbnCQLn9eoViY")
            elif agent_type == "judge":
                seed_phrase = os.environ.get("JUDGE_SEED", "9h6v954FPP_7_SV6MuqtcjGE0bjMZDxN-SAGujDFXCQ")
            else:
                seed_phrase = os.environ.get("AGENT_SEED", "default_secret_seed_phrase")
    
    # If no custom endpoint URL provided, construct from environment variables
    if not endpoint_url:
        if agent_type == "red-team":
            agent_ip = os.getenv("RED_TEAM_IP") or os.getenv("AGENT_IP", "localhost")
            agent_port = os.getenv("RED_TEAM_PORT") or os.getenv("AGENT_PORT", "8001")
        elif agent_type == "target":
            agent_ip = os.getenv("TARGET_IP") or os.getenv("AGENT_IP", "localhost")
            agent_port = os.getenv("TARGET_PORT") or os.getenv("AGENT_PORT", "8000")
        elif agent_type == "judge":
            agent_ip = os.getenv("JUDGE_IP") or os.getenv("AGENT_IP", "localhost")
            agent_port = os.getenv("JUDGE_PORT") or os.getenv("AGENT_PORT", "8002")
        else:
            agent_ip = os.getenv("AGENT_IP", "localhost")
            agent_port = os.getenv("AGENT_PORT", "8000")
        endpoint_url = f"http://{agent_ip}:{agent_port}/submit"
    
    print(f"🔗 Registering agent '{agent_name}' ({agent_type}) with endpoint: {endpoint_url}")
    print(f"   Using API key: {agentverse_key[:20]}...")
    print(f"   Using seed phrase: {seed_phrase[:20]}...")
    
    try:
        register_chat_agent(
            agent_name,
            endpoint_url,
            active=active,
            credentials=RegistrationRequestCredentials(
                agentverse_api_key=agentverse_key,
                agent_seed_phrase=seed_phrase,
            ),
        )
        print(f"✅ Successfully registered '{agent_name}' with Agentverse!")
        print(f"   Endpoint: {endpoint_url}")
    except Exception as e:
        print(f"❌ Failed to register agent: {str(e)}")
        sys.exit(1)


# Backward compatibility
def register_red_team_agent(endpoint_url: str = None, agent_name: str = "red-team", active: bool = True):
    """Backward compatibility wrapper for register_agent."""
    register_agent(endpoint_url=endpoint_url, agent_name=agent_name, agent_type="red-team", active=active)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Register a chat agent with Agentverse"
    )
    parser.add_argument(
        "--endpoint",
        type=str,
        default=None,
        help="Custom endpoint URL (e.g., https://your-tunnel.trycloudflare.com/)"
    )
    parser.add_argument(
        "--name",
        type=str,
        default=None,
        help="Agent name (default: uses --type)"
    )
    parser.add_argument(
        "--type",
        type=str,
        choices=["red-team", "target", "judge"],
        default="red-team",
        help="Agent type (default: red-team)"
    )
    parser.add_argument(
        "--seed",
        type=str,
        default=None,
        help="Seed phrase (default: from environment variables)"
    )
    parser.add_argument(
        "--inactive",
        action="store_true",
        help="Register agent as inactive"
    )
    
    args = parser.parse_args()
    
    register_agent(
        endpoint_url=args.endpoint,
        agent_name=args.name,
        agent_type=args.type,
        active=not args.inactive,
        seed_phrase=args.seed,
    )

