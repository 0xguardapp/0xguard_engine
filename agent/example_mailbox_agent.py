"""
Example: Initializing a uAgent with Mailbox Key and Almanac Registration

This example shows how to initialize an Agent class using:
- mailbox='...' (your mailbox key from Agentverse)
- publish_manifest=True (to register on the Almanac)
"""

from uagents import Agent, Context
import os

# Get mailbox key from environment variable
# You can set this via: export MAILBOX_KEY="your_mailbox_key_here"
MAILBOX_KEY = os.getenv("MAILBOX_KEY")

def create_agent_with_mailbox():
    """
    Create an agent with mailbox key and Almanac registration enabled.
    
    When you register a 'Local Agent' on Agentverse, you'll receive a mailbox key.
    Use that key as the mailbox parameter (as a string, not a boolean).
    
    Example:
        agent = Agent(
            name="my_agent",
            seed="your_secret_seed_phrase",
            mailbox="your_mailbox_key_from_agentverse",
            publish_manifest=True,
        )
    """
    agent = Agent(
        name="my_agent",
        seed="your_secret_seed_phrase_here",  # Replace with your seed phrase
        mailbox=MAILBOX_KEY,  # Your mailbox key from Agentverse (as a string)
        publish_manifest=True,  # Register on the Almanac
    )
    
    @agent.on_event("startup")
    async def startup(ctx: Context):
        ctx.logger.info(f"Agent started with address: {agent.address}")
        if MAILBOX_KEY:
            ctx.logger.info(f"Mailbox key configured: {MAILBOX_KEY[:20]}...")
        else:
            ctx.logger.warning("Please set MAILBOX_KEY environment variable or update the code")
        ctx.logger.info("Agent registered on Almanac with publish_manifest=True")
    
    return agent


# Alternative: Direct initialization without function
if __name__ == "__main__":
    # Option 1: Using environment variable
    mailbox_key = os.getenv("MAILBOX_KEY")
    if not mailbox_key:
        print("Please set MAILBOX_KEY environment variable")
        print("Example: export MAILBOX_KEY='your_mailbox_key_here'")
        exit(1)
    
    # Option 2: Direct initialization (replace with your actual values)
    agent = Agent(
        name="my_agent",
        seed="your_secret_seed_phrase",  # Your agent seed phrase
        mailbox=mailbox_key,  # Your mailbox key from Agentverse
        publish_manifest=True,  # Register on the Almanac
    )
    
    @agent.on_event("startup")
    async def startup(ctx: Context):
        ctx.logger.info(f"Agent started: {agent.address}")
        ctx.logger.info("Registered on Almanac")
    
    # Run the agent
    agent.run()

