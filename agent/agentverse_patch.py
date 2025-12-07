"""
AgentVerse / Mailbox Compatibility Patch
----------------------------------------
The current uAgents library exposes:
   agent.agentverse
   agent.mailbox_client

But DOES NOT expose the public methods expected by:
 - Phase 3 architecture docs
 - judge.py
 - target.py
 - red_team.py
 - multiple test suites

This patch adds:
    Agent.enable_agentverse(jwt)
    Agent.use_mailbox(jwt)

Both attach cleanly to the Agent class at runtime and DO NOT
modify the uAgents library.
"""

from uagents import Agent

# ---------------------------------------------------------
# Helper functions implementing missing public APIs
# ---------------------------------------------------------

def enable_agentverse(self, jwt: str):
    """
    Enable AgentVerse authentication for this agent.

    Usage:
        agent.enable_agentverse(AGENTVERSE_JWT)
    """
    if not hasattr(self, "agentverse") or self.agentverse is None:
        raise RuntimeError(
            "AgentVerse not available in this uAgents version "
            "(missing self.agentverse)"
        )

    self.agentverse.jwt = jwt
    return True


def use_mailbox(self, jwt: str):
    """
    Enable Mailbox authentication for this agent.

    Usage:
        agent.use_mailbox(MAILBOX_JWT)
    """
    if not hasattr(self, "mailbox_client") or self.mailbox_client is None:
        raise RuntimeError(
            "Mailbox client not available in this uAgents version "
            "(missing self.mailbox_client)"
        )

    self.mailbox_client.jwt = jwt
    return True


# ---------------------------------------------------------
# Patch the methods into the Agent class
# ---------------------------------------------------------

Agent.enable_agentverse = enable_agentverse
Agent.use_mailbox = use_mailbox


# ---------------------------------------------------------
# Optional: log output to confirm patch loaded
# ---------------------------------------------------------
print("[AgentVersePatch] enable_agentverse() & use_mailbox() successfully added.")

