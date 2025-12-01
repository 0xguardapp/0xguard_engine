from uagents import Agent, Context, Model


class AttackMessage(Model):
    payload: str


class ResponseMessage(Model):
    status: str
    message: str


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

    attack_payloads = [
        "admin",
        "root",
        "password",
        "123456",
        "fetch_ai_2024",
    ]

    state = {
        "attack_index": 0,
        "attack_complete": False,
    }

    @red_team.on_event("startup")
    async def introduce(ctx: Context):
        ctx.logger.info(f"Red Team Agent started: {red_team.address}")
        ctx.logger.info(f"Target: {target_address}")

    @red_team.on_interval(period=3.0)
    async def send_attack(ctx: Context):
        if state["attack_complete"] or state["attack_index"] >= len(attack_payloads):
            return

        payload = attack_payloads[state["attack_index"]]
        ctx.logger.info(
            f"Sending attack #{state['attack_index'] + 1}: '{payload}'"
        )

        await ctx.send(
            target_address,
            AttackMessage(payload=payload),
        )

        state["attack_index"] += 1

    @red_team.on_message(model=ResponseMessage)
    async def handle_response(ctx: Context, sender: str, msg: ResponseMessage):
        ctx.logger.info(f"Response received: {msg.status}")
        ctx.logger.info(f"Message: {msg.message}")

        if msg.status == "SUCCESS":
            ctx.logger.info("SUCCESS! Secret key found!")
            state["attack_complete"] = True

    return red_team


if __name__ == "__main__":
    agent = create_red_team_agent(
        target_address="agent1qf2mssnkhf29fk7vj2fy8ekmhdfke0ptu4k9dyvfcuk7tt6easatge9z96d",
        port=8001,
    )
    agent.run()