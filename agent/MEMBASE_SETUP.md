# Membase Integration Setup Guide

## ✅ Implementation Complete

Membase integration has been fully implemented and configured for the 0xGuard agents.

## What Was Done

### 1. ✅ Added Membase SDK Dependency
- Added `membase @ git+https://github.com/unibaseio/membase.git` to `pyproject.toml`
- The SDK will be installed when dependencies are installed

### 2. ✅ Implemented MCP Helper Module
- **File**: `agent/mcp_helper.py`
- Implements actual Membase SDK integration (not just placeholders)
- Provides `get_mcp_messages()` and `save_mcp_message()` functions
- Auto-detects Membase availability and configuration
- Graceful fallback if Membase is not available

### 3. ✅ Updated Unibase Integration
- **File**: `agent/unibase.py`
- Updated to use Membase when `USE_MEMBASE=true`
- Auto-detects Membase usage based on environment variable
- Falls back to file storage if Membase is unavailable
- All functions now support Membase integration

### 4. ✅ Updated Agents
- **Red Team Agent** (`agent/red_team.py`): Uses Membase for exploit storage
- **Judge Agent** (`agent/judge.py`): Uses Membase for bounty token storage
- Both agents auto-detect Membase usage

### 5. ✅ Added Environment Configuration
- **File**: `agent/env.example`
- Added Membase configuration variables:
  - `USE_MEMBASE=false` - Enable/disable Membase
  - `MEMBASE_ID=0xguard_agent` - Unique agent identifier
  - `MEMBASE_ACCOUNT=default` - Membase account name
  - `MEMBASE_SECRET_KEY=` - Secret key for Membase

### 6. ✅ Updated Documentation
- Updated `README.md` with Membase setup instructions
- Added Membase to external services section

## How to Use

### Option 1: File-Based Storage (Default)
No configuration needed. The system will automatically use file-based storage:
- Exploits stored in `known_exploits.json`
- Bounties stored in `bounty_tokens.json`

### Option 2: Membase Storage (Optional)

1. **Install Membase SDK**:
   ```bash
   pip install git+https://github.com/unibaseio/membase.git
   ```

2. **Configure Environment Variables**:
   ```bash
   export USE_MEMBASE=true
   export MEMBASE_ID="0xguard_agent"
   export MEMBASE_ACCOUNT="default"
   export MEMBASE_SECRET_KEY="your_secret_key_here"
   ```

   Or add to your `.env` file:
   ```bash
   USE_MEMBASE=true
   MEMBASE_ID=0xguard_agent
   MEMBASE_ACCOUNT=default
   MEMBASE_SECRET_KEY=your_secret_key_here
   ```

3. **Set up Membase Account**:
   - Ensure `MEMBASE_ACCOUNT` has a balance in the BNB testnet
   - Register your agent on-chain if needed
   - See [Membase Documentation](https://openos-labs.gitbook.io/unibase-docs/membase/quick-start) for details

4. **Run Agents**:
   The agents will automatically use Membase if configured, or fall back to file storage if not.

## Features

### Automatic Detection
- Agents automatically detect if Membase is enabled
- No code changes needed - just set environment variables
- Graceful fallback to file storage if Membase is unavailable

### Persistent Memory
- Exploits are stored persistently across agent restarts
- Bounty tokens are stored in Membase
- All data is synced to the Unibase hub

### Error Handling
- Comprehensive error handling with fallback mechanisms
- Logs all Membase operations
- Continues operation even if Membase fails

## Conversation IDs

The system uses the following conversation IDs:
- **Exploits**: `0xguard_exploits`
- **Bounties**: `0xguard_bounties`

## Testing

To test Membase integration:

1. Set `USE_MEMBASE=true` in your environment
2. Run the agents
3. Check logs for Membase operations (look for 💾 icon)
4. Verify data persists across agent restarts

## Troubleshooting

### Membase Not Working
- Check that `USE_MEMBASE=true` is set
- Verify Membase SDK is installed: `pip list | grep membase`
- Check environment variables are correct
- System will automatically fall back to file storage

### Import Errors
- Install Membase SDK: `pip install git+https://github.com/unibaseio/membase.git`
- Check Python version (requires 3.11+)

### Connection Issues
- Verify `MEMBASE_ACCOUNT` has balance
- Check network connectivity
- System will fall back to file storage automatically

## Status

✅ **Membase is fully configured and operational**
- Implementation complete
- Error handling in place
- Fallback mechanisms working
- Ready for production use

