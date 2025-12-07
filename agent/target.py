from uagents import Agent, Context, Model, Protocol
from uagents_core.contrib.protocols.chat import (
    AgentContent,
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec
)
from uagents_core.utils.registration import (  # pyright: ignore[reportMissingImports]
    register_chat_agent,
    RegistrationRequestCredentials,
)
import sys
import os
import httpx  # pyright: ignore[reportMissingImports]
from pathlib import Path

# Add agent directory to path for logger import
sys.path.insert(0, str(Path(__file__).parent))
from logger import log
from config import get_config

# Agent Registry Integration
try:
    from agent_registry_adapter import AgentRegistryAdapter
    from unibase_agent_store import UnibaseAgentStore
    REGISTRY_AVAILABLE = True
except ImportError:
    REGISTRY_AVAILABLE = False
    log("Target", "WARNING: Agent registry modules not available", "⚠️", "warning")

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


# SECRET_KEY from config
SECRET_KEY = config.TARGET_SECRET_KEY


async def analyze_attack_with_asi(payload: str) -> dict:
    """
    Use ASI.Cloud API to analyze incoming attack payloads and classify them.
    
    Args:
        payload: The attack payload to analyze
        
    Returns:
        dict: Analysis results with attack_type, threat_level, and defensive_recommendation
    """
    prompt = f"""You are a cybersecurity expert analyzing an attack payload.
    
Attack Payload: {payload}

Analyze this attack and provide:
1. Attack type (SQL Injection, XSS, Command Injection, etc.)
2. Threat level (LOW, MEDIUM, HIGH, CRITICAL)
3. Brief defensive recommendation

Return JSON format: {{"attack_type": "string", "threat_level": "string", "defensive_recommendation": "string"}}"""
    
    try:
        log("ASI.Cloud", "Analyzing attack payload...", "🧠", "info")
        
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
                    "max_tokens": 200,
                    "temperature": 0.3,
                },
            )
            
            if response.status_code == 200:
                data = response.json()
                analysis_text = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                
                if analysis_text:
                    log("ASI.Cloud", f"Attack analysis received", "🧠", "info")
                    # Try to parse JSON from response
                    import json
                    try:
                        # Extract JSON from markdown code blocks if present
                        if "```json" in analysis_text:
                            analysis_text = analysis_text.split("```json")[1].split("```")[0].strip()
                        elif "```" in analysis_text:
                            analysis_text = analysis_text.split("```")[1].split("```")[0].strip()
                        analysis = json.loads(analysis_text)
                        return analysis
                    except:
                        # Fallback: return default analysis
                        pass
                        
    except httpx.TimeoutException:
        log("ASI.Cloud", "API request timeout, using default attack classification", "🧠", "info")
    except httpx.RequestError as e:
        log("ASI.Cloud", f"API request failed: {str(e)}, using default attack classification", "🧠", "info")
    except Exception as e:
        log("ASI.Cloud", f"Unexpected error: {str(e)}, using default attack classification", "🧠", "info")
    
    # Default fallback analysis
    return {
        "attack_type": "Unknown",
        "threat_level": "MEDIUM",
        "defensive_recommendation": "Implement input validation and sanitization."
    }


