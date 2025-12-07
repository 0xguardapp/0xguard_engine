"""
Test script for UnibaseAgentStore module.
"""
import asyncio
from unibase_agent_store import UnibaseAgentStore

async def test_store():
    """Test the UnibaseAgentStore functionality."""
    store = UnibaseAgentStore()
    
    # Test agent address
    agent = "0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B"
    
    print("Testing UnibaseAgentStore...")
    print(f"RPC URL: {store.rpc_url}")
    print(f"Account: {store.account}")
    print()
    
    # Test identity storage
    print("1. Testing store_identity...")
    try:
        identity_data = {
            "name": "Test Agent",
            "address": agent,
            "capabilities": ["audit", "validation"]
        }
        key = store.store_identity(agent, identity_data)
        print(f"   ✓ Stored identity, key: {key}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test async identity storage
    print("\n2. Testing store_identity_async...")
    try:
        identity_data = {
            "name": "Test Agent Async",
            "address": agent,
            "capabilities": ["audit"]
        }
        key = await store.store_identity_async(agent, identity_data)
        print(f"   ✓ Stored identity (async), key: {key}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test reputation storage
    print("\n3. Testing store_reputation...")
    try:
        metadata = {
            "reason": "Successful audit",
            "evidence": "unibase://record/evidence123"
        }
        key = store.store_reputation(agent, 10, metadata)
        print(f"   ✓ Stored reputation, key: {key}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test validation storage
    print("\n4. Testing store_validation...")
    try:
        metadata = {
            "validator": "0x123...",
            "evidence": "unibase://record/validation123",
            "status": "valid"
        }
        key = store.store_validation(agent, metadata)
        print(f"   ✓ Stored validation, key: {key}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test memory operations
    print("\n5. Testing memory operations...")
    try:
        # Update memory
        memory_patch = {
            "last_audit": "2024-01-01",
            "audit_count": 5,
            "status": "active"
        }
        key = store.update_agent_memory(agent, memory_patch)
        print(f"   ✓ Updated memory, key: {key}")
        
        # Get memory
        memory = store.get_agent_memory(agent)
        print(f"   ✓ Retrieved memory: {memory}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test async memory operations
    print("\n6. Testing async memory operations...")
    try:
        memory_patch = {
            "last_audit": "2024-01-02",
            "audit_count": 6
        }
        key = await store.update_agent_memory_async(agent, memory_patch)
        print(f"   ✓ Updated memory (async), key: {key}")
        
        memory = await store.get_agent_memory_async(agent)
        print(f"   ✓ Retrieved memory (async): {memory}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    print("\n✓ All tests completed!")

if __name__ == "__main__":
    asyncio.run(test_store())

