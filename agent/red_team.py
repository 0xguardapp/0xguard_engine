from uagents import Agent, Context, Model, Protocol  # pyright: ignore[reportMissingImports]
import agentverse_patch  # ⚡ Adds enable_agentverse() + use_mailbox()
from uagents_core.contrib.protocols.chat import (  # pyright: ignore[reportMissingImports]
    ChatMessage,
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec
)
import sys
import os
import httpx  # pyright: ignore[reportMissingImports]
from pathlib import Path

# Add agent directory to path for logger import
sys.path.insert(0, str(Path(__file__).parent))
from logger import log
from unibase import get_known_exploits, save_exploit, format_exploit_message
from config import get_config

# Agent Registry Integration
try:
    from agent_registry_adapter import AgentRegistryAdapter
    from unibase_agent_store import UnibaseAgentStore
    REGISTRY_AVAILABLE = True
except ImportError:
    REGISTRY_AVAILABLE = False
    log("RedTeam", "WARNING: Agent registry modules not available", "⚠️", "warning")

# Load configuration
config = get_config()

# ASI.Cloud API Configuration (from config)
ASI_API_KEY = config.ASI_API_KEY
ASI_API_URL = os.getenv("ASI_API_URL", "https://api.asi.cloud/v1/chat/completions")

# AgentVerse API Configuration (from config)
AGENTVERSE_KEY = config.AGENTVERSE_KEY


class AttackMessage(Model):
    payload: str


class ResponseMessage(Model):
    status: str
    message: str


async def generate_attack() -> str:
    """
    Generate a unique SQL injection attack string using ASI.Cloud API.
    
    Returns:
        str: Generated SQL injection string, or fallback payload if API fails
    """
    prompt = "You are a penetration tester. Generate a unique SQL injection string. Return only the string."
    
    # Skip API call if ASI_API_KEY is not configured
    if not ASI_API_KEY or not ASI_API_KEY.strip():
        log("ASI.Cloud", "ASI_API_KEY not configured, using fallback payload", "🧠", "info")
        return "'; DROP TABLE users; --"  # Fallback SQL injection payload
    
    try:
        log("ASI.Cloud", "Generating SQL injection variant based on previous failure...", "🧠", "info")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                ASI_API_URL,
                headers={
                    "Authorization": f"Bearer {ASI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4",
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 100,
                    "temperature": 0.7,
                },
            )
            
            if response.status_code == 200:
                data = response.json()
                attack_string = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                
                if attack_string:
                    log("ASI.Cloud", f"Generated attack vector: {attack_string}", "🧠", "info")
                    return attack_string
                else:
                    log("ASI.Cloud", "Empty response from API, using fallback", "🧠", "info")
            else:
                log("ASI.Cloud", f"API error: {response.status_code} - {response.text}", "🧠", "info")
                
    except httpx.TimeoutException:
        log("ASI.Cloud", "API request timeout, using fallback", "🧠", "info")
    except httpx.RequestError as e:
        log("ASI.Cloud", f"API request failed: {str(e)}, using fallback", "🧠", "info")
    except Exception as e:
        log("ASI.Cloud", f"Unexpected error: {str(e)}, using fallback", "🧠", "info")
    
    # Fallback to a simple SQL injection pattern
    fallback_payloads = [
        "' OR '1'='1",
        "admin' --",
        "' UNION SELECT NULL--",
        "1' OR '1'='1",
    ]
    import random
    fallback = random.choice(fallback_payloads)
    log("ASI.Cloud", f"Using fallback payload: {fallback}", "🧠", "info")
    return fallback


