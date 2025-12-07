"""
Configuration management for all 0xGuard agents.
Loads environment variables from agent/.env file.
"""
import os
from pathlib import Path
from dataclasses import dataclass

# Try to load dotenv from agent/.env file
try:
    from dotenv import load_dotenv
    # Load from agent/.env file specifically
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        # Fallback to default dotenv behavior (current directory)
        load_dotenv()
except ImportError:
    pass  # dotenv not available, continue without it

# Load API keys with no defaults
_ASI_API_KEY = os.getenv("ASI_API_KEY")
_AGENTVERSE_KEY = os.getenv("AGENTVERSE_KEY")
_MAILBOX_KEY = os.getenv("MAILBOX_KEY")
_TARGET_SECRET_KEY = os.getenv("TARGET_SECRET_KEY")
_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Validate required keys - use warnings instead of hard failures to allow graceful degradation
# This allows agents to start even if some keys are missing (they'll log warnings and use fallbacks)
import logging
_logger = logging.getLogger(__name__)

if not _AGENTVERSE_KEY:
    _logger.warning("⚠️  AGENTVERSE_KEY missing. Set in agent/.env - AgentVerse features will be disabled")
    _AGENTVERSE_KEY = ""  # Allow empty, agents will handle gracefully

if not _ASI_API_KEY:
    _logger.warning("⚠️  ASI_API_KEY missing. Set in agent/.env - ASI.Cloud features will be disabled")
    _ASI_API_KEY = ""  # Allow empty, agents will use Gemini or fallback payloads

if not _GEMINI_API_KEY:
    _logger.warning("⚠️  GEMINI_API_KEY missing. Set in agent/.env - Gemini fallback will be disabled")
    _GEMINI_API_KEY = ""  # Allow empty, will use hardcoded fallbacks

if not _TARGET_SECRET_KEY:
    _logger.warning("⚠️  TARGET_SECRET_KEY missing. Set in agent/.env - Using default seed")
    _TARGET_SECRET_KEY = "default_agent_seed_please_set_in_env"  # Provide a default for testing


