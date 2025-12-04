"""
Helper module for Membase integration.
Provides functions to interact with Membase for persistent memory storage.
"""
import os
import json
from typing import List, Dict, Any, Optional

# Try to import Membase SDK
try:
    from membase.memory.multi_memory import MultiMemory
    from membase.memory.message import Message
    MEMBASE_AVAILABLE = True
except ImportError:
    MEMBASE_AVAILABLE = False
    MultiMemory = None
    Message = None
    # Provide dummy classes for type hints
    class MultiMemory:
        pass
    class Message:
        pass

# Membase configuration from environment
MEMBASE_ID = os.getenv("MEMBASE_ID", "")
MEMBASE_ACCOUNT = os.getenv("MEMBASE_ACCOUNT", "default")
MEMBASE_SECRET_KEY = os.getenv("MEMBASE_SECRET_KEY", "")
MEMBASE_ENABLED = os.getenv("USE_MEMBASE", "false").lower() == "true"

# Global MultiMemory instance (lazy initialized)
_membase_instance: Optional[MultiMemory] = None


def get_membase_instance() -> Optional[MultiMemory]:
    """
    Get or create Membase MultiMemory instance.
    
    Returns:
        MultiMemory instance if configured, None otherwise
    """
    global _membase_instance
    
    if not MEMBASE_AVAILABLE:
        return None
    
    if not MEMBASE_ENABLED:
        return None
    
    if _membase_instance is None:
        try:
            _membase_instance = MultiMemory(
                membase_account=MEMBASE_ACCOUNT,
                auto_upload_to_hub=True,
                preload_from_hub=True
            )
        except Exception as e:
            print(f"Warning: Failed to initialize Membase: {e}")
            return None
    
    return _membase_instance


async def get_mcp_messages(recent_n: int = 50) -> List[Dict[str, Any]]:
    """
    Get messages from Membase.
    
    Args:
        recent_n: Number of recent messages to retrieve
        
    Returns:
        List of message dictionaries
    """
    if not MEMBASE_AVAILABLE or not MEMBASE_ENABLED:
        return []
    
    mm = get_membase_instance()
    if mm is None:
        return []
    
    try:
        # Use a default conversation ID for exploit storage
        conversation_id = "0xguard_exploits"
        
        # Get messages from Membase
        messages = mm.get_messages(conversation_id, limit=recent_n)
        
        # Convert to dictionary format
        result = []
        for msg in messages:
            result.append({
                "content": msg.content if hasattr(msg, 'content') else str(msg),
                "role": msg.role if hasattr(msg, 'role') else "assistant",
                "metadata": msg.metadata if hasattr(msg, 'metadata') else {}
            })
        
        return result
    except Exception as e:
        print(f"Error getting messages from Membase: {e}")
        return []


async def save_mcp_message(content: str, msg_type: str = "assistant", conversation_id: str = "0xguard_exploits") -> bool:
    """
    Save a message to Membase.
    
    Args:
        content: Message content to save
        msg_type: Type of message ("user" or "assistant")
        conversation_id: Conversation ID to save message to
        
    Returns:
        bool: True if saved successfully
    """
    if not MEMBASE_AVAILABLE or not MEMBASE_ENABLED:
        return False
    
    mm = get_membase_instance()
    if mm is None:
        return False
    
    try:
        # Create message object
        msg = Message(
            name=MEMBASE_ID or "0xguard_agent",
            content=content,
            role=msg_type,
            metadata={"source": "0xguard", "type": "exploit" if "EXPLOIT:" in content else "bounty"}
        )
        
        # Add to Membase
        mm.add(msg, conversation_id)
        
        return True
    except Exception as e:
        print(f"Error saving message to Membase: {e}")
        return False

