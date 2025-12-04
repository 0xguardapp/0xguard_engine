#!/usr/bin/env python3
"""
Standalone script to launch the Target agent.
"""
import os
import sys
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Set configuration
public_ip = os.getenv("TARGET_IP") or os.getenv("AGENT_IP", "193.221.143.82")
target_seed = os.getenv("TARGET_SEED", "mwVACdxiAXOHyXNDIXAGZ7GZeRLeFVqbnCQLn9eoViY")
judge_seed = os.getenv("JUDGE_SEED", "9h6v954FPP_7_SV6MuqtcjGE0bjMZDxN-SAGujDFXCQ")
use_mailbox = os.getenv("USE_MAILBOX", "true").lower() == "true"

# Set environment variables
os.environ['TARGET_IP'] = public_ip
os.environ['TARGET_PORT'] = '8000'
os.environ['TARGET_SEED'] = target_seed
os.environ['JUDGE_SEED'] = judge_seed
os.environ['USE_MAILBOX'] = 'true' if use_mailbox else 'false'

from target import create_target_agent
from judge import create_judge_agent

print("=" * 70)
print("🎯 Launching Target Agent")
print("=" * 70)
print(f"📡 IP: {public_ip}")
print(f"🔑 Target Seed: {target_seed[:20]}...")
print(f"🔑 Judge Seed: {judge_seed[:20]}...")
print()

# Create judge to get its address (or use provided judge address)
judge_address = os.getenv("JUDGE_ADDRESS")
if not judge_address:
    print("⚖️  Creating Judge agent to get address...")
    judge = create_judge_agent(port=8002)
    judge_address = judge.address
    print(f"   Judge Address: {judge_address}")
    print()

# Create and run target agent
print("🎯 Creating Target Agent...")
target = create_target_agent(port=8000, judge_address=judge_address)
print(f"✅ Target Agent Address: {target.address}")
print(f"✅ Target Agent Endpoint: http://{public_ip}:8000/submit")
print()
print("🚀 Starting Target Agent...")
print("🛑 Press Ctrl+C to stop\n")

target.run()



