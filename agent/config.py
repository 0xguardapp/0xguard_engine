"""
Configuration management for Judge Agent.
"""
import os
from dataclasses import dataclass

# Try to load dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not available, continue without it


@dataclass
class Config:
    """
    Configuration class for Judge Agent.
    
    Loads configuration from environment variables.
    """
    
    # Unibase Configuration
    UNIBASE_ACCOUNT: str = os.getenv("UNIBASE_ACCOUNT", "")
    UNIBASE_RPC_URL: str = os.getenv("UNIBASE_RPC_URL", "https://testnet.unibase.io")
    UNIBASE_CHAIN_ID: int = int(os.getenv("UNIBASE_CHAIN_ID", "1337"))
    
    # Membase Configuration
    MEMBASE_ACCOUNT: str = os.getenv("MEMBASE_ACCOUNT", "")
    MEMBASE_CONVERSATION_ID: str = os.getenv("MEMBASE_CONVERSATION_ID", "bounty-audit-log")
    MEMBASE_ID: str = os.getenv("MEMBASE_ID", "judge-agent")
    
    # Judge Agent Configuration
    JUDGE_PRIVATE_KEY: str = os.getenv("JUDGE_PRIVATE_KEY", "")
    BOUNTY_TOKEN_ADDRESS: str = os.getenv("BOUNTY_TOKEN_ADDRESS", "")
    
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
    
    def validate(self):
        """
        Validate all required config values are set.
        
        Raises:
            ValueError: If any required configuration is missing
        """
        required = [
            "UNIBASE_ACCOUNT",
            "MEMBASE_ACCOUNT",
            "JUDGE_PRIVATE_KEY",
            "BOUNTY_TOKEN_ADDRESS"
        ]
        
        for field in required:
            if not getattr(self, field):
                raise ValueError(f"Missing required config: {field}")


# Global config instance (singleton pattern)
_config_instance = None


def get_config() -> Config:
    """
    Get global configuration instance.
    
    Returns:
        Config: Configuration instance
    """
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
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
