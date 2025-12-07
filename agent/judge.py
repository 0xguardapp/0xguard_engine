"""
Judge Agent - Monitors Red Team and Target communications.
Triggers Unibase transactions for bounty tokens when vulnerabilities are discovered.
"""
from uagents import Agent, Context, Model, Protocol  # pyright: ignore[reportMissingImports]
import agentverse_patch  # ⚡ Adds enable_agentverse() + use_mailbox()
from uagents_core.contrib.protocols.chat import (  # pyright: ignore[reportMissingImports]
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec
)
import sys
import os
import httpx  # pyright: ignore[reportMissingImports]
from pathlib import Path
from datetime import datetime

# Add agent directory to path for logger import
sys.path.insert(0, str(Path(__file__).parent))
from logger import log
from unibase import save_bounty_token, UnibaseClient
from config import get_config
from midnight_client import (
    submit_proof,
    verify_audit_status,
    generate_audit_id,
    check_midnight_health,
    SubmitProofResult
)
from proof_verifier import (
    verify_audit_proof,
    batch_verify,
    get_verification_proof,
    ProofVerificationResult
)

# Agent Registry Integration
try:
    from agent_registry_adapter import AgentRegistryAdapter
    from unibase_agent_store import UnibaseAgentStore
    REGISTRY_AVAILABLE = True
except ImportError:
    REGISTRY_AVAILABLE = False
    log("Judge", "WARNING: Agent registry modules not available", "⚠️", "warning")

# Load configuration
config = get_config()

# ASI.Cloud API Configuration (from config)
ASI_API_KEY = config.ASI_API_KEY
ASI_API_URL = os.getenv("ASI_API_URL", "https://api.asi.cloud/v1/chat/completions")

# AgentVerse API Configuration (from config)
AGENTVERSE_KEY = config.AGENTVERSE_KEY

# Import message models - define locally to avoid circular imports
class ResponseMessage(Model):
    status: str
    message: str


class AttackMessage(Model):
    payload: str


# SECRET_KEY from target - use configuration
SECRET_KEY = config.TARGET_SECRET_KEY


async def analyze_vulnerability_with_asi(exploit_payload: str, response_message: str) -> dict:
    """
    Use ASI.Cloud API to analyze vulnerability severity and generate risk assessment.
    
    Args:
        exploit_payload: The exploit payload that triggered the vulnerability
        response_message: The response message from the target
        
    Returns:
        dict: Analysis results with risk_score, severity, and recommendations
    """
    prompt = f"""You are a cybersecurity expert analyzing a vulnerability. 
    
Exploit Payload: {exploit_payload}
Target Response: {response_message}

Analyze this vulnerability and provide:
1. Risk score (0-100)
2. Severity level (LOW, MEDIUM, HIGH, CRITICAL)
3. Brief recommendation

Return JSON format: {{"risk_score": number, "severity": "string", "recommendation": "string"}}"""
    
    # Skip API call if ASI_API_KEY is not configured
    if not ASI_API_KEY or not ASI_API_KEY.strip():
        log("ASI.Cloud", "ASI_API_KEY not configured, using default risk assessment", "🧠", "info")
        return {
            "risk_score": 75,
            "severity": "HIGH",
            "recommendation": "Review vulnerability manually"
        }
    
    try:
        log("ASI.Cloud", "Analyzing vulnerability severity...", "🧠", "info")
        
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
                    log("ASI.Cloud", f"Vulnerability analysis received", "🧠", "info")
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
        log("ASI.Cloud", "API request timeout, using default risk assessment", "🧠", "info")
    except httpx.RequestError as e:
        log("ASI.Cloud", f"API request failed: {str(e)}, using default risk assessment", "🧠", "info")
    except Exception as e:
        log("ASI.Cloud", f"Unexpected error: {str(e)}, using default risk assessment", "🧠", "info")
    
    # Default fallback analysis
    return {
        "risk_score": 98,
        "severity": "CRITICAL",
        "recommendation": "Immediate remediation required. Secret key exposure detected."
    }