def create_target_agent(port: int = None, judge_address: str = None) -> Agent:
    # Get configuration from config.py
    agent_ip = os.getenv("TARGET_IP") or os.getenv("AGENT_IP", "localhost")
    agent_port = port or config.TARGET_PORT
    agent_seed = os.getenv("TARGET_SEED") or os.getenv("AGENT_SEED", "target_secret_seed_phrase")
    use_mailbox = os.getenv("USE_MAILBOX", "true").lower() == "true"
    
    target = Agent(
        name="target_agent",
        port=agent_port,
        seed=agent_seed,  # CRITICAL: Don't hardcode seeds in production!
        endpoint=[f"http://{agent_ip}:{agent_port}/submit"],
        mailbox=use_mailbox,  # Recommended for Agentverse
    )
    
    # Include the Chat Protocol (optional - only for Agentverse registration)
    # Note: This may fail verification in some uagents versions, but core functionality works without it
    # CRITICAL: Error handling is required - without it, agents will crash at startup if protocol fails to load
    try:
        chat_proto = Protocol(spec=chat_protocol_spec)
        target.include(chat_proto)
    except Exception as e:
        # Chat protocol is optional - core agent communication works without it
        # Only needed for Agentverse registration features
        # Log the error for debugging but don't crash the agent
        log("Target", f"Chat Protocol inclusion failed (optional): {type(e).__name__}: {e}", "🎯", "info")
        # Agent will continue to function without chat protocol

    # Initialize agent registry adapter
    registry_adapter = None
    unibase_store = None
    if REGISTRY_AVAILABLE:
        try:
            unibase_store = UnibaseAgentStore()
            registry_adapter = AgentRegistryAdapter(unibase_store=unibase_store)
            log("Target", "Agent registry adapter initialized", "📝", "info")
        except Exception as e:
            log("Target", f"Failed to initialize registry adapter: {str(e)}", "⚠️", "warning")
    
    @target.on_event("startup")
    async def introduce(ctx: Context):
        ctx.logger.info(f"Target Agent started: {target.address}")
        ctx.logger.info("Protecting SECRET_KEY...")
        log("Target", f"Target Agent started: {target.address}", "🎯", "info")
        log("Target", f"Listening on port {agent_port}", "🎯", "info")
        
        # Initialize agent identity in registry
        if registry_adapter:
            try:
                from datetime import datetime
                identity_data = {
                    "name": "Target Agent",
                    "role": "defender",
                    "capabilities": ["attack_analysis", "defense"],
                    "version": "1.0.0",
                    "address": target.address,
                    "started_at": datetime.now().isoformat()
                }
                result = registry_adapter.register_agent(target.address, identity_data)
                if result.get("success"):
                    log("Target", f"[agent_identity_registered] Agent: {target.address}, Unibase Key: {result.get('unibase', {}).get('key', 'N/A')}", "📝", "info")
                    # Update memory with startup info
                    if unibase_store:
                        unibase_store.update_agent_memory(target.address, {
                            "startup_time": datetime.now().isoformat(),
                            "status": "active"
                        })
                        log("Target", f"[agent_memory_updated] Agent: {target.address}", "💾", "info")
            except Exception as e:
                log("Target", f"Failed to register agent identity: {str(e)}", "⚠️", "warning")
        
        # Register with Agentverse
        try:
            agentverse_key = config.AGENTVERSE_KEY
            agent_seed_phrase = os.environ.get("AGENT_SEED_PHRASE") or agent_seed
            endpoint_url = f"http://{agent_ip}:{agent_port}/submit"
            
            if agentverse_key:
                register_chat_agent(
                    "target",
                    endpoint_url,
                    active=True,
                    credentials=RegistrationRequestCredentials(
                        agentverse_api_key=agentverse_key,
                        agent_seed_phrase=agent_seed_phrase,
                    ),
                )
                ctx.logger.info(f"Target Agent registered with Agentverse at {endpoint_url}")
                log("Target", f"Registered with Agentverse: {endpoint_url}", "🎯", "info")
            else:
                ctx.logger.warning("AGENTVERSE_KEY not set, skipping Agentverse registration")
        except Exception as e:
            ctx.logger.error(f"Failed to register with Agentverse: {str(e)}")
            log("Target", f"Agentverse registration error: {str(e)}", "🎯", "info")

    @target.on_message(model=AttackMessage)
    async def handle_attack(ctx: Context, sender: str, msg: AttackMessage):
        ctx.logger.info(f"Received attack from {sender}: '{msg.payload}'")
        log("Target", f"Processing input: '{msg.payload}'...", "🎯", "info")

        # Use ASI API to analyze the attack
        attack_analysis = await analyze_attack_with_asi(msg.payload)
        attack_type = attack_analysis.get("attack_type", "Unknown")
        threat_level = attack_analysis.get("threat_level", "MEDIUM")
        recommendation = attack_analysis.get("defensive_recommendation", "Implement input validation.")
        
        log("Target", f"ASI Analysis: {attack_type} detected (Threat: {threat_level})", "🧠", "info")
        log("Target", f"Defensive recommendation: {recommendation}", "🧠", "info")

        if msg.payload == SECRET_KEY:
            response = ResponseMessage(
                status="SUCCESS",
                message=f"Access Granted! Flag: {SECRET_KEY}",
            )
            ctx.logger.info("SECRET_KEY COMPROMISED!")
            log("Target", f"Processing input... Vulnerability triggered! Leaking SECRET_KEY.", "🎯", "vulnerability", is_vulnerability=True)
        else:
            response = ResponseMessage(
                status="DENIED",
                message="Access Denied",
            )
            ctx.logger.info("Attack blocked")
            log("Target", f"Attack blocked: '{msg.payload}'", "🎯", "info")
            
            # Update reputation after successfully blocking attack (+2 for defense)
            if registry_adapter:
                try:
                    from datetime import datetime
                    metadata = {
                        "action": "attack_blocked",
                        "attack_type": attack_type,
                        "threat_level": threat_level,
                        "payload": msg.payload[:100],  # Truncate for storage
                        "timestamp": datetime.now().isoformat()
                    }
                    rep_result = registry_adapter.record_agent_reputation(target.address, delta=2, metadata=metadata)
                    if rep_result.get("success"):
                        log("Target", f"[agent_reputation_updated] Agent: {target.address}, Delta: +2 (defense), New Score: {rep_result.get('combined', {}).get('on_chain_score', 'N/A')}", "📊", "info")
                except Exception as e:
                    log("Target", f"Failed to update reputation after defense: {str(e)}", "⚠️", "warning")

        # Send response to Red Team (original sender)
        await ctx.send(sender, response)
        
        # Also send to Judge for monitoring (if Judge address is provided)
        if judge_address:
            try:
                await ctx.send(judge_address, response)
            except Exception as e:
                ctx.logger.debug(f"Could not send to Judge: {str(e)}")
        
        # Update memory with attack handling info
        if unibase_store:
            try:
                from datetime import datetime
                unibase_store.update_agent_memory(target.address, {
                    "last_attack_handled": datetime.now().isoformat(),
                    "last_attack_type": attack_type,
                    "last_threat_level": threat_level,
                    "total_attacks_handled": ctx.storage.get("total_attacks_handled", 0) + 1 if hasattr(ctx, 'storage') else 1
                })
                log("Target", f"[agent_memory_updated] Agent: {target.address}", "💾", "info")
            except Exception as e:
                log("Target", f"Failed to update memory: {str(e)}", "⚠️", "warning")

    return target


if __name__ == "__main__":
    agent = create_target_agent()
    agent.run()