"""
Unibase integration module for persistent exploit memory.
Uses Membase to read and write known exploits.
Falls back to file-based storage if Membase is unavailable.
"""
import sys
import json
import os
from pathlib import Path
from datetime import datetime

# Add agent directory to path for logger import
sys.path.insert(0, str(Path(__file__).parent))
from logger import log
from mcp_helper import get_mcp_messages, save_mcp_message, MEMBASE_ENABLED

# Message format prefix for exploits
EXPLOIT_PREFIX = "EXPLOIT:"

# Fallback storage file (used when MCP is unavailable)
EXPLOITS_FILE = Path(__file__).parent.parent / "known_exploits.json"


def load_exploits_from_file() -> set:
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


def save_exploits_to_file(exploits: set) -> bool:
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


async def get_known_exploits(use_mcp: bool = None, mcp_messages: list = None) -> set:
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


def parse_exploits_from_messages(messages: list) -> set:
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


async def save_bounty_token(recipient_address: str, exploit_string: str, use_mcp: bool = None) -> str:
    """
    Save a bounty token transaction to Unibase via Membase MCP or fallback file.
    Simulates gasless transaction using Unibase account abstraction.
    
    Args:
        recipient_address: Red Team wallet address receiving the bounty
        exploit_string: The exploit payload that triggered the bounty
        use_mcp: Whether to use MCP (requires MCP context in caller)
        
    Returns:
        str: Simulated transaction hash (e.g., "0xab12...")
    """
    import hashlib
    import time
    
    try:
        timestamp = datetime.now().isoformat()
        
        # Create bounty token record
        bounty_data = {
            "type": "bounty_token",
            "recipient": recipient_address,
            "amount": 1,
            "exploit": exploit_string,
            "timestamp": timestamp,
        }
        
        # Generate simulated transaction hash
        hash_input = f"{recipient_address}{exploit_string}{timestamp}".encode()
        tx_hash = "0x" + hashlib.sha256(hash_input).hexdigest()[:16]
        
        # Format message for Unibase
        bounty_message = f"BOUNTY_TOKEN: {recipient_address} | {exploit_string} | {timestamp} | {tx_hash}"
        
        # Auto-detect Membase usage if not specified
        if use_mcp is None:
            use_mcp = MEMBASE_ENABLED
        
        log("Unibase", f"Writing new vector to Hivemind Memory...", "💾", "info")
        
        if use_mcp:
            try:
                # Save to Membase
                success = await save_mcp_message(bounty_message, msg_type="assistant", conversation_id="0xguard_bounties")
                if success:
                    log("Unibase", f"Bounty token saved to Membase", "💾", "info")
                else:
                    log("Unibase", "Failed to save to Membase, falling back to file storage", "💾", "info")
                    save_bounty_to_file(bounty_data)
            except Exception as e:
                log("Unibase", f"Error saving to Membase: {str(e)}, falling back to file storage", "💾", "info")
                save_bounty_to_file(bounty_data)
        else:
            # Fallback to file storage
            save_bounty_to_file(bounty_data)
            log("Unibase", f"Bounty token saved to file storage", "💾", "info")
        
        log("Unibase", f"Success. Transaction: {tx_hash}", "💾", "info")
        return tx_hash
        
    except Exception as e:
        log("Unibase", f"Error saving bounty token: {str(e)}", "💾", "info")
        return "0x0000..."


def save_bounty_to_file(bounty_data: dict) -> bool:
    """
    Save bounty token to fallback JSON file.
    
    Args:
        bounty_data: Dictionary containing bounty token information
        
    Returns:
        bool: True if saved successfully
    """
    import json
    from pathlib import Path
    
    try:
        bounties_file = Path(__file__).parent.parent / "bounty_tokens.json"
        
        # Load existing bounties
        if bounties_file.exists():
            with open(bounties_file, 'r') as f:
                data = json.load(f)
        else:
            data = {"bounties": []}
        
        # Add new bounty
        data["bounties"].append(bounty_data)
        
        # Save back to file
        with open(bounties_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        return True
    except Exception as e:
        log("Unibase", f"Error saving bounty to file: {str(e)}", "💾", "info")
        return False


async def save_exploit(exploit_string: str, known_exploits: set, use_mcp: bool = None) -> bool:
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

