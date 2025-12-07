"""
Unibase integration module for bounty token distribution.

This module handles reward distribution on Unibase network with stubbed transaction calls.
All blockchain interactions are logged as JSON for audit purposes.
"""
import sys
import json
import os
import hashlib
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, Set, Tuple, List
from dataclasses import dataclass, asdict

# Add agent directory to path for logger import
sys.path.insert(0, str(Path(__file__).parent))
from logger import log
from mcp_helper import get_mcp_messages, save_mcp_message, MEMBASE_ENABLED

# ============================================================================
# Configuration & Validation
# ============================================================================

UNIBASE_ACCOUNT = os.getenv("UNIBASE_ACCOUNT", "").strip()
BOUNTY_TOKEN_ADDRESS = os.getenv("BOUNTY_TOKEN_ADDRESS", "").strip()
UNIBASE_RPC_URL = os.getenv("UNIBASE_RPC_URL", "https://testnet.unibase.io").strip()
UNIBASE_CHAIN_ID = int(os.getenv("UNIBASE_CHAIN_ID", "1337"))

# Validation flags
_config_validated = False
_config_errors = []


def validate_config() -> Tuple[bool, List[str]]:
    """
    Validate Unibase configuration.
    
    Returns:
        tuple: (is_valid, list of error messages)
    """
    global _config_validated, _config_errors
    
    if _config_validated:
        return len(_config_errors) == 0, _config_errors
    
    errors = []
    
    # Validate UNIBASE_ACCOUNT
    if not UNIBASE_ACCOUNT:
        errors.append("UNIBASE_ACCOUNT is not set")
    elif not UNIBASE_ACCOUNT.startswith("0x"):
        errors.append(f"UNIBASE_ACCOUNT must start with '0x': {UNIBASE_ACCOUNT}")
    elif len(UNIBASE_ACCOUNT) < 10:
        errors.append(f"UNIBASE_ACCOUNT appears invalid (too short): {UNIBASE_ACCOUNT}")
    
    # Validate BOUNTY_TOKEN_ADDRESS
    if not BOUNTY_TOKEN_ADDRESS:
        errors.append("BOUNTY_TOKEN_ADDRESS is not set")
    elif not BOUNTY_TOKEN_ADDRESS.startswith("0x"):
        errors.append(f"BOUNTY_TOKEN_ADDRESS must start with '0x': {BOUNTY_TOKEN_ADDRESS}")
    elif len(BOUNTY_TOKEN_ADDRESS) < 10:
        errors.append(f"BOUNTY_TOKEN_ADDRESS appears invalid (too short): {BOUNTY_TOKEN_ADDRESS}")
    
    # Validate UNIBASE_RPC_URL
    if not UNIBASE_RPC_URL:
        errors.append("UNIBASE_RPC_URL is not set")
    elif not (UNIBASE_RPC_URL.startswith("http://") or UNIBASE_RPC_URL.startswith("https://")):
        errors.append(f"UNIBASE_RPC_URL must be a valid HTTP/HTTPS URL: {UNIBASE_RPC_URL}")
    
    _config_errors = errors
    _config_validated = True
    
    if errors:
        log("Unibase", f"Configuration validation failed: {', '.join(errors)}", "⚠️", "warning")
    else:
        log("Unibase", "Configuration validated successfully", "✅", "info")
        log("Unibase", f"Account: {UNIBASE_ACCOUNT[:10]}..., Token: {BOUNTY_TOKEN_ADDRESS[:10]}..., RPC: {UNIBASE_RPC_URL}", "💾", "info")
    
    return len(errors) == 0, errors


# Validate on import
_is_valid, _errors = validate_config()
if not _is_valid:
    log("Unibase", f"WARNING: Unibase configuration has errors. Some features may not work correctly.", "⚠️", "warning")


# ============================================================================
# Data Models
# ============================================================================

@dataclass
class RewardDistribution:
    """Reward distribution record."""
    transaction_hash: str
    recipient_address: str
    amount: int
    token_address: str
    exploit_string: str
    timestamp: str
    chain_id: int
    status: str  # "pending", "stubbed", "completed"
    metadata: Dict[str, Any]


# ============================================================================
# Stubbed Transaction Functions
# ============================================================================

