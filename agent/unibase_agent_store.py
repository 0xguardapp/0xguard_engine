"""
Unibase Agent Store Module

Provides a unified interface for storing and retrieving agent data in Unibase key-value store.
Supports identity, reputation, validation, and memory storage with async/sync operations.
"""
import os
import json
import time
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import requests
from pathlib import Path

# Import logger if available
try:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))
    from logger import log
except ImportError:
    # Fallback logger
    def log(category: str, message: str, emoji: str = "", level: str = "info"):
        print(f"[{category}] {message}")

# ============================================================================
# Configuration
# ============================================================================

UNIBASE_RPC_URL = os.getenv("UNIBASE_RPC_URL", "https://testnet.unibase.io").strip()
UNIBASE_ACCOUNT = os.getenv("UNIBASE_ACCOUNT", "").strip()
UNIBASE_STORAGE_ENABLED = os.getenv("UNIBASE_STORAGE_ENABLED", "true").lower() == "true"

# Key prefixes
IDENTITY_PREFIX = "agent:identity:"
REPUTATION_PREFIX = "agent:rep:"
VALIDATION_PREFIX = "agent:val:"
MEMORY_PREFIX = "agent:mem:"

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # seconds
RETRY_BACKOFF = 2.0  # exponential backoff multiplier


# ============================================================================
# UnibaseAgentStore Class
# ============================================================================

