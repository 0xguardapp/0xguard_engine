#!/usr/bin/env python3
"""
Script to retrieve and display agent endpoints for Agentverse registration.
This script determines the public IP and constructs the full endpoint URLs
for Red Team, Target, and Judge agents.
"""
import os
import sys
import requests
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent))


def get_public_ip():
    """Get the public IP address of the current machine."""
    try:
        response = requests.get('https://api.ipify.org?format=json', timeout=5)
        return response.json()['ip']
    except Exception as e:
        print(f"⚠️  Warning: Could not fetch public IP: {e}")
        return None


def get_agent_endpoints():
    """
    Get the endpoint URLs for all three agents.
    
    Returns:
        dict: Dictionary with agent names and their endpoint URLs
    """
    # Get public IP
    public_ip = get_public_ip()
    
    # If public IP not available, try environment variable or use localhost
    if not public_ip:
        public_ip = os.getenv("AGENT_PUBLIC_IP") or os.getenv("AGENT_IP", "localhost")
        print(f"⚠️  Using IP from environment or localhost: {public_ip}")
        print("   Note: For Agentverse, you need a publicly accessible IP address.\n")
    else:
        print(f"✅ Public IP detected: {public_ip}\n")
    
    # Get ports from environment or use defaults
    red_team_port = os.getenv("RED_TEAM_PORT") or os.getenv("AGENT_PORT", "8001")
    target_port = os.getenv("TARGET_PORT") or os.getenv("AGENT_PORT", "8000")
    judge_port = os.getenv("JUDGE_PORT") or os.getenv("AGENT_PORT", "8002")
    
    # Construct endpoints
    endpoints = {
        "red_team": f"http://{public_ip}:{red_team_port}/submit",
        "target": f"http://{public_ip}:{target_port}/submit",
        "judge": f"http://{public_ip}:{judge_port}/submit",
    }
    
    return endpoints, public_ip


def main():
    """Main function to display agent endpoints."""
    print("=" * 70)
    print("🔗 0xGuard Agent Endpoints for Agentverse")
    print("=" * 70)
    print()
    
    endpoints, public_ip = get_agent_endpoints()
    
    print("📋 Agent Endpoints:")
    print("-" * 70)
    print(f"🔴 Red Team Agent:")
    print(f"   {endpoints['red_team']}")
    print()
    print(f"🎯 Target Agent:")
    print(f"   {endpoints['target']}")
    print()
    print(f"⚖️  Judge Agent:")
    print(f"   {endpoints['judge']}")
    print()
    print("=" * 70)
    print("📝 Copy these endpoints for Agentverse registration:")
    print("=" * 70)
    print()
    print("Red Team:")
    print(endpoints['red_team'])
    print()
    print("Target:")
    print(endpoints['target'])
    print()
    print("Judge:")
    print(endpoints['judge'])
    print()
    print("=" * 70)
    print("💡 Note: Ensure these ports are open and accessible:")
    print(f"   - Port {endpoints['red_team'].split(':')[-1].split('/')[0]} (Red Team)")
    print(f"   - Port {endpoints['target'].split(':')[-1].split('/')[0]} (Target)")
    print(f"   - Port {endpoints['judge'].split(':')[-1].split('/')[0]} (Judge)")
    print("=" * 70)


if __name__ == "__main__":
    main()




