#!/usr/bin/env python3
"""
Launch script to run all three agents in separate processes.
This avoids event loop conflicts and allows each agent to run independently.
"""
import subprocess
import sys
import os
import time
import signal
from pathlib import Path

# Set public IP for Agentverse
public_ip = os.getenv("AGENT_PUBLIC_IP", "193.221.143.82")

# Generate or use existing seed phrases
red_team_seed = os.getenv("RED_TEAM_SEED", "pq2ZrvsFvLGWIHVDGfriGJHUUD1AvRFI0uB1_A7F7bA")
target_seed = os.getenv("TARGET_SEED", "mwVACdxiAXOHyXNDIXAGZ7GZeRLeFVqbnCQLn9eoViY")
judge_seed = os.getenv("JUDGE_SEED", "9h6v954FPP_7_SV6MuqtcjGE0bjMZDxN-SAGujDFXCQ")

# Environment variables for all agents
env = os.environ.copy()
env.update({
    "AGENT_IP": public_ip,
    "RED_TEAM_IP": public_ip,
    "RED_TEAM_SEED": red_team_seed,
    "TARGET_IP": public_ip,
    "TARGET_SEED": target_seed,
    "JUDGE_IP": public_ip,
    "JUDGE_SEED": judge_seed,
    "USE_MAILBOX": "true",
})

agent_dir = Path(__file__).parent
python_exe = agent_dir / "venv" / "bin" / "python3"

# If venv python doesn't exist, try system python3
if not python_exe.exists():
    python_exe = "python3"

# First, get agent addresses by creating them (without running)
print("=" * 70)
print("🚀 Launching 0xGuard Agent Swarm")
print("=" * 70)
print(f"\n📡 Public IP: {public_ip}")
print(f"🐍 Python: {python_exe}")
print(f"🔑 Red Team Seed: {red_team_seed[:20]}...")
print(f"🔑 Target Seed: {target_seed[:20]}...")
print(f"🔑 Judge Seed: {judge_seed[:20]}...")
print("\n📦 Getting agent addresses...")

# Import and create agents to get addresses
sys.path.insert(0, str(agent_dir))
from judge import create_judge_agent
from target import create_target_agent
from red_team import create_red_team_agent

# Create agents (don't run them yet)
judge = create_judge_agent(port=8002)
judge_address = judge.address
print(f"   ⚖️  Judge Agent: {judge_address}")

target = create_target_agent(port=8000, judge_address=judge_address)
target_address = target.address
print(f"   🎯 Target Agent: {target_address}")

red_team = create_red_team_agent(
    target_address=target_address,
    port=8001,
    judge_address=judge_address
)
red_team_address = red_team.address
print(f"   🔴 Red Team Agent: {red_team_address}")

print("\n✅ All agents created!")
print("\n📋 Agent Configuration:")
print(f"   Red Team → Target: {target_address}")
print(f"   Red Team → Judge: {judge_address}")
print(f"   Target → Judge: {judge_address}")

print("\n🔄 Starting agents in separate processes...\n")

# Store process references
processes = []

# Start Judge Agent (port 8002) - runs standalone
print("⚖️  Starting Judge Agent on port 8002...")
judge_script = f"""
import sys
import os
sys.path.insert(0, '{agent_dir}')
os.environ['JUDGE_IP'] = '{public_ip}'
os.environ['JUDGE_PORT'] = '8002'
os.environ['JUDGE_SEED'] = '{judge_seed}'
os.environ['USE_MAILBOX'] = 'true'
from judge import create_judge_agent
agent = create_judge_agent(port=8002)
print(f'Judge Agent started: {{agent.address}}')
agent.run()
"""
judge_process = subprocess.Popen(
    [str(python_exe), "-c", judge_script],
    env=env,
    cwd=str(agent_dir),
)
processes.append(("Judge", judge_process))
time.sleep(2)

# Start Target Agent (port 8000)
print("🎯 Starting Target Agent on port 8000...")
target_script = f"""
import sys
import os
sys.path.insert(0, '{agent_dir}')
os.environ['TARGET_IP'] = '{public_ip}'
os.environ['TARGET_PORT'] = '8000'
os.environ['TARGET_SEED'] = '{target_seed}'
os.environ['USE_MAILBOX'] = 'true'
from target import create_target_agent
agent = create_target_agent(port=8000, judge_address='{judge_address}')
print(f'Target Agent started: {{agent.address}}')
agent.run()
"""
target_process = subprocess.Popen(
    [str(python_exe), "-c", target_script],
    env=env,
    cwd=str(agent_dir),
)
processes.append(("Target", target_process))
time.sleep(2)

# Start Red Team Agent (port 8001)
print("🔴 Starting Red Team Agent on port 8001...")
red_team_script = f"""
import sys
import os
sys.path.insert(0, '{agent_dir}')
os.environ['RED_TEAM_IP'] = '{public_ip}'
os.environ['RED_TEAM_PORT'] = '8001'
os.environ['RED_TEAM_SEED'] = '{red_team_seed}'
os.environ['USE_MAILBOX'] = 'true'
from red_team import create_red_team_agent
agent = create_red_team_agent(
    target_address='{target_address}',
    port=8001,
    judge_address='{judge_address}'
)
print(f'Red Team Agent started: {{agent.address}}')
agent.run()
"""
red_team_process = subprocess.Popen(
    [str(python_exe), "-c", red_team_script],
    env=env,
    cwd=str(agent_dir),
)
processes.append(("Red Team", red_team_process))

print("\n✅ All agents launched!")
print("\n📋 Agent Endpoints for Agentverse:")
print(f"   🔴 Red Team: http://{public_ip}:8001/submit")
print(f"   🎯 Target:   http://{public_ip}:8000/submit")
print(f"   ⚖️  Judge:    http://{public_ip}:8002/submit")
print("\n💡 Agents are running in the background.")
print("🛑 To stop agents, press Ctrl+C\n")
print("=" * 70)

# Monitor processes
def signal_handler(sig, frame):
    print("\n\n🛑 Stopping all agents...")
    for name, proc in processes:
        if proc.poll() is None:
            print(f"   Stopping {name}...")
            proc.terminate()
    time.sleep(2)
    for name, proc in processes:
        if proc.poll() is None:
            proc.kill()
    print("👋 All agents stopped.")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

try:
    while True:
        # Check if processes are still running
        for name, proc in processes:
            if proc.poll() is not None:
                print(f"⚠️  {name} Agent stopped (exit code: {proc.returncode})")
        time.sleep(5)
except KeyboardInterrupt:
    signal_handler(None, None)