def create_red_team_agent(
    target_address: str,
    port: int = None,
    judge_address: str = None,
) -> Agent:
    # Get configuration from config.py
    agent_ip = os.getenv("RED_TEAM_IP") or os.getenv("AGENT_IP", "localhost")
    agent_port = port or int(os.getenv("AGENT_PORT_RED_TEAM") or config.RED_TEAM_PORT)
    # All agents use TARGET_SECRET_KEY as seed for consistency (can be overridden via RED_TEAM_SEED or AGENT_SEED)
    agent_seed = os.getenv("RED_TEAM_SEED") or os.getenv("AGENT_SEED") or config.TARGET_SECRET_KEY
    
    # PHASE 3: Instantiate agent with name, seed, and port only
    red_team = Agent(
        name="red-team-agent",
        seed=agent_seed,
        port=agent_port,
    )
    
    # After agent = Agent(...)
    AGENTVERSE_KEY = config.AGENTVERSE_KEY
    MAILBOX_KEY = config.MAILBOX_KEY or os.getenv("RED_TEAM_MAILBOX_KEY")
    
    if AGENTVERSE_KEY:
        try:
            red_team.enable_agentverse(AGENTVERSE_KEY)
            log("AgentVerse", "Agent successfully registered with AgentVerse", "🌐")
        except Exception as e:
            log("AgentVerse", f"Failed to register with AgentVerse: {e}", "❌")
    
    if MAILBOX_KEY:
        try:
            red_team.use_mailbox(MAILBOX_KEY)
            log("Mailbox", "Mailbox enabled", "📫")
        except Exception as e:
            log("Mailbox", f"Failed to initialize mailbox: {e}", "❌")
    
    # Include the Chat Protocol (optional - only for Agentverse registration)
    # Note: This may fail verification in some uagents versions, but core functionality works without it
    # CRITICAL: Error handling is required - without it, agents will crash at startup if protocol fails to load
    try:
        chat_proto = Protocol(spec=chat_protocol_spec)
        red_team.include(chat_proto)
    except Exception as e:
        # Chat protocol is optional - core agent communication works without it
        # Only needed for Agentverse registration features
        # Log the error for debugging but don't crash the agent
        log("RedTeam", f"Chat Protocol inclusion failed (optional): {type(e).__name__}: {e}", "🔴", "info")
        # Agent will continue to function without chat protocol

    # Fallback payloads (used if ASI API fails)
    fallback_payloads = [
        "admin",
        "root",
        "password",
        "123456",
        "fetch_ai_2024",
    ]

    state = {
        "attack_count": 0,
        "attack_complete": False,
        "max_attacks": 50,  # Limit to prevent infinite loops
        "known_exploits": set(),  # Set of known exploit strings from Unibase
        "last_payload": None,  # Track last sent payload to save on SUCCESS
    }
    
    # Initialize agent registry adapter
    registry_adapter = None
    unibase_store = None
    if REGISTRY_AVAILABLE:
        try:
            unibase_store = UnibaseAgentStore()
            registry_adapter = AgentRegistryAdapter(unibase_store=unibase_store)
            log("RedTeam", "Agent registry adapter initialized", "📝", "info")
        except Exception as e:
            log("RedTeam", f"Failed to initialize registry adapter: {str(e)}", "⚠️", "warning")

    @red_team.on_event("startup")
    async def introduce(ctx: Context):
        ctx.logger.info(f"Red Team Agent started: {red_team.address}")
        ctx.logger.info(f"Target: {target_address}")
        log("RedTeam", f"Red Team Agent started: {red_team.address}", "🔴", "info")
        log("RedTeam", f"Target: {target_address}", "🔴", "info")
        
        # Initialize agent identity in registry
        if registry_adapter:
            try:
                from datetime import datetime
                identity_data = {
                    "name": "Red Team Agent",
                    "role": "penetration_tester",
                    "capabilities": ["exploit_generation", "vulnerability_discovery"],
                    "version": "1.0.0",
                    "address": red_team.address,
                    "target": target_address,
                    "started_at": datetime.now().isoformat()
                }
                result = registry_adapter.register_agent(red_team.address, identity_data)
                if result.get("success"):
                    log("RedTeam", f"[agent_identity_registered] Agent: {red_team.address}, Unibase Key: {result.get('unibase', {}).get('key', 'N/A')}", "📝", "info")
                    # Update memory with startup info
                    if unibase_store:
                        unibase_store.update_agent_memory(red_team.address, {
                            "startup_time": datetime.now().isoformat(),
                            "status": "active",
                            "target": target_address
                        })
                        log("RedTeam", f"[agent_memory_updated] Agent: {red_team.address}", "💾", "info")
            except Exception as e:
                log("RedTeam", f"Failed to register agent identity: {str(e)}", "⚠️", "warning")
        
        # Agentverse registration is now handled via enable_agentverse() during agent creation
        
        # Read known exploits from Unibase on startup
        try:
            # Membase will be used automatically if USE_MEMBASE=true in environment
            # Pass None to auto-detect based on MEMBASE_ENABLED
            state["known_exploits"] = await get_known_exploits(use_mcp=None, mcp_messages=None)
            
            if state["known_exploits"]:
                log("Unibase", f"Loaded {len(state['known_exploits'])} known exploits from Hivemind Memory", "💾", "info")
                for exploit in list(state["known_exploits"])[:5]:  # Show first 5
                    ctx.logger.info(f"Known exploit: {exploit}")
            else:
                log("Unibase", "No known exploits found in Hivemind Memory", "💾", "info")
        except Exception as e:
            ctx.logger.warning(f"Failed to load exploits from Unibase: {str(e)}")
            log("Unibase", f"Error loading exploits: {str(e)}", "💾", "info")
            state["known_exploits"] = set()

    @red_team.on_interval(period=3.0)
    async def send_attack(ctx: Context):
        if state["attack_complete"] or state["attack_count"] >= state["max_attacks"]:
            return

        # Generate attack using ASI.Cloud API
        payload = await generate_attack()
        
        # Track the payload we're sending so we can save it if it succeeds
        state["last_payload"] = payload
        
        state["attack_count"] += 1
        ctx.logger.info(
            f"Sending attack #{state['attack_count']}: '{payload}'"
        )
        log("RedTeam", f"Executing vector: '{payload}'", "🔴", "attack")
        
        # Update reputation after attack action (+1 for active testing)
        if registry_adapter:
            try:
                from datetime import datetime
                metadata = {
                    "action": "attack_sent",
                    "attack_count": state["attack_count"],
                    "payload": payload[:100],  # Truncate for storage
                    "timestamp": datetime.now().isoformat()
                }
                rep_result = registry_adapter.record_agent_reputation(red_team.address, delta=1, metadata=metadata)
                if rep_result.get("success"):
                    log("RedTeam", f"[agent_reputation_updated] Agent: {red_team.address}, Delta: +1 (attack), New Score: {rep_result.get('combined', {}).get('on_chain_score', 'N/A')}", "📊", "info")
            except Exception as e:
                log("RedTeam", f"Failed to update reputation after attack: {str(e)}", "⚠️", "warning")

        # Send attack to Target
        await ctx.send(
            target_address,
            AttackMessage(payload=payload),
        )
        
        # Also send to Judge for monitoring (if Judge address is provided)
        if judge_address:
            try:
                await ctx.send(judge_address, AttackMessage(payload=payload))
            except Exception as e:
                ctx.logger.debug(f"Could not send to Judge: {str(e)}")

    @red_team.on_message(model=ResponseMessage)
    async def handle_response(ctx: Context, sender: str, msg: ResponseMessage):
        ctx.logger.info(f"Response received: {msg.status}")
        ctx.logger.info(f"Message: {msg.message}")
        log("RedTeam", f"Response received: {msg.status} - {msg.message}", "🔴", "info")

        if msg.status == "SUCCESS":
            ctx.logger.info("SUCCESS! Secret key found!")
            log("RedTeam", "SUCCESS! Secret key found! Vulnerability exploited!", "🔴", "vulnerability", is_vulnerability=True)
            
            # Save the successful exploit to Unibase
            successful_payload = state.get("last_payload")
            if successful_payload and successful_payload not in state["known_exploits"]:
                try:
                    # Save exploit (will use Membase if enabled, otherwise file fallback)
                    # Pass None to auto-detect based on MEMBASE_ENABLED
                    await save_exploit(successful_payload, state["known_exploits"], use_mcp=None)
                except Exception as e:
                    ctx.logger.warning(f"Failed to save exploit to Unibase: {str(e)}")
                    log("Unibase", f"Error saving exploit: {str(e)}", "💾", "info")
            elif successful_payload in state["known_exploits"]:
                log("Unibase", f"Exploit already known, skipping save: {successful_payload}", "💾", "info")
            
            # Update reputation after successful exploit (trusted task) (+10 for successful exploit)
            if registry_adapter:
                try:
                    from datetime import datetime
                    metadata = {
                        "action": "exploit_success",
                        "payload": successful_payload[:100] if successful_payload else "unknown",
                        "attack_count": state["attack_count"],
                        "timestamp": datetime.now().isoformat()
                    }
                    rep_result = registry_adapter.record_agent_reputation(red_team.address, delta=10, metadata=metadata)
                    if rep_result.get("success"):
                        log("RedTeam", f"[agent_reputation_updated] Agent: {red_team.address}, Delta: +10 (exploit success), New Score: {rep_result.get('combined', {}).get('on_chain_score', 'N/A')}", "📊", "info")
                    
                    # Validate agent after trusted task (successful exploit discovery)
                    validation_data = {
                        "validator": "system",
                        "validation_type": "exploit_discovery",
                        "payload": successful_payload[:100] if successful_payload else "unknown",
                        "result": "success",
                        "timestamp": datetime.now().isoformat()
                    }
                    val_result = registry_adapter.validate_agent(red_team.address, validation_data)
                    if val_result.get("success"):
                        log("RedTeam", f"[agent_validated] Agent: {red_team.address}, Type: exploit_discovery, Payload: {successful_payload[:16] if successful_payload else 'unknown'}...", "✅", "info")
                    
                    # Update memory with exploit success info
                    if unibase_store:
                        unibase_store.update_agent_memory(red_team.address, {
                            "last_exploit_success": datetime.now().isoformat(),
                            "total_exploits": state.get("total_exploits", 0) + 1,
                            "last_payload": successful_payload[:100] if successful_payload else None
                        })
                        log("RedTeam", f"[agent_memory_updated] Agent: {red_team.address}", "💾", "info")
                        state["total_exploits"] = state.get("total_exploits", 0) + 1
                        
                except Exception as e:
                    log("RedTeam", f"Failed to update registry after exploit success: {str(e)}", "⚠️", "warning")
            
            state["attack_complete"] = True
        elif msg.status == "DENIED":
            ctx.logger.info("Attack denied, continuing...")
            log("RedTeam", f"Attack denied: {msg.message}. Continuing attack sequence...", "🔴", "info")
        else:
            ctx.logger.warning(f"Unknown response status: {msg.status}")
            log("RedTeam", f"Unknown response status: {msg.status} - {msg.message}", "🔴", "info")

    return red_team


if __name__ == "__main__":
    agent = create_red_team_agent(
        target_address="agent1qf2mssnkhf29fk7vj2fy8ekmhdfke0ptu4k9dyvfcuk7tt6easatge9z96d",
    )
    agent.run()