def _stub_send_transaction(
    to: str,
    value: int,
    data: Optional[str] = None,
    gas_limit: int = 21000,
    gas_price: int = 20000000000  # 20 gwei
) -> Dict[str, Any]:
    """
    Stub function for sending a transaction on Unibase.
    Logs transaction details as JSON instead of actually sending.
    
    Args:
        to: Recipient address
        value: Amount to send (in wei/smallest unit)
        data: Optional transaction data
        gas_limit: Gas limit for transaction
        gas_price: Gas price in wei
        
    Returns:
        dict: Stubbed transaction receipt
    """
    # Generate deterministic transaction hash
    hash_input = f"{to}{value}{data or ''}{time.time()}".encode()
    tx_hash = "0x" + hashlib.sha256(hash_input).hexdigest()[:64]
    
    # Create transaction receipt
    receipt = {
        "transactionHash": tx_hash,
        "blockNumber": None,  # Stubbed
        "blockHash": None,  # Stubbed
        "from": UNIBASE_ACCOUNT,
        "to": to,
        "value": str(value),
        "gasUsed": gas_limit,
        "gasPrice": str(gas_price),
        "status": "stubbed",
        "timestamp": datetime.now().isoformat(),
        "chainId": UNIBASE_CHAIN_ID
    }
    
    # Log transaction as JSON
    log_data = {
        "type": "unibase_transaction",
        "action": "send_transaction",
        "transaction": receipt,
        "config": {
            "account": UNIBASE_ACCOUNT,
            "rpc_url": UNIBASE_RPC_URL,
            "chain_id": UNIBASE_CHAIN_ID
        }
    }
    
    log("Unibase", f"[STUBBED] Transaction: {tx_hash[:16]}... to {to[:10]}...", "💾", "info")
    log("Unibase", f"Transaction JSON: {json.dumps(log_data, indent=2)}", "💾", "info")
    
    return receipt


def _stub_transfer_token(
    token_address: str,
    recipient: str,
    amount: int
) -> Dict[str, Any]:
    """
    Stub function for transferring ERC-20 tokens on Unibase.
    Logs transfer details as JSON instead of actually executing.
    
    Args:
        token_address: ERC-20 token contract address
        recipient: Recipient address
        amount: Amount to transfer (in token units)
        
    Returns:
        dict: Stubbed transfer receipt
    """
    # Generate deterministic transaction hash
    hash_input = f"{token_address}{recipient}{amount}{time.time()}".encode()
    tx_hash = "0x" + hashlib.sha256(hash_input).hexdigest()[:64]
    
    # Create transfer receipt
    receipt = {
        "transactionHash": tx_hash,
        "blockNumber": None,  # Stubbed
        "blockHash": None,  # Stubbed
        "from": UNIBASE_ACCOUNT,
        "to": token_address,
        "recipient": recipient,
        "amount": str(amount),
        "tokenAddress": token_address,
        "status": "stubbed",
        "timestamp": datetime.now().isoformat(),
        "chainId": UNIBASE_CHAIN_ID,
        "method": "transfer"
    }
    
    # Log transfer as JSON
    log_data = {
        "type": "unibase_token_transfer",
        "action": "transfer_token",
        "transfer": receipt,
        "config": {
            "account": UNIBASE_ACCOUNT,
            "rpc_url": UNIBASE_RPC_URL,
            "chain_id": UNIBASE_CHAIN_ID
        }
    }
    
    log("Unibase", f"[STUBBED] Token Transfer: {tx_hash[:16]}... {amount} tokens to {recipient[:10]}...", "💾", "info")
    log("Unibase", f"Transfer JSON: {json.dumps(log_data, indent=2)}", "💾", "info")
    
    return receipt


# ============================================================================
# Reward Distribution
# ============================================================================

