"""
Agent Backend API Server

FastAPI server to manage agent lifecycle, start/stop agents, and return status.
Provides REST API endpoints for frontend to interact with agents.
"""
import os
import sys
import asyncio
import subprocess
import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Add agent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Global state for agent processes
class AgentState:
    """Global state to track running agent processes"""
    judge_process: Optional[subprocess.Popen] = None
    target_process: Optional[subprocess.Popen] = None
    red_team_process: Optional[subprocess.Popen] = None
    judge_address: Optional[str] = None
    target_address: Optional[str] = None
    red_team_address: Optional[str] = None
    started_at: Optional[datetime] = None
    target_address_config: Optional[str] = None
    intensity: Optional[str] = None


agent_state = AgentState()

# Simple processes dictionary for simpler endpoint implementation
processes: Dict[str, subprocess.Popen] = {}


# Pydantic models
class StartAgentsRequest(BaseModel):
    targetAddress: str = Field(..., description="Target contract address to audit")
    intensity: str = Field(default="quick", description="Audit intensity: 'quick' or 'deep'")


class AgentStatus(BaseModel):
    is_running: bool
    port: Optional[int] = None
    address: Optional[str] = None
    last_seen: Optional[str] = None
    health_status: str = Field(default="down", description="healthy | degraded | down")


class AgentsStatusResponse(BaseModel):
    judge: AgentStatus
    target: AgentStatus
    red_team: AgentStatus
    started_at: Optional[str] = None


class StartAgentsResponse(BaseModel):
    success: bool
    message: str
    agents: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


async def check_process_health(process: Optional[subprocess.Popen]) -> str:
    """Check if a process is healthy"""
    if process is None:
        return "down"
    
    poll_result = process.poll()
    if poll_result is None:
        return "healthy"
    else:
        return "down"


def get_agent_address_from_logs(agent_name: str) -> Optional[str]:
    """Try to extract agent address from logs.json"""
    try:
        logs_path = Path(__file__).parent.parent / "logs.json"
        if not logs_path.exists():
            return None
        
        import json
        with open(logs_path, 'r') as f:
            logs = json.load(f)
        
        # Search for agent startup log
        for log_entry in reversed(logs[-100:]):  # Check last 100 entries
            if isinstance(log_entry, dict):
                actor = log_entry.get('actor', '')
                message = log_entry.get('message', '')
                
                if agent_name.lower() in actor.lower():
                    # Try to extract address from message
                    if 'started' in message.lower() and 'agent' in message.lower():
                        # Look for address pattern
                        import re
                        # Pattern for agent addresses (fetch addresses)
                        address_pattern = r'fetch1[a-z0-9]{38}'
                        match = re.search(address_pattern, message)
                        if match:
                            return match.group(0)
        
        return None
    except Exception:
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    yield
    # Shutdown - cleanup agent processes
    if agent_state.judge_process:
        agent_state.judge_process.terminate()
    if agent_state.target_process:
        agent_state.target_process.terminate()
    if agent_state.red_team_process:
        agent_state.red_team_process.terminate()


# Initialize FastAPI app
app = FastAPI(
    title="0xGuard Agent API",
    description="API for managing 0xGuard agents lifecycle",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/agents/start", response_model=StartAgentsResponse, tags=["Agents"])
def start_agents(targetAddress: str, intensity: str = "quick"):
    """
    Start all three agents (Judge, Target, Red Team)
    
    Args:
        targetAddress: Target contract address to audit
        intensity: Audit intensity: 'quick' or 'deep' (default: 'quick')
        
    Returns:
        StartAgentsResponse with agent addresses and status
    """
    try:
        agent_dir = Path(__file__).parent
        python_executable = sys.executable
        
        # Start Target Agent
        target = subprocess.Popen([python_executable, str(agent_dir / "target.py")], cwd=str(agent_dir))
        processes['target'] = target
        agent_state.target_process = target
        time.sleep(0.5)
        
        # Start Judge Agent
        judge = subprocess.Popen([python_executable, str(agent_dir / "judge.py")], cwd=str(agent_dir))
        processes['judge'] = judge
        agent_state.judge_process = judge
        time.sleep(0.5)
        
        # Start Red-Team Agent
        red = subprocess.Popen([python_executable, str(agent_dir / "red_team.py")], cwd=str(agent_dir))
        processes['red_team'] = red
        agent_state.red_team_process = red
        time.sleep(0.5)
        
        # Store configuration
        agent_state.target_address_config = targetAddress
        agent_state.intensity = intensity
        agent_state.started_at = datetime.now()
        
        return StartAgentsResponse(
            success=True,
            message="Agents started",
            agents={
                "target": {"port": int(os.getenv("TARGET_PORT", "8000"))},
                "judge": {"port": int(os.getenv("JUDGE_PORT", "8002"))},
                "red_team": {"port": int(os.getenv("RED_TEAM_PORT", "8001"))},
            }
        )
        
    except Exception as e:
        # Cleanup on error
        if 'target' in processes:
            processes['target'].terminate()
        if 'judge' in processes:
            processes['judge'].terminate()
        if 'red_team' in processes:
            processes['red_team'].terminate()
        
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/agents/status", tags=["Agents"])
def get_status():
    """
    Get status of all running agents
    
    Returns:
        Dictionary with status of each agent (True if running, False if not)
    """
    status = {}
    for name, proc in processes.items():
        status[name] = proc.poll() is None
    
    # Also check agent_state processes for backward compatibility
    if agent_state.target_process and 'target' not in status:
        status['target'] = agent_state.target_process.poll() is None
    if agent_state.judge_process and 'judge' not in status:
        status['judge'] = agent_state.judge_process.poll() is None
    if agent_state.red_team_process and 'red_team' not in status:
        status['red_team'] = agent_state.red_team_process.poll() is None
    
    return status


@app.post("/api/agents/stop", tags=["Agents"])
async def stop_agents():
    """
    Stop all running agents
    
    Returns:
        Success message
    """
    stopped = []
    
    if agent_state.judge_process and agent_state.judge_process.poll() is None:
        agent_state.judge_process.terminate()
        agent_state.judge_process.wait(timeout=5)
        stopped.append("judge")
    
    if agent_state.target_process and agent_state.target_process.poll() is None:
        agent_state.target_process.terminate()
        agent_state.target_process.wait(timeout=5)
        stopped.append("target")
    
    if agent_state.red_team_process and agent_state.red_team_process.poll() is None:
        agent_state.red_team_process.terminate()
        agent_state.red_team_process.wait(timeout=5)
        stopped.append("red_team")
    
    # Reset state
    agent_state.judge_process = None
    agent_state.target_process = None
    agent_state.red_team_process = None
    agent_state.judge_address = None
    agent_state.target_address = None
    agent_state.red_team_address = None
    agent_state.started_at = None
    
    return {
        "success": True,
        "message": f"Stopped agents: {', '.join(stopped) if stopped else 'none were running'}",
        "stopped": stopped
    }


def main():
    """Run the API server"""
    port = int(os.getenv("AGENT_API_PORT", "8003"))
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload for production
        log_level="info",
    )


if __name__ == "__main__":
    main()

