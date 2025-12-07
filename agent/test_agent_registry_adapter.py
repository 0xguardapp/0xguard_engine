"""
Test script for AgentRegistryAdapter.
"""
import os
from agent_registry_adapter import AgentRegistryAdapter

def test_adapter():
    """Test the AgentRegistryAdapter functionality."""
    
    # Initialize adapter
    adapter = AgentRegistryAdapter()
    
    # Test agent address
    agent_address = "0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B"
    
    print("Testing AgentRegistryAdapter...")
    print(f"Identity Registry: {IDENTITY_REGISTRY_ADDRESS or 'Not set'}")
    print(f"Reputation Registry: {REPUTATION_REGISTRY_ADDRESS or 'Not set'}")
    print(f"Validation Registry: {VALIDATION_REGISTRY_ADDRESS or 'Not set'}")
    print()
    
    # Test 1: Register agent
    print("1. Testing register_agent...")
    identity_data = {
        "name": "Test Agent",
        "capabilities": ["audit", "validation"],
        "version": "1.0.0"
    }
    result = adapter.register_agent(agent_address, identity_data)
    print(f"   Success: {result['success']}")
    print(f"   Unibase Key: {result.get('unibase', {}).get('key', 'N/A')}")
    print(f"   On-chain Registered: {result.get('on_chain', {}).get('registered', False)}")
    print(f"   Status: {result.get('combined', {}).get('status', 'N/A')}")
    print()
    
    # Test 2: Update identity
    print("2. Testing update_identity...")
    updates = {
        "version": "1.1.0",
        "new_capability": "proof_verification"
    }
    result = adapter.update_identity(agent_address, updates)
    print(f"   Success: {result['success']}")
    print(f"   Unibase Key: {result.get('unibase', {}).get('key', 'N/A')}")
    print(f"   Status: {result.get('combined', {}).get('status', 'N/A')}")
    print()
    
    # Test 3: Record reputation
    print("3. Testing record_agent_reputation...")
    metadata = {
        "reason": "Successful audit completion",
        "audit_id": "audit_123",
        "vulnerabilities_found": 3
    }
    result = adapter.record_agent_reputation(agent_address, 10, metadata)
    print(f"   Success: {result['success']}")
    print(f"   Unibase Key: {result.get('unibase', {}).get('key', 'N/A')}")
    print(f"   Delta: {result.get('combined', {}).get('delta', 'N/A')}")
    print(f"   On-chain Score: {result.get('combined', {}).get('on_chain_score', 'N/A')}")
    print(f"   Status: {result.get('combined', {}).get('status', 'N/A')}")
    print()
    
    # Test 4: Validate agent
    print("4. Testing validate_agent...")
    validation_data = {
        "validator": "0x1234567890123456789012345678901234567890",
        "validation_type": "security_audit",
        "result": "passed"
    }
    result = adapter.validate_agent(agent_address, validation_data)
    print(f"   Success: {result['success']}")
    print(f"   Unibase Key: {result.get('unibase', {}).get('key', 'N/A')}")
    print(f"   On-chain Valid: {result.get('on_chain', {}).get('valid', False)}")
    print(f"   Status: {result.get('combined', {}).get('status', 'N/A')}")
    print()
    
    print("✓ All tests completed!")

if __name__ == "__main__":
    # Set environment variables for testing (if not already set)
    os.environ.setdefault("IDENTITY_REGISTRY_ADDRESS", "")
    os.environ.setdefault("REPUTATION_REGISTRY_ADDRESS", "")
    os.environ.setdefault("VALIDATION_REGISTRY_ADDRESS", "")
    os.environ.setdefault("OPTIMISM_SEPOLIA_RPC_URL", "https://sepolia.optimism.io")
    
    # Import after setting env vars
    import agent_registry_adapter
    
    # Get addresses from module
    IDENTITY_REGISTRY_ADDRESS = agent_registry_adapter.IDENTITY_REGISTRY_ADDRESS
    REPUTATION_REGISTRY_ADDRESS = agent_registry_adapter.REPUTATION_REGISTRY_ADDRESS
    VALIDATION_REGISTRY_ADDRESS = agent_registry_adapter.VALIDATION_REGISTRY_ADDRESS
    
    test_adapter()