def create_judge_agent(port: int = None) -> Agent:
    """
    Create a Judge agent that monitors Red Team and Target communications.
    
    Args:
        port: Port for the Judge agent (overrides env var if provided)
        
    Returns:
        Agent: Configured Judge agent
    """
    # Get configuration from config.py
    agent_ip = os.getenv("JUDGE_IP") or os.getenv("AGENT_IP", "localhost")
    agent_port = port or int(os.getenv("AGENT_PORT_JUDGE") or config.JUDGE_PORT)
    # All agents use TARGET_SECRET_KEY as seed for consistency (can be overridden via JUDGE_SEED or AGENT_SEED)
    agent_seed = os.getenv("JUDGE_SEED") or os.getenv("AGENT_SEED") or config.TARGET_SECRET_KEY
    
    # PHASE 3: Instantiate agent with name, seed, and port only
    judge = Agent(
        name="judge-agent",
        seed=agent_seed,
        port=agent_port,
    )
    
    # After agent = Agent(...)
    AGENTVERSE_KEY = config.AGENTVERSE_KEY
    MAILBOX_KEY = config.MAILBOX_KEY or os.getenv("JUDGE_MAILBOX_KEY")
    
    if AGENTVERSE_KEY:
        try:
            judge.enable_agentverse(AGENTVERSE_KEY)
            log("AgentVerse", "Agent successfully registered with AgentVerse", "🌐")
        except Exception as e:
            log("AgentVerse", f"Failed to register with AgentVerse: {e}", "❌")
    
    if MAILBOX_KEY:
        try:
            judge.use_mailbox(MAILBOX_KEY)
            log("Mailbox", "Mailbox enabled", "📫")
        except Exception as e:
            log("Mailbox", f"Failed to initialize mailbox: {e}", "❌")
    
    # Include the Chat Protocol (optional - only for Agentverse registration)
    # Note: This may fail verification in some uagents versions, but core functionality works without it
    # CRITICAL: Error handling is required - without it, agents will crash at startup if protocol fails to load
    try:
        chat_proto = Protocol(spec=chat_protocol_spec)
        judge.include(chat_proto)
    except Exception as e:
        # Chat protocol is optional - core agent communication works without it
        # Only needed for Agentverse registration features
        # Log the error for debugging but don't crash the agent
        log("Judge", f"Chat Protocol inclusion failed (optional): {type(e).__name__}: {e}", "⚖️", "info")
        # Agent will continue to function without chat protocol

    state = {
        "monitored_attacks": {},  # Track attack flow: {red_team_address: last_payload}
        "attack_flow": [],  # Track attack sequence: [(red_team_address, payload, timestamp)]
        "bounties_awarded": 0,
        "audit_proofs": {},  # audit_id -> proof_hash
        "verified_proofs": {},  # proof_id -> ProofVerificationResult
    }
    
    # Initialize agent registry adapter
    registry_adapter = None
    unibase_store = None
    if REGISTRY_AVAILABLE:
        try:
            unibase_store = UnibaseAgentStore()
            registry_adapter = AgentRegistryAdapter(unibase_store=unibase_store)
            log("Judge", "Agent registry adapter initialized", "📝", "info")
        except Exception as e:
            log("Judge", f"Failed to initialize registry adapter: {str(e)}", "⚠️", "warning")

    @judge.on_event("startup")
    async def introduce(ctx: Context):
        ctx.logger.info(f"Judge Agent started: {judge.address}")
        log("Judge", f"Judge Agent started: {judge.address}", "⚖️", "info")
        log("Judge", "Monitoring Red Team and Target communications...", "⚖️", "info")
        
        # Initialize agent identity in registry
        if registry_adapter:
            try:
                identity_data = {
                    "name": "Judge Agent",
                    "role": "monitor",
                    "capabilities": ["vulnerability_detection", "proof_verification", "bounty_distribution"],
                    "version": "1.0.0",
                    "address": judge.address,
                    "started_at": datetime.now().isoformat()
                }
                result = registry_adapter.register_agent(judge.address, identity_data)
                if result.get("success"):
                    log("Judge", f"[agent_identity_registered] Agent: {judge.address}, Unibase Key: {result.get('unibase', {}).get('key', 'N/A')}", "📝", "info")
                    # Update memory with startup info
                    if unibase_store:
                        unibase_store.update_agent_memory(judge.address, {
                            "startup_time": datetime.now().isoformat(),
                            "status": "active"
                        })
                        log("Judge", f"[agent_memory_updated] Agent: {judge.address}", "💾", "info")
            except Exception as e:
                log("Judge", f"Failed to register agent identity: {str(e)}", "⚠️", "warning")
        
        # Agentverse registration is now handled via enable_agentverse() during agent creation

    @judge.on_message(model=AttackMessage)
    async def handle_attack_message(ctx: Context, sender: str, msg: AttackMessage):
        """
        Monitor attack messages from Red Team to track the attack flow.
        """
        ctx.logger.info(f"Judge intercepted attack from {sender}: '{msg.payload}'")
        log("Judge", f"Monitoring attack: {sender} → Target (payload: '{msg.payload}')", "⚖️", "info")
        
        # Track the attack for later correlation with response
        state["monitored_attacks"][sender] = msg.payload
        state["attack_flow"].append((sender, msg.payload, datetime.now().isoformat()))
        
        # Keep only last 10 attacks to prevent memory growth
        if len(state["attack_flow"]) > 10:
            state["attack_flow"] = state["attack_flow"][-10:]
        
        # Update reputation after monitoring action (+1 for active monitoring)
        if registry_adapter:
            try:
                metadata = {
                    "action": "attack_monitoring",
                    "sender": sender,
                    "timestamp": datetime.now().isoformat()
                }
                rep_result = registry_adapter.record_agent_reputation(judge.address, delta=1, metadata=metadata)
                if rep_result.get("success"):
                    log("Judge", f"[agent_reputation_updated] Agent: {judge.address}, Delta: +1 (monitoring), New Score: {rep_result.get('combined', {}).get('on_chain_score', 'N/A')}", "📊", "info")
            except Exception as e:
                log("Judge", f"Failed to update reputation after monitoring: {str(e)}", "⚠️", "warning")

    @judge.on_message(model=ResponseMessage)
    async def handle_target_response(ctx: Context, sender: str, msg: ResponseMessage):
        """
        Monitor Target responses. If SUCCESS with SECRET_KEY, trigger Unibase bounty transaction.
        """
        ctx.logger.info(f"Judge intercepted response from {sender}: {msg.status}")
        log("Judge", "INTERCEPTION. Analyzing Target response against risk matrix.", "⚖️", "info")
        
        # Check if this is a SUCCESS response with SECRET_KEY
        if msg.status == "SUCCESS" and SECRET_KEY in msg.message:
            # Find which Red Team sent the attack (sender is Target, need to find Red Team)
            # In a real scenario, we'd track this better, but for now we'll use the sender context
            red_team_address = None
            exploit_payload = None
            
            # Find which Red Team sent the attack that triggered this SUCCESS
            # The sender here is the Target, so we need to find the Red Team from attack flow
            red_team_address = None
            exploit_payload = None
            
            if state["attack_flow"]:
                # Get the most recent attack (assumes responses come in order)
                red_team_address, exploit_payload, _ = state["attack_flow"][-1]
            elif state["monitored_attacks"]:
                # Fallback: use most recent monitored attack
                red_team_address = list(state["monitored_attacks"].keys())[-1]
                exploit_payload = state["monitored_attacks"][red_team_address]
            else:
                # Final fallback: use placeholder
                red_team_address = "agent1qf2mssnkhf29fk7vj2fy8ekmhdfke0ptu4k9dyvfcuk7tt6easatge9z96d"
                exploit_payload = SECRET_KEY
            
            ctx.logger.info("CRITICAL VULNERABILITY CONFIRMED!")
            
            # Use ASI API to analyze vulnerability severity
            vulnerability_analysis = await analyze_vulnerability_with_asi(exploit_payload, msg.message)
            risk_score = vulnerability_analysis.get("risk_score", 98)
            severity = vulnerability_analysis.get("severity", "CRITICAL")
            recommendation = vulnerability_analysis.get("recommendation", "Immediate remediation required.")
            
            log("Judge", f"CRITICAL VULNERABILITY CONFIRMED. Risk Score: {risk_score}/100. Severity: {severity}", "⚖️", "vulnerability", is_vulnerability=True)
            log("Judge", f"ASI Analysis: {recommendation}", "🧠", "info")
            
            threshold = 90
            
            # Generate audit_id
            timestamp = datetime.now().isoformat()
            audit_id = generate_audit_id(exploit_payload, timestamp)
            
            # Submit ZK proof to Midnight (REAL API CALL - NO SIMULATION)
            try:
                # Check if Midnight is available
                health = await check_midnight_health()
                if not health.get("is_healthy"):
                    error_msg = f"Midnight API unavailable: {health.get('error', 'Unknown error')}"
                    ctx.logger.error(error_msg)
                    log("Judge", error_msg, "⚖️", "error", audit_id=audit_id)
                    log("Judge", "[zk_failure] Midnight API health check failed", "❌", "error", audit_id=audit_id)
                    # Continue anyway - submit_proof will handle retries
                
                # Prepare auditor ID (pad to 64 chars)
                auditor_id = judge.address
                if len(auditor_id) < 64:
                    auditor_id = auditor_id + "0" * (64 - len(auditor_id))
                elif len(auditor_id) > 64:
                    auditor_id = auditor_id[:64]
                
                # Submit proof using real Midnight API
                result: SubmitProofResult = await submit_proof(
                    audit_id=audit_id,
                    exploit_string=exploit_payload,
                    risk_score=risk_score,
                    auditor_id=auditor_id,
                    threshold=threshold
                )
                
                if result.success and result.proof_hash:
                    state["audit_proofs"][audit_id] = result.proof_hash
                    ctx.logger.info(f"Audit proof submitted: {result.proof_hash}")
                    
                    # Get transaction ID (contract tx ID)
                    transaction_id = result.transaction_id or result.proof_hash
                    proof_status = "submitted"
                    
                    # Structured log: proof_submitted with all required fields
                    log("Judge", f"[proof_submitted] Proof Hash: {result.proof_hash}, Transaction ID: {transaction_id}, Status: {proof_status}, Risk Score: {risk_score}, Audit ID: {audit_id}, Auditor: {auditor_id[:16]}", "🔐", "proof", audit_id=audit_id)
                    log("Midnight", f"ZK Proof Minted. Hash: {result.proof_hash}, Transaction ID: {transaction_id}, Risk Score: {risk_score}, Audit ID: {audit_id}, Auditor: {auditor_id[:16]}", "🔐", "proof", audit_id=audit_id)
                    
                    # Check status using verify_audit_status (REAL API CALL)
                    status_result = await verify_audit_status(audit_id)
                    if status_result and status_result.get("is_verified"):
                        proof_status = "verified"
                        # Structured log: proof_verified with all required fields
                        log("Judge", f"[proof_verified] Proof Hash: {result.proof_hash}, Transaction ID: {transaction_id}, Status: {proof_status}, Audit ID: {audit_id}, Verified: true", "✅", "proof", audit_id=audit_id)
                        log("Judge", f"Proof verified on Midnight: {result.proof_hash}", "⚖️", "info", audit_id=audit_id)
                        # Structured log: zk_success
                        log("Judge", f"[zk_success] Proof submitted and verified successfully. Hash: {result.proof_hash}, Transaction ID: {transaction_id}, Status: {proof_status}, Audit ID: {audit_id}", "🎉", "info", audit_id=audit_id)
                        
                        # Update Judge agent reputation after successful proof verification (trusted task)
                        if registry_adapter:
                            try:
                                # Store metadata to Unibase
                                metadata = {
                                    "proof_hash": result.proof_hash,
                                    "transaction_id": transaction_id,
                                    "audit_id": audit_id,
                                    "risk_score": risk_score,
                                    "severity": severity,
                                    "exploit_payload": exploit_payload[:100],  # Truncate for storage
                                    "verified_at": datetime.now().isoformat()
                                }
                                
                                # Update reputation (+5 for successful proof verification)
                                rep_result = registry_adapter.record_agent_reputation(
                                    judge.address,
                                    delta=5,
                                    metadata=metadata
                                )
                                if rep_result.get("success"):
                                    log("Judge", f"[agent_reputation_updated] Agent: {judge.address}, Delta: +5, New Score: {rep_result.get('combined', {}).get('on_chain_score', 'N/A')}", "📊", "info")
                                
                                # Validate agent after trusted task (proof verification)
                                validation_data = {
                                    "validator": "system",
                                    "validation_type": "proof_verification",
                                    "proof_hash": result.proof_hash,
                                    "audit_id": audit_id,
                                    "result": "verified",
                                    "timestamp": datetime.now().isoformat()
                                }
                                val_result = registry_adapter.validate_agent(judge.address, validation_data)
                                if val_result.get("success"):
                                    log("Judge", f"[agent_validated] Agent: {judge.address}, Type: proof_verification, Proof: {result.proof_hash[:16]}...", "✅", "info")
                                
                                # Update memory with proof verification info
                                if unibase_store:
                                    unibase_store.update_agent_memory(judge.address, {
                                        "last_proof_verified": datetime.now().isoformat(),
                                        "total_proofs_verified": state.get("verified_proofs_count", 0) + 1,
                                        "last_audit_id": audit_id
                                    })
                                    log("Judge", f"[agent_memory_updated] Agent: {judge.address}", "💾", "info")
                                    state["verified_proofs_count"] = state.get("verified_proofs_count", 0) + 1
                                    
                            except Exception as e:
                                log("Judge", f"Failed to update registry after proof verification: {str(e)}", "⚠️", "warning")
                        
                        # Optional ERC-3009 payout after successful proof verification
                        erc3009_enabled = os.getenv("ERC3009_PAYOUTS_ENABLED", "false").lower() == "true"
                        if erc3009_enabled and registry_adapter:
                            try:
                                # Note: ERC-3009 payouts would require AgentToken contract integration
                                # This is a placeholder for future implementation
                                log("Judge", f"[erc3009_payout] Payout enabled but not yet implemented for agent: {judge.address}", "💰", "info")
                            except Exception as e:
                                log("Judge", f"ERC-3009 payout error: {str(e)}", "⚠️", "warning")
                        
                        # Reward Red Team after proof verification
                        try:
                            unibase_client = UnibaseClient()
                            reward_tx = unibase_client.send_bounty(
                                recipient=red_team_address,
                                amount=100  # test amount
                            )
                            ctx.logger.info({
                                "event": "bounty_dispatched",
                                "recipient": red_team_address,
                                "amount": 100,
                                "tx": reward_tx
                            })
                        except Exception as e:
                            ctx.logger.error({
                                "event": "bounty_failed",
                                "error": str(e)
                            })
                    else:
                        proof_status = "pending"
                        # Proof submitted but not yet verified
                        log("Judge", f"Proof submitted but verification pending: {result.proof_hash}, Transaction ID: {transaction_id}, Status: {proof_status}", "⚖️", "warning", audit_id=audit_id)
                else:
                    error_msg = result.error or "Unknown error during proof submission"
                    ctx.logger.warning(f"Failed to submit audit proof: {error_msg}")
                    log("Judge", f"Proof submission failed: {error_msg}", "⚖️", "error", audit_id=audit_id)
                    # Structured log: zk_failure
                    log("Judge", f"[zk_failure] Proof submission failed. Error: {error_msg}, Audit ID: {audit_id}", "❌", "error", audit_id=audit_id)
                    
            except Exception as e:
                error_msg = f"Error submitting audit proof: {str(e)}"
                ctx.logger.error(error_msg)
                log("Judge", error_msg, "⚖️", "error", audit_id=audit_id)
                # Structured log: zk_failure
                log("Judge", f"[zk_failure] Exception during proof submission. Error: {str(e)}, Audit ID: {audit_id}", "❌", "error", audit_id=audit_id)
            
            # Trigger Unibase transaction for bounty token
            try:
                # Pass None to auto-detect Membase usage based on MEMBASE_ENABLED
                transaction_hash = await save_bounty_token(
                    recipient_address=red_team_address,
                    exploit_string=exploit_payload,
                    use_mcp=None
                )
                
                state["bounties_awarded"] += 1
                log("Judge", f"Bounty Token awarded to {red_team_address[:20]}...", "⚖️", "info")
                log("Judge", f"Transaction: {transaction_hash}", "⚖️", "info")
                ctx.logger.info(f"Bounty Token transaction: {transaction_hash}")
                
            except Exception as e:
                ctx.logger.error(f"Failed to save bounty token: {str(e)}")
                log("Judge", f"Error saving bounty token: {str(e)}", "⚖️", "info")
        else:
            log("Judge", f"Response analyzed: {msg.status} - No vulnerability detected.", "⚖️", "info")

    # ============================================================================
    # Proof Verification Methods
    # ============================================================================
    
    @judge.on_query()
    async def verify_audit_proof_handler(ctx: Context, query: dict):
        """
        Query handler for proof verification.
        Query format: {"method": "verifyAuditProof", "proofId": "...", "auditorId": "..."}
        """
        if query.get("method") == "verifyAuditProof":
            proof_id = query.get("proofId")
            auditor_id = query.get("auditorId")
            
            if not proof_id:
                return {"error": "proofId is required"}
            
            result = await verify_audit_proof(proof_id, auditor_id)
            state["verified_proofs"][proof_id] = result.to_dict()
            
            return result.to_dict()
        
        elif query.get("method") == "batchVerify":
            proof_ids = query.get("proofIds", [])
            auditor_id = query.get("auditorId")
            
            if not proof_ids:
                return {"error": "proofIds array is required"}
            
            results = await batch_verify(proof_ids, auditor_id)
            return [r.to_dict() for r in results]
        
        elif query.get("method") == "getVerificationProof":
            proof_id = query.get("proofId")
            format_type = query.get("format", "json")
            
            if not proof_id:
                return {"error": "proofId is required"}
            
            proof = await get_verification_proof(proof_id, format_type)
            if proof:
                return {"proof": proof, "format": format_type}
            else:
                return {"error": "Proof not found"}
        
        return {"error": "Unknown method"}
    
    # Add verification methods as class methods for direct access
    judge.verify_audit_proof = lambda proof_id, auditor_id=None: verify_audit_proof(proof_id, auditor_id)
    judge.batch_verify = lambda proof_ids, auditor_id=None: batch_verify(proof_ids, auditor_id)
    judge.get_verification_proof = lambda proof_id, format="json": get_verification_proof(proof_id, format)

    return judge


if __name__ == "__main__":
    agent = create_judge_agent()
    agent.run()

