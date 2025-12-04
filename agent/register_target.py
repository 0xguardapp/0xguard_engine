#!/usr/bin/env python3
"""
Register the Target agent with Agentverse.
This script properly uses environment variables for security.
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

# Get API key from environment variable (NOT hardcoded!)
agentverse_key = os.environ.get("AGENTVERSE_KEY")
if not agentverse_key:
    print("❌ Error: AGENTVERSE_KEY environment variable is not set")
    print("   Please set it with: export AGENTVERSE_KEY='your_key_here'")
    sys.exit(1)

# Get target seed phrase from environment variable
target_seed = os.environ.get("TARGET_SEED", "mwVACdxiAXOHyXNDIXAGZ7GZeRLeFVqbnCQLn9eoViY")

# Endpoint URL
endpoint_url = "http://193.221.143.82:8000/submit"

print(f"🔗 Registering target-agent with endpoint: {endpoint_url}")
print(f"   Using API key: {agentverse_key[:20]}...")
print(f"   Using seed phrase: {target_seed[:20]}...")

try:
    register_chat_agent(
        "target-agent",
        endpoint_url,
        active=True,
        credentials=RegistrationRequestCredentials(
            agentverse_api_key=agentverse_key,  # From AGENTVERSE_KEY env var
            agent_seed_phrase=target_seed,      # From TARGET_SEED env var
        ),
    )
    print(f"✅ Successfully registered 'target-agent' with Agentverse!")
    print(f"   Endpoint: {endpoint_url}")
except Exception as e:
    print(f"❌ Failed to register agent: {str(e)}")
    sys.exit(1)

