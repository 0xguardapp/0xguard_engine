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
import json
import uuid
import random
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Path as PathParam, Query
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

# Audit storage file path
AUDITS_STORAGE_FILE = Path(__file__).parent / "audits.json"


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


class RegisterAgentRequest(BaseModel):
    """Request model for registering an agent"""
    agent_address: str = Field(..., description="Ethereum address of the agent to register")


class RegisterAgentResponse(BaseModel):
    """Response model for agent registration"""
    success: bool
    message: str
    agent_address: Optional[str] = None
    transaction_hash: Optional[str] = None


class CreateAuditRequest(BaseModel):
    """Request model for creating a new audit"""
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    target: Optional[str] = Field(None, description="Target URL/Repo")
    targetAddress: Optional[str] = Field(None, description="Target wallet/contract address")
    tags: Optional[list[str]] = Field(None, description="Tags array")
    difficulty: Optional[str] = Field(None, description="Difficulty level")
    priority: Optional[str] = Field(None, description="Priority level")
    wallet: str = Field(..., description="Wallet address of the creator")


class CreateAuditResponse(BaseModel):
    """Response model for audit creation"""
    audit_id: str
    name: str
    created_at: str
    status: str
    metadata: Optional[Dict[str, Any]] = None


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
    # Use venv python if available, otherwise use sys.executable
    venv_python = agent_dir / "venv" / "bin" / "python3"
    if venv_python.exists():
        python_executable = str(venv_python)
        logger.info(f"Using venv Python: {python_executable}")
    else:
    python_executable = sys.executable
        logger.info(f"Using system Python: {python_executable}")
    
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
        # Start Judge Agent first (needs to be running to receive messages)
        logger.info("Starting Judge agent...")
        try:
            judge_env = os.environ.copy()
            judge_process = subprocess.Popen(
                [python_executable, "judge.py"],
                cwd=str(agent_dir),
                env=judge_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            processes['judge'] = judge_process
            logger.info(f"Judge agent started with PID: {judge_process.pid}")
        except Exception as e:
            logger.error(f"Failed to start Judge agent: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to start Judge agent: {str(e)}")
        
        # Wait for judge to initialize
        time.sleep(2)
        
        # Start Target Agent (will discover judge through agentverse)
        logger.info("Starting Target agent...")
        try:
            target_env = os.environ.copy()
            target_process = subprocess.Popen(
                [python_executable, "target.py"],
                cwd=str(agent_dir),
                env=target_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            processes['target'] = target_process
            logger.info(f"Target agent started with PID: {target_process.pid}")
        except Exception as e:
            logger.error(f"Failed to start Target agent: {e}")
            # Cleanup judge agent
            if 'judge' in processes:
                processes['judge'].terminate()
            raise HTTPException(status_code=500, detail=f"Failed to start Target agent: {str(e)}")
        
        time.sleep(2)
        
        # Start Red Team Agent (will discover target and judge through agentverse)
        logger.info("Starting Red Team agent...")
        try:
            red_team_env = os.environ.copy()
            red_team_process = subprocess.Popen(
                [python_executable, "red_team.py"],
                cwd=str(agent_dir),
                env=red_team_env,
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


@app.post("/register", response_model=RegisterAgentResponse, tags=["Agents"])
def register_agent(request: RegisterAgentRequest):
    """
    Register an agent address with the Unibase registry and on-chain contracts.
    
    Args:
        request: RegisterAgentRequest with agent_address (Ethereum address)
        
    Returns:
        RegisterAgentResponse with registration status
        
    Raises:
        HTTPException: If registration fails
    """
    logger.info(f"Received agent registration request: agent_address={request.agent_address}")
    
    try:
        # Import agent registry adapter
        try:
            from agent_registry_adapter import AgentRegistryAdapter
            from unibase_agent_store import UnibaseAgentStore
        except ImportError as e:
            logger.error(f"Failed to import agent registry modules: {e}")
            raise HTTPException(
                status_code=500,
                detail="Agent registry modules not available. Please ensure agent_registry_adapter and unibase_agent_store are installed."
            )
        
        # Validate Ethereum address format
        if not request.agent_address.startswith("0x") or len(request.agent_address) != 42:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid Ethereum address format: {request.agent_address}"
            )
        
        # Initialize registry adapter
        try:
            adapter = AgentRegistryAdapter()
            logger.info("AgentRegistryAdapter initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AgentRegistryAdapter: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize agent registry adapter: {str(e)}"
            )
        
        # Register the agent
        try:
            logger.info(f"Registering agent address: {request.agent_address}")
            
            # Create default identity data if not provided
            identity_data = {
                "address": request.agent_address,
                "registered_at": datetime.now().isoformat(),
                "source": "wallet_connect"
            }
            
            result = adapter.register_agent(request.agent_address, identity_data)
            
            # Check if registration was successful
            # The result structure may vary, but check for common success indicators
            if result.get("status") == "registered" or result.get("agent") == request.agent_address:
                logger.info(f"Agent registered successfully: {request.agent_address}")
                
                # Extract transaction hash if available (for on-chain registrations)
                transaction_hash = None
                if isinstance(result, dict):
                    # Check various possible keys for transaction hash
                    transaction_hash = (
                        result.get("transaction_hash") or
                        result.get("tx_hash") or
                        result.get("txHash")
                    )
                
                return RegisterAgentResponse(
                    success=True,
                    message=result.get("message", "Agent registered successfully"),
                    agent_address=request.agent_address,
                    transaction_hash=transaction_hash
                )
            else:
                error_msg = result.get("error", "Unknown registration error") if isinstance(result, dict) else "Registration failed"
                logger.error(f"Agent registration failed: {error_msg}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Registration failed: {error_msg}"
                )
                
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Error during agent registration: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Registration error: {str(e)}"
            )
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in register_agent: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


def load_audits() -> list[Dict[str, Any]]:
    """Load audits from JSON file storage"""
    try:
        if AUDITS_STORAGE_FILE.exists():
            with open(AUDITS_STORAGE_FILE, 'r', encoding='utf-8') as f:
                audits = json.load(f)
                if isinstance(audits, list):
                    return audits
                return []
        return []
    except Exception as e:
        logger.error(f"Error loading audits: {e}", exc_info=True)
        return []


def save_audits(audits: list[Dict[str, Any]]) -> bool:
    """Save audits to JSON file storage"""
    try:
        AUDITS_STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(AUDITS_STORAGE_FILE, 'w', encoding='utf-8') as f:
            json.dump(audits, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Error saving audits: {e}", exc_info=True)
        return False


@app.get("/audits", tags=["Audits"])
def get_all_audits(
    owner: Optional[str] = Query(None, description="Filter by owner wallet address"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    """
    Get all audits, optionally filtered by owner wallet address and/or status.
    
    Args:
        owner: Optional wallet address to filter by
        status: Optional status to filter by
        
    Returns:
        List of audit objects
    """
    logger.info(f"Received request for audits: owner={owner}, status={status}")
    
    try:
        audits = load_audits()
        
        # Filter by owner if provided
        if owner:
            audits = [a for a in audits if a.get("wallet", "").lower() == owner.lower()]
            logger.info(f"Filtered by owner: {len(audits)} audits")
        
        # Filter by status if provided
        if status:
            audits = [a for a in audits if a.get("status", "").lower() == status.lower()]
            logger.info(f"Filtered by status: {len(audits)} audits")
        
        # Convert to frontend format (map backend fields to frontend Audit interface)
        frontend_audits = []
        for audit in audits:
            frontend_audit = {
                "id": audit.get("audit_id", ""),
                "targetAddress": audit.get("targetAddress") or audit.get("target") or "",
                "status": audit.get("status", "pending"),
                "createdAt": audit.get("created_at", ""),
                "updatedAt": audit.get("updated_at", audit.get("created_at", "")),
                "vulnerabilityCount": audit.get("vulnerabilityCount"),
                "riskScore": audit.get("riskScore"),
                "intensity": audit.get("intensity"),
                "ownerAddress": audit.get("wallet"),
                "name": audit.get("name"),
                "description": audit.get("description"),
                "target": audit.get("target"),
                "tags": audit.get("tags", []),
                "difficulty": audit.get("difficulty"),
                "priority": audit.get("priority"),
                "metadata": audit.get("metadata", {})
            }
            frontend_audits.append(frontend_audit)
        
        return {
            "audits": frontend_audits,
            "pagination": {
                "total": len(frontend_audits),
                "limit": 1000,
                "offset": 0,
                "hasMore": False
            }
        }
        
    except Exception as e:
        logger.error(f"Error retrieving audits: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/audit/create", response_model=CreateAuditResponse, tags=["Audits"])
def create_audit(request: CreateAuditRequest):
    """
    Create a new audit project.
    
    Args:
        request: CreateAuditRequest with audit details
        
    Returns:
        CreateAuditResponse with audit_id, name, created_at, status, and metadata
        
    Raises:
        HTTPException: If audit creation fails
    """
    logger.info(f"Received audit creation request: name={request.name}, wallet={request.wallet}")
    
    try:
        # Generate audit ID
        audit_id = str(uuid.uuid4())
        created_at = datetime.now().isoformat()
        
        # Generate random placeholder data for missing fields
        placeholder_descriptions = [
            "Comprehensive security audit of smart contract implementation",
            "Full-stack security assessment and vulnerability analysis",
            "Penetration testing and security review of decentralized application",
            "Smart contract audit focusing on access control and reentrancy",
            "Security analysis of DeFi protocol with focus on economic attacks",
            "Comprehensive audit covering smart contracts, frontend, and infrastructure",
            "Security review of blockchain application with emphasis on gas optimization",
        ]
        
        placeholder_targets = [
            "0x" + "".join(random.choices("0123456789abcdef", k=40)),
            "https://github.com/example/contracts",
            "https://example.com/api",
            "https://app.example.com",
        ]
        
        placeholder_tags = [
            ["security", "smart-contract", "web3"],
            ["defi", "ethereum", "audit"],
            ["blockchain", "solidity", "security"],
            ["web3", "crypto", "vulnerability"],
            ["smart-contract", "security", "audit"],
        ]
        
        placeholder_difficulties = ["low", "medium", "high", "critical"]
        placeholder_priorities = ["low", "medium", "high", "urgent"]
        placeholder_intensities = ["quick", "deep"]
        
        # Populate missing fields with random placeholders
        description = request.description or random.choice(placeholder_descriptions)
        target = request.target or random.choice(placeholder_targets)
        targetAddress = request.targetAddress or request.target or target
        tags = request.tags or random.choice(placeholder_tags)
        difficulty = request.difficulty or random.choice(placeholder_difficulties)
        priority = request.priority or random.choice(placeholder_priorities)
        intensity = random.choice(placeholder_intensities)
        
        # Generate random metrics
        vulnerability_count = random.randint(0, 15)
        risk_score = random.randint(20, 95)
        
        # Build audit object
        audit = {
            "audit_id": audit_id,
            "name": request.name,
            "description": description,
            "target": target,
            "targetAddress": targetAddress,
            "tags": tags,
            "difficulty": difficulty,
            "priority": priority,
            "wallet": request.wallet,
            "status": "pending",
            "created_at": created_at,
            "updated_at": created_at,
            "vulnerabilityCount": vulnerability_count,
            "riskScore": risk_score,
            "intensity": intensity,
            "metadata": {
                "description": description,
                "target": target,
                "targetAddress": targetAddress,
                "tags": tags,
                "difficulty": difficulty,
                "priority": priority,
                "intensity": intensity,
                "vulnerabilityCount": vulnerability_count,
                "riskScore": risk_score,
            }
        }
        
        # Load existing audits
        audits = load_audits()
        
        # Add new audit
        audits.append(audit)
        
        # Save audits
        if not save_audits(audits):
            raise HTTPException(
                status_code=500,
                detail="Failed to save audit to storage"
            )
        
        logger.info(f"Audit created successfully: audit_id={audit_id}")
        
        return CreateAuditResponse(
            audit_id=audit_id,
            name=request.name,
            created_at=created_at,
            status="pending",
            metadata=audit["metadata"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating audit: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/audit/{audit_id}/logs", tags=["Logs"])
def get_audit_logs(audit_id: str = PathParam(..., description="Audit ID to retrieve logs for")):
    """
    Get logs for a specific audit ID.
    
    Args:
        audit_id: The audit ID to retrieve logs for
        
    Returns:
        JSON object with logs array and metadata
        
    Raises:
        HTTPException: If logs cannot be retrieved
    """
    logger.info(f"Received request for audit logs: audit_id={audit_id}")
    
    try:
        # Import redis client
        try:
            from redis_client import get_logs, is_redis_available
        except ImportError:
            logger.warning("redis_client module not available, returning empty logs")
            return {
                "success": True,
                "audit_id": audit_id,
                "logs": [],
                "count": 0,
                "message": "Redis client not available, logs may not be stored"
            }
        
        # Check if Redis is available
        if not is_redis_available():
            logger.warning("Redis not available, returning empty logs")
            return {
                "success": True,
                "audit_id": audit_id,
                "logs": [],
                "count": 0,
                "message": "Redis not available, logs may not be stored"
            }
        
        # Get logs from Redis
        try:
            logs = get_logs(audit_id=audit_id, limit=1000, offset=0)
            logger.info(f"Retrieved {len(logs)} log entries for audit {audit_id}")
            
            return {
                "success": True,
                "audit_id": audit_id,
                "logs": logs,
                "count": len(logs)
            }
        except Exception as e:
            logger.error(f"Error retrieving logs from Redis: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve logs: {str(e)}"
            )
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_audit_logs: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


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