@dataclass
class Config:
    """
    Configuration class for Judge Agent.
    
    Loads configuration from environment variables.
    """
    
    # Unibase Configuration
    # Corrected to valid 42-character Ethereum address
    UNIBASE_ACCOUNT: str = os.getenv("UNIBASE_ACCOUNT", "0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B")
    UNIBASE_RPC_URL: str = os.getenv("UNIBASE_RPC_URL", "https://testnet.unibase.io")
    UNIBASE_CHAIN_ID: int = int(os.getenv("UNIBASE_CHAIN_ID", "1337"))
    
    # Membase Configuration
    MEMBASE_ACCOUNT: str = os.getenv("MEMBASE_ACCOUNT", "")
    MEMBASE_CONVERSATION_ID: str = os.getenv("MEMBASE_CONVERSATION_ID", "bounty-audit-log")
    MEMBASE_ID: str = os.getenv("MEMBASE_ID", "judge-agent")
    
    # Judge Agent Configuration
    JUDGE_PRIVATE_KEY: str = os.getenv("JUDGE_PRIVATE_KEY", "")
    BOUNTY_TOKEN_ADDRESS: str = os.getenv("BOUNTY_TOKEN_ADDRESS", "")
    
    # API Keys (Required) - no hardcoded defaults
    ASI_API_KEY: str = _ASI_API_KEY or ""
    AGENTVERSE_KEY: str = _AGENTVERSE_KEY or ""
    MAILBOX_KEY: str = _MAILBOX_KEY or ""
    TARGET_SECRET_KEY: str = _TARGET_SECRET_KEY or ""
    GEMINI_API_KEY: str = _GEMINI_API_KEY or ""
    
    # Bounty Rates (in tokens)
    BOUNTY_LOW: int = 50
    BOUNTY_MEDIUM: int = 150
    BOUNTY_HIGH: int = 400
    BOUNTY_CRITICAL: int = 1000
    
    # Security Settings
    MAX_BOUNTY_PER_HOUR: int = 10
    COOLDOWN_SECONDS: int = 120
    MAX_SINGLE_BOUNTY: int = 1000
    DAILY_BOUNTY_CAP: int = 10000
    
    # Verification Settings
    EXPLOIT_TIMEOUT_MINUTES: int = 5
    MIN_CONFIDENCE_THRESHOLD: float = 0.8
    REQUIRE_PROOF: bool = True
    
    # Redis Configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    
    # Midnight Configuration
    MIDNIGHT_API_URL: str = os.getenv("MIDNIGHT_API_URL", "http://localhost:8100")
    MIDNIGHT_CONTRACT_ADDRESS: str = os.getenv("MIDNIGHT_CONTRACT_ADDRESS", "")
    MIDNIGHT_DEVNET_URL: str = os.getenv("MIDNIGHT_DEVNET_URL", "http://localhost:6300")
    MIDNIGHT_BRIDGE_URL: str = os.getenv("MIDNIGHT_BRIDGE_URL", "http://localhost:3000")
    MIDNIGHT_SIMULATION_MODE: bool = os.getenv("MIDNIGHT_SIMULATION_MODE", "false").lower() == "true"
    
    # Agent Ports Configuration
    TARGET_PORT: int = int(os.getenv("TARGET_PORT", "8000"))
    JUDGE_PORT: int = int(os.getenv("JUDGE_PORT", "8002"))
    RED_TEAM_PORT: int = int(os.getenv("RED_TEAM_PORT", "8001"))
    AGENT_API_PORT: int = int(os.getenv("AGENT_API_PORT", "8003"))
    
    # Agent API URL
    AGENT_API_URL: str = os.getenv("AGENT_API_URL", "http://localhost:8003")
    
    def validate(self, strict: bool = False):
        """
        Validate all required config values are set.
        
        Args:
            strict: If True, raises ValueError on missing config. If False, logs warnings.
        
        Raises:
            ValueError: If strict=True and any required configuration is missing
        """
        required = [
            "UNIBASE_ACCOUNT",
            "MEMBASE_ACCOUNT",
            "JUDGE_PRIVATE_KEY",
            "BOUNTY_TOKEN_ADDRESS",
            "ASI_API_KEY",
            "AGENTVERSE_KEY",
            "MAILBOX_KEY",
            "TARGET_SECRET_KEY"
        ]
        
        # Critical config that should always be checked
        critical = [
            "MIDNIGHT_API_URL"
        ]
        
        missing = []
        for field in required:
            value = getattr(self, field, "")
            if not value or value.strip() == "":
                missing.append(field)
        
        # Check critical config
        critical_missing = []
        for field in critical:
            value = getattr(self, field, "")
            if not value or value.strip() == "":
                critical_missing.append(field)
        
        # Log warnings for critical missing config (prevents silent failures)
        if critical_missing:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                f"⚠️  CRITICAL: Missing configuration variables: {', '.join(critical_missing)}\n"
                f"This may cause silent failures. Please set these in agent/.env file.\n"
                f"See env.example for reference."
            )
        
        if missing:
            error_msg = (
                f"Missing required configuration variables: {', '.join(missing)}\n"
                f"Please set these environment variables before starting the application.\n"
                f"See env.example for reference."
            )
            if strict:
                raise ValueError(error_msg)
            else:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"⚠️  {error_msg}")
        
        return len(missing) == 0 and len(critical_missing) == 0


# Global config instance (singleton pattern)
_config_instance = None


def get_config() -> Config:
    """
    Get global configuration instance.
    Automatically validates critical config to prevent silent failures.
    
    Returns:
        Config: Configuration instance
    """
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
        # Validate critical config (non-strict, just warnings)
        _config_instance.validate(strict=False)
    return _config_instance


def reload_config() -> Config:
    """
    Reload configuration from environment.
    
    Returns:
        Config: New configuration instance
    """
    global _config_instance
    _config_instance = Config()
    return _config_instance
