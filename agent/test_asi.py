"""
Test script for ASI.Cloud API integration
Run this to verify the generate_attack() function works correctly.
"""
import asyncio
import sys
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from red_team import generate_attack


async def test_asi_integration():
    """Test the ASI.Cloud API integration."""
    print("🧪 Testing ASI.Cloud Integration...")
    print("=" * 50)
    
    try:
        print("\n1. Testing generate_attack() function...")
        attack_string = await generate_attack()
        
        print(f"\n✅ Success! Generated attack string:")
        print(f"   '{attack_string}'")
        print(f"\n   Length: {len(attack_string)} characters")
        print(f"   Type: {type(attack_string).__name__}")
        
        # Validate the response
        if attack_string and isinstance(attack_string, str) and len(attack_string) > 0:
            print("\n✅ Validation passed: Attack string is valid")
            return True
        else:
            print("\n❌ Validation failed: Attack string is invalid")
            return False
            
    except Exception as e:
        print(f"\n❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_multiple_attacks():
    """Test generating multiple attacks to verify uniqueness."""
    print("\n" + "=" * 50)
    print("2. Testing multiple attack generation...")
    print("=" * 50)
    
    attacks = []
    for i in range(3):
        print(f"\n   Generating attack #{i+1}...")
        attack = await generate_attack()
        attacks.append(attack)
        print(f"   Result: '{attack}'")
        await asyncio.sleep(1)  # Small delay between requests
    
    print(f"\n   Generated {len(attacks)} attacks")
    print(f"   Unique attacks: {len(set(attacks))}")
    
    if len(set(attacks)) > 1:
        print("   ✅ Multiple unique attacks generated!")
    else:
        print("   ⚠️  All attacks were identical (may be expected with fallback)")


async def main():
    """Run all tests."""
    print("\n" + "=" * 50)
    print("ASI.Cloud Integration Test Suite")
    print("=" * 50)
    
    # Test 1: Basic functionality
    success = await test_asi_integration()
    
    # Test 2: Multiple attacks
    await test_multiple_attacks()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All tests completed!")
    else:
        print("❌ Some tests failed!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())

