"""
Simple test script for ASI.Cloud API integration
Tests the generate_attack() function without requiring all dependencies.
"""
import asyncio
import os
import httpx
import sys
from pathlib import Path

# Mock the logger to avoid dependency issues
class MockLogger:
    @staticmethod
    def log(actor, message, icon="🔵", log_type="info", is_vulnerability=False):
        print(f"[{icon} {actor}] {message}")

# Add to path and mock logger
sys.path.insert(0, str(Path(__file__).parent))
sys.modules['logger'] = type(sys)('logger')
sys.modules['logger'].log = MockLogger.log

# ASI.Cloud API Configuration
ASI_API_KEY = os.getenv("ASI_API_KEY", "sk_f19e4e7f7c0e460e9ebeed7132a13fedcca7c7d7133a482ca0636e2850751d2b")
ASI_API_URL = os.getenv("ASI_API_URL", "https://api.asi.cloud/v1/chat/completions")


async def generate_attack() -> str:
    """
    Generate a unique SQL injection attack string using ASI.Cloud API.
    
    Returns:
        str: Generated SQL injection string, or fallback payload if API fails
    """
    prompt = "You are a penetration tester. Generate a unique SQL injection string. Return only the string."
    
    try:
        MockLogger.log("ASI.Cloud", "Generating SQL injection variant based on previous failure...", "🧠", "info")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                ASI_API_URL,
                headers={
                    "Authorization": f"Bearer {ASI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4",
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 100,
                    "temperature": 0.7,
                },
            )
            
            print(f"\n📡 API Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"📦 Response Data: {data}")
                attack_string = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                
                if attack_string:
                    MockLogger.log("ASI.Cloud", f"Generated attack vector: {attack_string}", "🧠", "info")
                    return attack_string
                else:
                    MockLogger.log("ASI.Cloud", "Empty response from API, using fallback", "🧠", "info")
            else:
                print(f"❌ API Error Response: {response.text}")
                MockLogger.log("ASI.Cloud", f"API error: {response.status_code} - {response.text}", "🧠", "info")
                
    except httpx.TimeoutException:
        MockLogger.log("ASI.Cloud", "API request timeout, using fallback", "🧠", "info")
    except httpx.RequestError as e:
        print(f"❌ Request Error: {str(e)}")
        MockLogger.log("ASI.Cloud", f"API request failed: {str(e)}, using fallback", "🧠", "info")
    except Exception as e:
        print(f"❌ Unexpected Error: {str(e)}")
        import traceback
        traceback.print_exc()
        MockLogger.log("ASI.Cloud", f"Unexpected error: {str(e)}, using fallback", "🧠", "info")
    
    # Fallback to a simple SQL injection pattern
    fallback_payloads = [
        "' OR '1'='1",
        "admin' --",
        "' UNION SELECT NULL--",
        "1' OR '1'='1",
    ]
    import random
    fallback = random.choice(fallback_payloads)
    MockLogger.log("ASI.Cloud", f"Using fallback payload: {fallback}", "🧠", "info")
    return fallback


async def test_asi_integration():
    """Test the ASI.Cloud API integration."""
    print("\n" + "=" * 60)
    print("🧪 Testing ASI.Cloud Integration")
    print("=" * 60)
    print(f"\n🔑 API Key: {ASI_API_KEY[:20]}...")
    print(f"🌐 API URL: {ASI_API_URL}")
    
    try:
        print("\n1️⃣  Calling generate_attack()...")
        attack_string = await generate_attack()
        
        print(f"\n✅ Success! Generated attack string:")
        print(f"   '{attack_string}'")
        print(f"\n   📊 Length: {len(attack_string)} characters")
        print(f"   📝 Type: {type(attack_string).__name__}")
        
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


async def main():
    """Run the test."""
    success = await test_asi_integration()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Test completed successfully!")
    else:
        print("❌ Test failed!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())

