"""
PHASE 6 — Testing That Registration Actually Works

This test verifies that an agent can successfully register with AgentVerse.
Run this test to ensure AgentVerse registration is working correctly.
"""
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from agent/.env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

from uagents import Agent
import agentverse_patch  # ⚡ Adds enable_agentverse() + use_mailbox()

# Create agent following PHASE 3 pattern
agent = Agent(
    name="test",
    seed=os.getenv("TARGET_SECRET_KEY"),
    port=9999
)

agent.enable_agentverse(os.getenv("AGENTVERSE_KEY"))

print("Registered:", agent.address)

