#!/usr/bin/env python3
"""
Script to register the red-team agent with Agentverse.
This script uses the provided credentials and endpoint URL.
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

# Configuration - you can set these via environment variables or modify directly
AGENTVERSE_API_KEY = os.environ.get(
    "AGENTVERSE_KEY",
    "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NjQ4NzE3NDgsImlhdCI6MTc2NDg2ODE0OCwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiI2ZWEzNGNmMzI1YjIwYzU1MDhkZDFjYzciLCJzY29wZSI6IiIsInN1YiI6ImY0OGM2ZjUwODkzOTc1MDJmNTg1M2RjNTkzNGNjYmRlNDcyY2NmZTZkMWIzZmVmNiJ9.FG-pX-GQDrNBIVyAL5Zcd9yDcJEsWmt_58yb7o5pYqUTn0G5sp3LvPKRHwhKqD0h6QkCYqxUbG7r2XvMgHGSox2Ozt5_pg8Or7Upm2uocajXuorunUX5_nW2niw_y8f17C27USCXWTJUwPsOKxejZ7CvW3L_12uT4muZPDYPIjQRR-uXbqq7Nw7Zaf2Y9_zM18wlAiZfsjZsOrrmbX-ZtngN-_qGDfotWkCWFgYbRVM7inVJfaIZ2oXMFjTHwwhkFKdBOKiKfgn9u0hg36-wZPZK1c62Id1bQZkgJ7qJG7cpiXvbWNVk0XiM9pxYOoctj1LlNeXZwXSghTsALY8_zQ"
)

AGENT_SEED_PHRASE = os.environ.get(
    "AGENT_SEED_PHRASE",
    "agent1qtjn3uzqm5vn37h53l9kmvnm9g50fncctqgqxmxgahk84fd09nqnq7ju22w"
)

ENDPOINT_URL = os.environ.get(
    "AGENT_ENDPOINT",
    "https://robert-knows-afford-ralph.trycloudflare.com/"
)

AGENT_NAME = os.environ.get("AGENT_NAME", "red-team")
AGENT_ACTIVE = os.environ.get("AGENT_ACTIVE", "true").lower() == "true"


if __name__ == "__main__":
    print(f"🔗 Registering agent '{AGENT_NAME}' with endpoint: {ENDPOINT_URL}")
    print(f"   Using API key: {AGENTVERSE_API_KEY[:20]}...")
    
    try:
        register_chat_agent(
            AGENT_NAME,
            ENDPOINT_URL,
            active=AGENT_ACTIVE,
            credentials=RegistrationRequestCredentials(
                agentverse_api_key=AGENTVERSE_API_KEY,
                agent_seed_phrase=AGENT_SEED_PHRASE,
            ),
        )
        print(f"✅ Successfully registered '{AGENT_NAME}' with Agentverse!")
        print(f"   Endpoint: {ENDPOINT_URL}")
    except Exception as e:
        print(f"❌ Failed to register agent: {str(e)}")
        sys.exit(1)

