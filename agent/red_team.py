from uagents import Agent, Context, Model
import sys
import os
import httpx
from pathlib import Path

# Add agent directory to path for logger import
sys.path.insert(0, str(Path(__file__).parent))
from logger import log

# ASI.Cloud API Configuration
ASI_API_KEY = os.getenv("ASI_API_KEY", "sk_f19e4e7f7c0e460e9ebeed7132a13fedcca7c7d7133a482ca0636e2850751d2b")
ASI_API_URL = os.getenv("ASI_API_URL", "https://api.asi.cloud/v1/chat/completions")


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
    port: int = 8001,
) -> Agent:
    red_team = Agent(
        name="red_team_agent",
        port=port,
        seed="red_team_secret_seed_phrase",
        endpoint=[f"http://localhost:{port}/submit"],
    )

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
    }

    @red_team.on_event("startup")
    async def introduce(ctx: Context):
        ctx.logger.info(f"Red Team Agent started: {red_team.address}")
        ctx.logger.info(f"Target: {target_address}")
        log("RedTeam", f"Red Team Agent started: {red_team.address}", "🔴", "info")
        log("RedTeam", f"Target: {target_address}", "🔴", "info")

    @red_team.on_interval(period=3.0)
    async def send_attack(ctx: Context):
        if state["attack_complete"] or state["attack_count"] >= state["max_attacks"]:
            return

        # Generate attack using ASI.Cloud API
        payload = await generate_attack()
        
        state["attack_count"] += 1
        ctx.logger.info(
            f"Sending attack #{state['attack_count']}: '{payload}'"
        )
        log("RedTeam", f"Executing vector: '{payload}'", "🔴", "attack")

        await ctx.send(
            target_address,
            AttackMessage(payload=payload),
        )

    @red_team.on_message(model=ResponseMessage)
    async def handle_response(ctx: Context, sender: str, msg: ResponseMessage):
        ctx.logger.info(f"Response received: {msg.status}")
        ctx.logger.info(f"Message: {msg.message}")
        log("RedTeam", f"Response received: {msg.status} - {msg.message}", "🔴", "info")

        if msg.status == "SUCCESS":
            ctx.logger.info("SUCCESS! Secret key found!")
            log("RedTeam", "SUCCESS! Secret key found! Vulnerability exploited!", "🔴", "vulnerability", is_vulnerability=True)
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
        port=8001,
    )
    agent.run()