async def save_bounty_token(
    recipient_address: str,
    exploit_string: str,
    use_mcp: bool = None
) -> str:
    """
    Distribute bounty token reward to recipient.
    Uses stubbed transaction calls with JSON logging.
    
    Args:
        recipient_address: Red Team wallet address receiving the bounty
        exploit_string: The exploit payload that triggered the bounty
        use_mcp: Whether to use Membase for storage (auto-detected if None)
        
    Returns:
        str: Transaction hash (stubbed)
    """
    # Validate configuration
    is_valid, errors = validate_config()
    if not is_valid:
        log("Unibase", f"Cannot distribute bounty: {', '.join(errors)}", "⚠️", "error")
        return "0x0000..."
    
    try:
        timestamp = datetime.now().isoformat()
        
        # Stub token transfer transaction
        transfer_receipt = _stub_transfer_token(
            token_address=BOUNTY_TOKEN_ADDRESS,
            recipient=recipient_address,
            amount=1  # 1 bounty token
        )
        
        tx_hash = transfer_receipt["transactionHash"]
        
        # Create reward distribution record
        reward = RewardDistribution(
            transaction_hash=tx_hash,
            recipient_address=recipient_address,
            amount=1,
            token_address=BOUNTY_TOKEN_ADDRESS,
            exploit_string=exploit_string,
            timestamp=timestamp,
            chain_id=UNIBASE_CHAIN_ID,
            status="stubbed",
            metadata={
                "gas_used": transfer_receipt.get("gasUsed", 0),
                "gas_price": transfer_receipt.get("gasPrice", "0"),
                "block_number": transfer_receipt.get("blockNumber")
            }
        )
        
        # Log reward distribution as clean JSON
        reward_log = {
            "type": "reward_distribution",
            "timestamp": timestamp,
            "reward": asdict(reward),
            "config": {
                "account": UNIBASE_ACCOUNT,
                "token_address": BOUNTY_TOKEN_ADDRESS,
                "rpc_url": UNIBASE_RPC_URL,
                "chain_id": UNIBASE_CHAIN_ID
            }
        }
        
        log("Unibase", f"Reward Distribution JSON: {json.dumps(reward_log, indent=2)}", "💾", "info")
        
        # Save to Membase or file storage
        bounty_message = f"BOUNTY_TOKEN: {recipient_address} | {exploit_string} | {timestamp} | {tx_hash}"
        
        # Auto-detect Membase usage
        if use_mcp is None:
            use_mcp = MEMBASE_ENABLED
        
        if use_mcp:
            try:
                success = await save_mcp_message(
                    bounty_message,
                    msg_type="assistant",
                    conversation_id="0xguard_bounties"
                )
                if success:
                    log("Unibase", "Bounty token record saved to Membase", "💾", "info")
                else:
                    _save_bounty_to_file(reward_log)
            except Exception as e:
                log("Unibase", f"Error saving to Membase: {str(e)}, falling back to file", "💾", "info")
                _save_bounty_to_file(reward_log)
        else:
            _save_bounty_to_file(reward_log)
        
        log("Unibase", f"Success. Transaction: {tx_hash}", "💾", "info")
        return tx_hash
        
    except Exception as e:
        log("Unibase", f"Error distributing bounty token: {str(e)}", "💾", "error")
        return "0x0000..."