class UnibaseAgentStore:
    """
    Store for agent data in Unibase key-value store.
    
    Provides methods to store and retrieve:
    - Agent identities
    - Reputation records
    - Validation records
    - Agent memory/state
    """
    
    def __init__(
        self,
        rpc_url: Optional[str] = None,
        account: Optional[str] = None,
        max_retries: int = MAX_RETRIES,
        retry_delay: float = RETRY_DELAY
    ):
        """
        Initialize UnibaseAgentStore.
        
        Args:
            rpc_url: Unibase RPC URL (defaults to UNIBASE_RPC_URL env var)
            account: Unibase account address (defaults to UNIBASE_ACCOUNT env var)
            max_retries: Maximum number of retry attempts for failed operations
            retry_delay: Initial delay between retries (seconds)
        """
        self.rpc_url = rpc_url or UNIBASE_RPC_URL
        self.account = account or UNIBASE_ACCOUNT
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.enabled = UNIBASE_STORAGE_ENABLED
        
        if not self.rpc_url:
            log("UnibaseAgentStore", "WARNING: UNIBASE_RPC_URL not set, using default", "⚠️", "warning")
        
        if not self.account:
            log("UnibaseAgentStore", "WARNING: UNIBASE_ACCOUNT not set", "⚠️", "warning")
    
    def _make_key(self, prefix: str, agent: str) -> str:
        """
        Create a storage key from prefix and agent address.
        
        Args:
            prefix: Key prefix (e.g., "agent:identity:")
            agent: Agent address or identifier
            
        Returns:
            str: Full storage key
        """
        # Normalize agent address (remove 0x if present, or keep as-is)
        agent_normalized = agent.lower().strip()
        if agent_normalized.startswith("0x"):
            agent_normalized = agent_normalized[2:]
        return f"{prefix}{agent_normalized}"
    
    def _store_value(
        self,
        key: str,
        value: Dict[str, Any],
        retry_count: int = 0
    ) -> str:
        """
        Store a value in Unibase key-value store with retry logic.
        
        Args:
            key: Storage key
            value: Value to store (will be JSON serialized)
            retry_count: Current retry attempt number
            
        Returns:
            str: The storage key (Unibase record key)
            
        Raises:
            Exception: If storage fails after all retries
        """
        if not self.enabled:
            log("UnibaseAgentStore", f"Storage disabled, skipping store for key: {key}", "⚠️", "warning")
            return key
        
        try:
            # Prepare payload
            payload = {
                "key": key,
                "value": json.dumps(value, default=str),
                "account": self.account
            }
            
            # Make request to Unibase RPC
            response = requests.post(
                f"{self.rpc_url}/store",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                unibase_key = result.get("key", key)
                log("UnibaseAgentStore", f"Stored key: {key} -> {unibase_key}", "💾", "info")
                return unibase_key
            else:
                raise Exception(f"Unibase RPC error: {response.status_code} - {response.text}")
                
        except Exception as e:
            if retry_count < self.max_retries:
                delay = self.retry_delay * (RETRY_BACKOFF ** retry_count)
                log("UnibaseAgentStore", f"Retry {retry_count + 1}/{self.max_retries} for key {key} after {delay}s", "🔄", "warning")
                time.sleep(delay)
                return self._store_value(key, value, retry_count + 1)
            else:
                log("UnibaseAgentStore", f"Failed to store key {key} after {self.max_retries} retries: {str(e)}", "❌", "error")
                raise
    
    async def _store_value_async(
        self,
        key: str,
        value: Dict[str, Any],
        retry_count: int = 0
    ) -> str:
        """
        Async version of _store_value.
        
        Args:
            key: Storage key
            value: Value to store (will be JSON serialized)
            retry_count: Current retry attempt number
            
        Returns:
            str: The storage key (Unibase record key)
            
        Raises:
            Exception: If storage fails after all retries
        """
        if not self.enabled:
            log("UnibaseAgentStore", f"Storage disabled, skipping store for key: {key}", "⚠️", "warning")
            return key
        
        try:
            # Prepare payload
            payload = {
                "key": key,
                "value": json.dumps(value, default=str),
                "account": self.account
            }
            
            # Make async request to Unibase RPC
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        f"{self.rpc_url}/store",
                        json=payload
                    )
                    if response.status_code == 200:
                        result = response.json()
                        unibase_key = result.get("key", key)
                        log("UnibaseAgentStore", f"Stored key: {key} -> {unibase_key}", "💾", "info")
                        return unibase_key
                    else:
                        raise Exception(f"Unibase RPC error: {response.status_code} - {response.text}")
            except ImportError:
                # Fallback to sync if httpx not available
                log("UnibaseAgentStore", "httpx not available, using sync fallback", "⚠️", "warning")
                return await asyncio.to_thread(self._store_value, key, value, retry_count)
                        
        except Exception as e:
            if retry_count < self.max_retries:
                delay = self.retry_delay * (RETRY_BACKOFF ** retry_count)
                log("UnibaseAgentStore", f"Retry {retry_count + 1}/{self.max_retries} for key {key} after {delay}s", "🔄", "warning")
                await asyncio.sleep(delay)
                return await self._store_value_async(key, value, retry_count + 1)
            else:
                log("UnibaseAgentStore", f"Failed to store key {key} after {self.max_retries} retries: {str(e)}", "❌", "error")
                raise
    
    def _get_value(self, key: str, retry_count: int = 0) -> Optional[Dict[str, Any]]:
        """
        Retrieve a value from Unibase key-value store with retry logic.
        
        Args:
            key: Storage key
            retry_count: Current retry attempt number
            
        Returns:
            dict: Retrieved value, or None if not found
            
        Raises:
            Exception: If retrieval fails after all retries
        """
        if not self.enabled:
            log("UnibaseAgentStore", f"Storage disabled, skipping get for key: {key}", "⚠️", "warning")
            return None
        
        try:
            # Make request to Unibase RPC
            response = requests.get(
                f"{self.rpc_url}/get",
                params={"key": key, "account": self.account},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if "value" in result:
                    value_str = result["value"]
                    return json.loads(value_str)
                return None
            elif response.status_code == 404:
                # Key not found
                return None
            else:
                raise Exception(f"Unibase RPC error: {response.status_code} - {response.text}")
                
        except Exception as e:
            if retry_count < self.max_retries:
                delay = self.retry_delay * (RETRY_BACKOFF ** retry_count)
                log("UnibaseAgentStore", f"Retry {retry_count + 1}/{self.max_retries} for key {key} after {delay}s", "🔄", "warning")
                time.sleep(delay)
                return self._get_value(key, retry_count + 1)
            else:
                log("UnibaseAgentStore", f"Failed to get key {key} after {self.max_retries} retries: {str(e)}", "❌", "error")
                return None
    
    async def _get_value_async(self, key: str, retry_count: int = 0) -> Optional[Dict[str, Any]]:
        """
        Async version of _get_value.
        
        Args:
            key: Storage key
            retry_count: Current retry attempt number
            
        Returns:
            dict: Retrieved value, or None if not found
        """
        if not self.enabled:
            log("UnibaseAgentStore", f"Storage disabled, skipping get for key: {key}", "⚠️", "warning")
            return None
        
        try:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        f"{self.rpc_url}/get",
                        params={"key": key, "account": self.account}
                    )
                    if response.status_code == 200:
                        result = response.json()
                        if "value" in result:
                            value_str = result["value"]
                            return json.loads(value_str)
                        return None
                    elif response.status_code == 404:
                        return None
                    else:
                        raise Exception(f"Unibase RPC error: {response.status_code} - {response.text}")
            except ImportError:
                # Fallback to sync if httpx not available
                log("UnibaseAgentStore", "httpx not available, using sync fallback", "⚠️", "warning")
                return await asyncio.to_thread(self._get_value, key, retry_count)
                        
        except Exception as e:
            if retry_count < self.max_retries:
                delay = self.retry_delay * (RETRY_BACKOFF ** retry_count)
                log("UnibaseAgentStore", f"Retry {retry_count + 1}/{self.max_retries} for key {key} after {delay}s", "🔄", "warning")
                await asyncio.sleep(delay)
                return await self._get_value_async(key, retry_count + 1)
            else:
                log("UnibaseAgentStore", f"Failed to get key {key} after {self.max_retries} retries: {str(e)}", "❌", "error")
                return None
    
    # ========================================================================
    # Identity Storage
    # ========================================================================
    
    def store_identity(self, agent: str, data: Dict[str, Any]) -> str:
        """
        Store agent identity data.
        
        Args:
            agent: Agent address or identifier
            data: Identity data dictionary
            
        Returns:
            str: Unibase record key
        """
        key = self._make_key(IDENTITY_PREFIX, agent)
        value = {
            "agent": agent,
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "type": "identity"
        }
        return self._store_value(key, value)
    
    async def store_identity_async(self, agent: str, data: Dict[str, Any]) -> str:
        """Async version of store_identity."""
        key = self._make_key(IDENTITY_PREFIX, agent)
        value = {
            "agent": agent,
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "type": "identity"
        }
        return await self._store_value_async(key, value)
    
    # ========================================================================
    # Reputation Storage
    # ========================================================================
    
    def store_reputation(self, agent: str, delta: int, metadata: Dict[str, Any]) -> str:
        """
        Store reputation update.
        
        Args:
            agent: Agent address or identifier
            delta: Reputation score change (positive or negative)
            metadata: Additional metadata dictionary
            
        Returns:
            str: Unibase record key
        """
        key = self._make_key(REPUTATION_PREFIX, agent)
        value = {
            "agent": agent,
            "delta": delta,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat(),
            "type": "reputation"
        }
        return self._store_value(key, value)
    
    async def store_reputation_async(self, agent: str, delta: int, metadata: Dict[str, Any]) -> str:
        """Async version of store_reputation."""
        key = self._make_key(REPUTATION_PREFIX, agent)
        value = {
            "agent": agent,
            "delta": delta,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat(),
            "type": "reputation"
        }
        return await self._store_value_async(key, value)
    
    # ========================================================================
    # Validation Storage
    # ========================================================================
    
    def store_validation(self, agent: str, metadata: Dict[str, Any]) -> str:
        """
        Store validation record.
        
        Args:
            agent: Agent address or identifier
            metadata: Validation metadata dictionary
            
        Returns:
            str: Unibase record key
        """
        key = self._make_key(VALIDATION_PREFIX, agent)
        value = {
            "agent": agent,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat(),
            "type": "validation"
        }
        return self._store_value(key, value)
    
    async def store_validation_async(self, agent: str, metadata: Dict[str, Any]) -> str:
        """Async version of store_validation."""
        key = self._make_key(VALIDATION_PREFIX, agent)
        value = {
            "agent": agent,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat(),
            "type": "validation"
        }
        return await self._store_value_async(key, value)
    
    # ========================================================================
    # Memory Storage
    # ========================================================================
    
    def get_agent_memory(self, agent: str) -> Dict[str, Any]:
        """
        Get agent memory/state.
        
        Args:
            agent: Agent address or identifier
            
        Returns:
            dict: Agent memory dictionary, or empty dict if not found
        """
        key = self._make_key(MEMORY_PREFIX, agent)
        result = self._get_value(key)
        if result:
            return result.get("data", {})
        return {}
    
    async def get_agent_memory_async(self, agent: str) -> Dict[str, Any]:
        """Async version of get_agent_memory."""
        key = self._make_key(MEMORY_PREFIX, agent)
        result = await self._get_value_async(key)
        if result:
            return result.get("data", {})
        return {}
    
    def update_agent_memory(self, agent: str, memory_patch: Dict[str, Any]) -> str:
        """
        Update agent memory with a patch (merge operation).
        
        Args:
            agent: Agent address or identifier
            memory_patch: Dictionary to merge into existing memory
            
        Returns:
            str: Unibase record key
        """
        key = self._make_key(MEMORY_PREFIX, agent)
        
        # Get existing memory
        existing = self._get_value(key)
        if existing:
            current_data = existing.get("data", {})
        else:
            current_data = {}
        
        # Merge patch into existing data
        updated_data = {**current_data, **memory_patch}
        
        value = {
            "agent": agent,
            "data": updated_data,
            "timestamp": datetime.now().isoformat(),
            "type": "memory"
        }
        return self._store_value(key, value)
    
    async def update_agent_memory_async(self, agent: str, memory_patch: Dict[str, Any]) -> str:
        """Async version of update_agent_memory."""
        key = self._make_key(MEMORY_PREFIX, agent)
        
        # Get existing memory
        existing = await self._get_value_async(key)
        if existing:
            current_data = existing.get("data", {})
        else:
            current_data = {}
        
        # Merge patch into existing data
        updated_data = {**current_data, **memory_patch}
        
        value = {
            "agent": agent,
            "data": updated_data,
            "timestamp": datetime.now().isoformat(),
            "type": "memory"
        }
        return await self._store_value_async(key, value)

