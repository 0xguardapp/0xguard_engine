"""
Agent Backend API Server

FastAPI server to manage agent lifecycle, start/stop agents, and return status.
Provides REST API endpoints for frontend to interact with agents.
"""
import os
import sys
import subprocess
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Add agent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load configuration from config.py (which handles .env loading)
try:
    from config import get_config
    config = get_config()
    logger.info("Configuration loaded from config.py")
except Exception as e:
    logger.warning(f"Failed to load config.py: {e}, falling back to environment variables")
    config = None

# Global dictionary to store agent processes
processes: Dict[str, subprocess.Popen] = {}


# Pydantic models for request/response
class StartAgentsRequest(BaseModel):
    """Request model for starting agents"""
    targetAddress: str = Field(..., description="Target contract address to audit")
    intensity: str = Field(default="quick", description="Audit intensity: 'quick' or 'deep'")


class StartAgentsResponse(BaseModel):
    """Response model for starting agents"""
    success: bool
    message: str
    agents: Dict[str, Dict[str, Any]]


class AgentStatusResponse(BaseModel):
    """Response model for agent status"""
    target: bool
    judge: bool
    red_team: bool
    ports: Dict[str, int]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting Agent API Server...")
    # Startup
    yield
    # Shutdown - cleanup agent processes
    logger.info("Shutting down Agent API Server, cleaning up agent processes...")
    for name, proc in list(processes.items()):
        if proc and proc.poll() is None:
            logger.info(f"Terminating {name} agent process...")
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logger.warning(f"Force killing {name} agent process...")
                proc.kill()
            except Exception as e:
                logger.error(f"Error terminating {name} agent: {e}")
    processes.clear()
    logger.info("Shutdown complete")


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
def start_agents(request: StartAgentsRequest):
    """
    Start all three agents (Target, Judge, Red Team)
    
    Args:
        request: StartAgentsRequest with targetAddress and intensity
        
    Returns:
        StartAgentsResponse with agent ports
        
    Raises:
        HTTPException: If any agent fails to start
    """
    logger.info(f"Received request to start agents: targetAddress={request.targetAddress}, intensity={request.intensity}")
    
    # Check if agents are already running
    running_agents = [name for name, proc in processes.items() if proc and proc.poll() is None]
    if running_agents:
        logger.warning(f"Agents already running: {running_agents}")
        raise HTTPException(
            status_code=400,
            detail=f"Agents already running: {', '.join(running_agents)}. Stop them first."
        )
    
    agent_dir = Path(__file__).parent
    python_executable = sys.executable
    
    # Get port configuration from config.py
    if config:
        target_port = str(config.TARGET_PORT)
        judge_port = str(config.JUDGE_PORT)
        red_team_port = str(config.RED_TEAM_PORT)
    else:
        target_port = os.getenv("TARGET_PORT", "8000")
        judge_port = os.getenv("JUDGE_PORT", "8002")
        red_team_port = os.getenv("RED_TEAM_PORT", "8001")
    
    logger.info(f"Agent ports - Target: {target_port}, Judge: {judge_port}, Red Team: {red_team_port}")
    
    try:
        # Start Target Agent
        logger.info("Starting Target agent...")
        try:
            target_process = subprocess.Popen(
                [python_executable, "target.py"],
                cwd=str(agent_dir),
                env=os.environ.copy(),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            processes['target'] = target_process
            logger.info(f"Target agent started with PID: {target_process.pid}")
        except Exception as e:
            logger.error(f"Failed to start Target agent: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to start Target agent: {str(e)}")
        
        time.sleep(0.5)
        
        # Start Judge Agent
        logger.info("Starting Judge agent...")
        try:
            judge_process = subprocess.Popen(
                [python_executable, "judge.py"],
                cwd=str(agent_dir),
                env=os.environ.copy(),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            processes['judge'] = judge_process
            logger.info(f"Judge agent started with PID: {judge_process.pid}")
        except Exception as e:
            logger.error(f"Failed to start Judge agent: {e}")
            # Cleanup target agent
            if 'target' in processes:
                processes['target'].terminate()
            raise HTTPException(status_code=500, detail=f"Failed to start Judge agent: {str(e)}")
        
        time.sleep(0.5)
        
        # Start Red Team Agent
        logger.info("Starting Red Team agent...")
        try:
            red_team_process = subprocess.Popen(
                [python_executable, "red_team.py"],
                cwd=str(agent_dir),
                env=os.environ.copy(),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            processes['red_team'] = red_team_process
            logger.info(f"Red Team agent started with PID: {red_team_process.pid}")
        except Exception as e:
            logger.error(f"Failed to start Red Team agent: {e}")
            # Cleanup previously started agents
            if 'target' in processes:
                processes['target'].terminate()
            if 'judge' in processes:
                processes['judge'].terminate()
            raise HTTPException(status_code=500, detail=f"Failed to start Red Team agent: {str(e)}")
        
        time.sleep(0.5)
        
        # Verify all processes are still running
        failed_agents = []
        for name, proc in processes.items():
            if proc.poll() is not None:
                failed_agents.append(name)
                logger.error(f"{name} agent process exited immediately with code: {proc.returncode}")
        
        if failed_agents:
            # Cleanup all processes
            for name in list(processes.keys()):
                if processes[name] and processes[name].poll() is None:
                    processes[name].terminate()
            processes.clear()
            raise HTTPException(
                status_code=500,
                detail=f"Agents failed to start: {', '.join(failed_agents)}"
            )
        
        logger.info("All agents started successfully")
        
        return StartAgentsResponse(
            success=True,
            message="Agents started",
            agents={
                "target": {"port": target_port},
                "judge": {"port": judge_port},
                "red_team": {"port": red_team_port}
            }
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error starting agents: {e}", exc_info=True)
        # Cleanup any started processes
        for name, proc in list(processes.items()):
            if proc and proc.poll() is None:
                try:
                    proc.terminate()
                except Exception:
                    pass
        processes.clear()
        raise HTTPException(status_code=500, detail=f"Failed to start agents: {str(e)}")


@app.get("/api/agents/status", response_model=AgentStatusResponse, tags=["Agents"])
def get_agents_status():
    """
    Get status of all running agents
    
    Returns:
        AgentStatusResponse with boolean status for each agent (True if alive, False if not)
        and port information
    """
    logger.info("Checking agent status...")
    
    # Get port configuration from config.py
    if config:
        target_port = config.TARGET_PORT
        judge_port = config.JUDGE_PORT
        red_team_port = config.RED_TEAM_PORT
    else:
        target_port = int(os.getenv("TARGET_PORT", "8000"))
        judge_port = int(os.getenv("JUDGE_PORT", "8002"))
        red_team_port = int(os.getenv("RED_TEAM_PORT", "8001"))
    
    status = {
        "target": False,
        "judge": False,
        "red_team": False,
        "ports": {
            "target": target_port,
            "judge": judge_port,
            "red_team": red_team_port
        }
    }
    
    for name in ["target", "judge", "red_team"]:
        if name in processes:
            proc = processes[name]
            if proc:
                is_alive = proc.poll() is None
                status[name] = is_alive
                if not is_alive:
                    logger.warning(f"{name} agent is not running (exit code: {proc.returncode})")
            else:
                status[name] = False
        else:
            status[name] = False
    
    logger.info(f"Agent status: {status}")
    return AgentStatusResponse(**status)


def main():
    """Run the API server"""
    # Get port from config.py
    if config:
        port = config.AGENT_API_PORT
        host = "0.0.0.0"
        logger.info(f"Starting Agent API Server on {host}:{port}")
        logger.info(f"Configuration loaded - TARGET_PORT: {config.TARGET_PORT}, "
                    f"JUDGE_PORT: {config.JUDGE_PORT}, "
                    f"RED_TEAM_PORT: {config.RED_TEAM_PORT}, "
                    f"AGENT_API_PORT: {config.AGENT_API_PORT}, "
                    f"MIDNIGHT_API_URL: {config.MIDNIGHT_API_URL}")
    else:
        port = int(os.getenv("AGENT_API_PORT", "8003"))
        host = "0.0.0.0"
        logger.info(f"Starting Agent API Server on {host}:{port}")
        logger.info(f"Environment variables loaded - TARGET_PORT: {os.getenv('TARGET_PORT', '8000')}, "
                    f"JUDGE_PORT: {os.getenv('JUDGE_PORT', '8002')}, "
                    f"RED_TEAM_PORT: {os.getenv('RED_TEAM_PORT', '8001')}")
    
    uvicorn.run(
        "api_server:app",
        host=host,
        port=port,
        reload=False,  # Disable reload for production
        log_level="info",
    )


if __name__ == "__main__":
    main()
