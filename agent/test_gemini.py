#!/usr/bin/env python3
"""
Test script for Gemini API integration
Tests the Gemini fallback LLM functionality
"""
import asyncio
import sys
import os
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent))

import httpx
from config import get_config
from logger import log

# Load configuration
config = get_config()

# Gemini API Configuration
# Allow override from environment variable for testing
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or config.GEMINI_API_KEY
GEMINI_API_URL = os.getenv("GEMINI_API_URL", "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent")


async def test_gemini_api(prompt: str) -> str:
    """
    Test Gemini API call.
    
    Args:
        prompt: The prompt to send to Gemini
        
    Returns:
        str: Response text from Gemini, or error message
    """
    if not GEMINI_API_KEY or not GEMINI_API_KEY.strip():
        return "ERROR: GEMINI_API_KEY not configured"
    
    try:
        print(f"🤖 Calling Gemini API...")
        print(f"   URL: {GEMINI_API_URL}")
        print(f"   Key: {GEMINI_API_KEY[:10]}...{GEMINI_API_KEY[-10:]}")
        print(f"   Prompt: {prompt[:50]}...")
        print()
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
                headers={
                    "Content-Type": "application/json",
                },
                json={
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 200,
                    }
                },
            )
            
            print(f"📡 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Response received successfully")
                print(f"   Response keys: {list(data.keys())}")
                
                # Extract text from Gemini response
                candidates = data.get("candidates", [])
                if candidates and len(candidates) > 0:
                    content = candidates[0].get("content", {})
                    parts = content.get("parts", [])
                    if parts and len(parts) > 0:
                        text = parts[0].get("text", "").strip()
                        if text:
                            print(f"\n📝 Gemini Response:")
                            print(f"   {text}")
                            return text
                        else:
                            return "ERROR: Empty text in response"
                else:
                    return f"ERROR: No candidates in response. Full response: {data}"
            else:
                error_text = response.text
                print(f"❌ API Error: {response.status_code}")
                print(f"   {error_text}")
                return f"ERROR: {response.status_code} - {error_text}"
                
    except httpx.TimeoutException:
        return "ERROR: API request timeout"
    except httpx.RequestError as e:
        return f"ERROR: API request failed: {str(e)}"
    except Exception as e:
        return f"ERROR: Unexpected error: {str(e)}"


async def test_attack_analysis():
    """Test Gemini for attack payload analysis"""
    print("=" * 70)
    print("🧪 Test 1: Attack Payload Analysis")
    print("=" * 70)
    
    prompt = """You are a cybersecurity expert analyzing an attack payload.

Attack Payload: '; DROP TABLE users; --

Analyze this attack and provide:
1. Attack type (SQL Injection, XSS, Command Injection, etc.)
2. Threat level (LOW, MEDIUM, HIGH, CRITICAL)
3. Brief defensive recommendation

Return JSON format: {"attack_type": "string", "threat_level": "string", "defensive_recommendation": "string"}"""
    
    result = await test_gemini_api(prompt)
    if result:
        print(f"\n{'✅ SUCCESS' if not result.startswith('ERROR') else '❌ FAILED'}: {result[:100]}...")
    else:
        print(f"\n❌ FAILED: No result returned")
        result = "ERROR: No result"
    return result


async def test_vulnerability_analysis():
    """Test Gemini for vulnerability assessment"""
    print("\n" + "=" * 70)
    print("🧪 Test 2: Vulnerability Risk Assessment")
    print("=" * 70)
    
    prompt = """You are a cybersecurity expert analyzing a vulnerability. 

Exploit Payload: '; DROP TABLE users; --
Target Response: Database connection lost

Analyze this vulnerability and provide:
1. Risk score (0-100)
2. Severity level (LOW, MEDIUM, HIGH, CRITICAL)
3. Brief recommendation

Return JSON format: {"risk_score": number, "severity": "string", "recommendation": "string"}"""
    
    result = await test_gemini_api(prompt)
    if result:
        print(f"\n{'✅ SUCCESS' if not result.startswith('ERROR') else '❌ FAILED'}: {result[:100]}...")
    else:
        print(f"\n❌ FAILED: No result returned")
        result = "ERROR: No result"
    return result


async def test_attack_generation():
    """Test Gemini for attack generation"""
    print("\n" + "=" * 70)
    print("🧪 Test 3: SQL Injection Attack Generation")
    print("=" * 70)
    
    prompt = "You are a penetration tester. Generate a unique SQL injection string. Return only the string."
    
    result = await test_gemini_api(prompt)
    if result:
        print(f"\n{'✅ SUCCESS' if not result.startswith('ERROR') else '❌ FAILED'}: {result[:100]}...")
    else:
        print(f"\n❌ FAILED: No result returned")
        result = "ERROR: No result"
    return result


async def main():
    """Run all Gemini tests"""
    print("\n" + "=" * 70)
    print("🚀 Gemini API Integration Test")
    print("=" * 70)
    print()
    
    # Check configuration
    if not GEMINI_API_KEY or not GEMINI_API_KEY.strip():
        print("❌ GEMINI_API_KEY is not configured!")
        print("   Please set GEMINI_API_KEY in agent/.env file")
        print("   Or set it as an environment variable:")
        print("   export GEMINI_API_KEY=your_key_here")
        print("   Get your API key from: https://ai.google.dev/")
        return
    
    print(f"✅ GEMINI_API_KEY is configured")
    print(f"   API URL: {GEMINI_API_URL}")
    print(f"   Key (masked): {GEMINI_API_KEY[:10]}...{GEMINI_API_KEY[-10:] if len(GEMINI_API_KEY) > 20 else '***'}")
    print()
    
    # Run tests
    results = []
    
    try:
        result1 = await test_attack_analysis()
        results.append(("Attack Analysis", result1))
        
        await asyncio.sleep(1)  # Rate limiting
        
        result2 = await test_vulnerability_analysis()
        results.append(("Vulnerability Assessment", result2))
        
        await asyncio.sleep(1)  # Rate limiting
        
        result3 = await test_attack_generation()
        results.append(("Attack Generation", result3))
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        return
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 Test Summary")
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        if result.startswith("ERROR"):
            print(f"❌ {test_name}: FAILED")
            print(f"   {result}")
            failed += 1
        else:
            print(f"✅ {test_name}: PASSED")
            passed += 1
    
    print()
    print(f"Total: {len(results)} tests")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All Gemini tests passed!")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Check the errors above.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Tests cancelled by user")

