"""
Simple example: Initialize uAgent with Mailbox Key and Almanac Registration

Copy this code and replace:
- 'your_mailbox_key_here' with your actual mailbox key from Agentverse
- 'your_secret_seed_phrase' with your agent seed phrase
"""

from uagents import Agent, Context

# Initialize the agent with mailbox key and publish_manifest
agent = Agent(
    name="my_agent",
    seed="your_secret_seed_phrase",  # Your agent seed phrase
    mailbox="your_mailbox_key_here",  # Your mailbox key from Agentverse
    publish_manifest=True,  # Register on the Almanac
)

@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info(f"Agent started: {agent.address}")
    ctx.logger.info("Registered on Almanac with publish_manifest=True")

if __name__ == "__main__":
    agent.run()




