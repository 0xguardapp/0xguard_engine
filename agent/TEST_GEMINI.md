# Gemini API Integration Test

This document explains how to test the Gemini API integration.

## Prerequisites

1. Get a Gemini API key from [Google AI Studio](https://ai.google.dev/)
2. Set the API key in your environment

## Testing Methods

### Method 1: Using Environment Variable (Recommended for Testing)

```bash
export GEMINI_API_KEY=your_gemini_api_key_here
cd agent
./venv/bin/python3 test_gemini.py
```

### Method 2: Add to .env File (Recommended for Production)

Add to `agent/.env`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Then run:
```bash
cd agent
./venv/bin/python3 test_gemini.py
```

## What the Test Does

The test script (`test_gemini.py`) performs three tests:

1. **Attack Payload Analysis** - Tests Gemini's ability to analyze SQL injection attacks
2. **Vulnerability Risk Assessment** - Tests Gemini's ability to assess vulnerability severity
3. **Attack Generation** - Tests Gemini's ability to generate SQL injection payloads

## Expected Output

If successful, you should see:
```
✅ Attack Analysis: PASSED
✅ Vulnerability Assessment: PASSED
✅ Attack Generation: PASSED

🎉 All Gemini tests passed!
```

## Integration in Agents

The Gemini integration works as a fallback when `ASI_API_KEY` is missing:

1. **Primary**: ASI1.ai API (if `ASI_API_KEY` is set)
2. **Fallback**: Gemini API (if `GEMINI_API_KEY` is set and `ASI_API_KEY` is missing)
3. **Final Fallback**: Hardcoded defaults (if both are missing)

## Testing the Integration in Agents

To test that agents use Gemini as fallback:

1. Ensure `ASI_API_KEY` is NOT set (or empty)
2. Set `GEMINI_API_KEY` in your `.env` file
3. Start the agents and check logs for "🤖 Gemini" messages

## Troubleshooting

### Error: "GEMINI_API_KEY not configured"
- Make sure you've set the API key in `.env` or as an environment variable
- Verify the key is correct (starts with your API key format)

### Error: "API request failed"
- Check your internet connection
- Verify the API key is valid
- Check Google AI Studio for API status

### Error: "API request timeout"
- The request took longer than 10 seconds
- Try again or check your network connection