def _save_bounty_to_file(reward_log: Dict[str, Any]) -> bool:
    """
    Save bounty reward log to file.
    
    Args:
        reward_log: Reward distribution log dictionary
        
    Returns:
        bool: True if saved successfully
    """
    try:
        bounties_file = Path(__file__).parent.parent / "bounty_tokens.json"
        
        # Load existing bounties
        if bounties_file.exists():
            with open(bounties_file, 'r') as f:
                data = json.load(f)
        else:
            data = {"bounties": [], "rewards": []}
        
        # Add new reward log
        if "rewards" not in data:
            data["rewards"] = []
        data["rewards"].append(reward_log)
        
        # Also add legacy format for compatibility
        reward = reward_log["reward"]
        data["bounties"].append({
            "type": "bounty_token",
            "recipient": reward["recipient_address"],
            "amount": reward["amount"],
            "exploit": reward["exploit_string"],
            "timestamp": reward["timestamp"],
            "transaction_hash": reward["transaction_hash"]
        })
        
        # Save back to file
        with open(bounties_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        log("Unibase", "Bounty reward saved to file storage", "💾", "info")
        return True
        
    except Exception as e:
        log("Unibase", f"Error saving bounty to file: {str(e)}", "💾", "error")
        return False


# ============================================================================
# Exploit Storage (Membase Integration)
# ============================================================================

EXPLOIT_PREFIX = "EXPLOIT:"
EXPLOITS_FILE = Path(__file__).parent.parent / "known_exploits.json"


def load_exploits_from_file() -> Set[str]:
    """
    Load exploits from fallback JSON file.
    
    Returns:
        set: Set of exploit strings
    """
    try:
        if EXPLOITS_FILE.exists():
            with open(EXPLOITS_FILE, 'r') as f:
                data = json.load(f)
                exploits = set(data.get("exploits", []))
                return exploits
    except Exception as e:
        log("Unibase", f"Error loading exploits from file: {str(e)}", "💾", "info")
    return set()


def save_exploits_to_file(exploits: Set[str]) -> bool:
    """
    Save exploits to fallback JSON file.
    
    Args:
        exploits: Set of exploit strings to save
        
    Returns:
        bool: True if saved successfully
    """
    try:
        data = {"exploits": list(exploits)}
        with open(EXPLOITS_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        log("Unibase", f"Error saving exploits to file: {str(e)}", "💾", "info")
        return False


async def get_known_exploits(use_mcp: bool = None, mcp_messages: list = None) -> Set[str]:
    """
    Retrieve known exploits from Unibase via Membase or fallback file.
    
    Args:
        use_mcp: Whether to use Membase (auto-detected if None based on MEMBASE_ENABLED)
        mcp_messages: List of messages from Membase (if use_mcp is True, will fetch if None)
        
    Returns:
        set: Set of known exploit strings
    """
    known_exploits = set()
    
    try:
        # Auto-detect Membase usage if not specified
        if use_mcp is None:
            use_mcp = MEMBASE_ENABLED
        
        log("Unibase", "Querying Hivemind Memory for known exploits...", "💾", "info")
        
        if use_mcp:
            try:
                # Fetch messages from Membase if not provided
                if mcp_messages is None:
                    mcp_messages = await get_mcp_messages(recent_n=100)
                
                # Parse exploits from Membase messages
                known_exploits = parse_exploits_from_messages(mcp_messages)
                log("Unibase", f"Loaded {len(known_exploits)} exploits from Membase", "💾", "info")
            except Exception as e:
                log("Unibase", f"Error reading from Membase: {str(e)}, falling back to file storage", "💾", "info")
                # Fallback to file-based storage
                known_exploits = load_exploits_from_file()
                if known_exploits:
                    log("Unibase", f"Loaded {len(known_exploits)} exploits from file storage", "💾", "info")
        else:
            # Fallback to file-based storage
            known_exploits = load_exploits_from_file()
            if known_exploits:
                log("Unibase", f"Loaded {len(known_exploits)} exploits from file storage", "💾", "info")
            else:
                log("Unibase", "No known exploits found", "💾", "info")
        
        return known_exploits
        
    except Exception as e:
        log("Unibase", f"Error reading exploits: {str(e)}", "💾", "info")
        return set()


def parse_exploits_from_messages(messages: list) -> Set[str]:
    """
    Parse exploit strings from Membase messages.
    
    Args:
        messages: List of message objects from Membase
        
    Returns:
        set: Set of exploit strings
    """
    exploits = set()
    
    for msg in messages:
        content = msg.get("content", "") if isinstance(msg, dict) else str(msg)
        
        # Check if message contains exploit
        if EXPLOIT_PREFIX in content:
            # Extract exploit string after prefix
            exploit = content.split(EXPLOIT_PREFIX, 1)[1].strip()
            if exploit:
                exploits.add(exploit)
        elif content.startswith("EXPLOIT:"):
            exploit = content.replace("EXPLOIT:", "").strip()
            if exploit:
                exploits.add(exploit)
    
    return exploits


def format_exploit_message(exploit_string: str) -> str:
    """
    Format exploit string for storage in Unibase.
    
    Args:
        exploit_string: The exploit payload string
        
    Returns:
        str: Formatted message for storage
    """
    return f"{EXPLOIT_PREFIX} {exploit_string}"


async def save_exploit(exploit_string: str, known_exploits: Set[str], use_mcp: bool = None) -> bool:
    """
    Save a new exploit to Unibase via Membase or fallback file.
    
    Args:
        exploit_string: The exploit payload to save
        known_exploits: Current set of known exploits (will be updated)
        use_mcp: Whether to use Membase (auto-detected if None based on MEMBASE_ENABLED)
        
    Returns:
        bool: True if saved successfully, False otherwise
    """
    try:
        # Auto-detect Membase usage if not specified
        if use_mcp is None:
            use_mcp = MEMBASE_ENABLED
        
        formatted_message = format_exploit_message(exploit_string)
        log("Unibase", f"Writing new vector to Hivemind Memory: {exploit_string}", "💾", "info")
        
        # Add to local set
        known_exploits.add(exploit_string)
        
        if use_mcp:
            try:
                # Save to Membase
                success = await save_mcp_message(formatted_message, msg_type="assistant")
                if success:
                    log("Unibase", "Exploit saved to Membase", "💾", "info")
                else:
                    log("Unibase", "Failed to save to Membase, falling back to file storage", "💾", "info")
                    save_exploits_to_file(known_exploits)
            except Exception as e:
                log("Unibase", f"Error saving to Membase: {str(e)}, falling back to file storage", "💾", "info")
                save_exploits_to_file(known_exploits)
        else:
            # Fallback to file storage
            save_exploits_to_file(known_exploits)
            log("Unibase", "Exploit saved to file storage", "💾", "info")
        
        log("Unibase", "Success. New exploit saved to Hivemind Memory.", "💾", "info")
        return True
        
    except Exception as e:
        log("Unibase", f"Error saving exploit: {str(e)}", "💾", "info")
        return False
