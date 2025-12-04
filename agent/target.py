from uagents import Agent, Context, Model, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec
)
import sys
import os
from pathlib import Path

# Add agent directory to path for logger import
sys.path.insert(0, str(Path(__file__).parent))
from logger import log


class AttackMessage(Model):
    payload: str


class ResponseMessage(Model):
    status: str
    message: str


SECRET_KEY = "fetch_ai_2024"


def create_target_agent(port: int = None, judge_address: str = None) -> Agent:
    # Get configuration from environment variables with sensible defaults
    agent_ip = os.getenv("TARGET_IP") or os.getenv("AGENT_IP", "localhost")
    agent_port = port or int(os.getenv("TARGET_PORT") or os.getenv("AGENT_PORT", "8000"))
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
    try:
        chat_proto = Protocol(spec=chat_protocol_spec)
        target.include(chat_proto)
    except (RuntimeError, Exception) as e:
        # Chat protocol is optional - core agent communication works without it
        # Only needed for Agentverse registration features
        pass

    @target.on_event("startup")
    async def introduce(ctx: Context):
        ctx.logger.info(f"Target Agent started: {target.address}")
        ctx.logger.info("Protecting SECRET_KEY...")
        log("Target", f"Target Agent started: {target.address}", "🎯", "info")
        log("Target", f"Listening on port {agent_port}", "🎯", "info")

    @target.on_message(model=AttackMessage)
    async def handle_attack(ctx: Context, sender: str, msg: AttackMessage):
        ctx.logger.info(f"Received attack from {sender}: '{msg.payload}'")
        log("Target", f"Processing input: '{msg.payload}'...", "🎯", "info")

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

        # Send response to Red Team (original sender)
        await ctx.send(sender, response)
        
        # Also send to Judge for monitoring (if Judge address is provided)
        if judge_address:
            try:
                await ctx.send(judge_address, response)
            except Exception as e:
                ctx.logger.debug(f"Could not send to Judge: {str(e)}")

    return target


if __name__ == "__main__":
    agent = create_target_agent()
    agent.run()