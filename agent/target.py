from uagents import Agent, Context, Model
import sys
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


def create_target_agent(port: int = 8000) -> Agent:
    target = Agent(
        name="target_agent",
        port=port,
        seed="target_secret_seed_phrase",
        endpoint=[f"http://localhost:{port}/submit"],
    )

    @target.on_event("startup")
    async def introduce(ctx: Context):
        ctx.logger.info(f"Target Agent started: {target.address}")
        ctx.logger.info("Protecting SECRET_KEY...")
        log("Target", f"Target Agent started: {target.address}", "🎯", "info")
        log("Target", "Listening on port 8000", "🎯", "info")

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

        await ctx.send(sender, response)

    return target


if __name__ == "__main__":
    agent = create_target_agent(port=8000)
    agent.run()