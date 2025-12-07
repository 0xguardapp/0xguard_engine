"""
Agent Wrapper Module - Provides enable_agentverse() and use_mailbox() API

This module extends the uagents Agent class with wrapper methods to provide
a consistent API for AgentVerse registration and mailbox configuration.

PHASE 3 Pattern:
    agent = Agent(name="...", seed="...", port=...)
    agent.enable_agentverse(AGENTVERSE_KEY)
    agent.use_mailbox(MAILBOX_KEY)
"""
import os
from typing import Optional
from uagents import Agent, Context
from uagents_core.utils.registration import (
    register_chat_agent,
    RegistrationRequestCredentials,
)


def enable_agentverse(self: Agent, agentverse_key: str) -> None:
    """
    Enable AgentVerse registration for this agent.
    
    This method sets up AgentVerse registration that will occur during agent startup.
    It stores the agentverse key and sets up a startup event handler to register.
    
    Args:
        agentverse_key: AgentVerse API key
        
    Raises:
        ValueError: If agentverse_key is empty
    """
    if not agentverse_key:
        raise ValueError("AGENTVERSE_KEY is required")
    
    # Store the agentverse key
    self._agentverse_key = agentverse_key
    
    # Initialize registration flag if not already set
    if not hasattr(self, '_agentverse_registered'):
        self._agentverse_registered = False
    
    # Set up registration in a startup event handler
    # Only add handler if we haven't already set one up
    if not self._agentverse_registered:
        
        @self.on_event("startup")
        async def _register_agentverse(ctx: Context):
            """Register agent with AgentVerse during startup."""
            # Check flag to avoid duplicate registration
            if self._agentverse_registered:
                return
                
            try:
                agent_seed_phrase = getattr(self, '_seed', None) or os.getenv("AGENT_SEED_PHRASE") or str(self.identifier)
                agent_port = getattr(self, 'port', None) or 8000
                agent_ip = os.getenv("AGENT_IP") or os.getenv("JUDGE_IP") or os.getenv("TARGET_IP") or os.getenv("RED_TEAM_IP") or "localhost"
                endpoint_url = f"http://{agent_ip}:{agent_port}/submit"
                agent_name = getattr(self, 'name', 'agent') or 'agent'
                
                register_chat_agent(
                    agent_name,
                    endpoint_url,
                    active=True,
                    credentials=RegistrationRequestCredentials(
                        agentverse_api_key=self._agentverse_key,
                        agent_seed_phrase=agent_seed_phrase,
                    ),
                )
                self._agentverse_registered = True
                if hasattr(ctx, 'logger'):
                    ctx.logger.info(f"Agent registered with AgentVerse at {endpoint_url}")
            except Exception as e:
                if hasattr(ctx, 'logger'):
                    ctx.logger.error(f"Failed to register with AgentVerse: {str(e)}")
                # Don't raise - allow agent to continue even if registration fails
                pass


def use_mailbox(self: Agent, mailbox_key: str) -> None:
    """
    Configure mailbox for this agent using a mailbox key.
    
    This method configures the mailbox by calling the agent's internal mailbox method.
    
    Args:
        mailbox_key: Mailbox key from AgentVerse
        
    Raises:
        ValueError: If mailbox_key is empty
        AttributeError: If mailbox cannot be configured after agent creation
        Exception: If mailbox configuration fails
    """
    if not mailbox_key:
        raise ValueError("MAILBOX_KEY is required")
    
    try:
        # Try to use the private _use_mailbox method if available
        if hasattr(self, '_use_mailbox'):
            self._use_mailbox(mailbox_key)
            # Store the mailbox key for reference
            self._mailbox_key = mailbox_key
        else:
            # If _use_mailbox doesn't exist, we need to set it via constructor
            # Since agent is already created, we'll log a warning
            raise AttributeError(
                "Mailbox cannot be configured after agent creation. "
                "Recreate the agent with mailbox parameter: Agent(..., mailbox=mailbox_key)"
            )
        
    except AttributeError:
        raise
    except Exception as e:
        raise Exception(f"Failed to configure mailbox: {str(e)}") from e


# Monkey-patch the Agent class with the wrapper methods
Agent.enable_agentverse = enable_agentverse
Agent.use_mailbox = use_mailbox

