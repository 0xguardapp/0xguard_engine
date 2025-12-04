# Judge Agent Quick Start Guide

## Prerequisites

- Python 3.11 or higher
- pip (Python package manager)

## Installation

### Linux/macOS

```bash
cd agent
chmod +x setup.sh
./setup.sh
```

### Windows

```cmd
cd agent
setup.bat
```

### Manual Installation

If you prefer to set up manually:

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp env.example .env
# Windows: copy env.example .env
```

## Configuration

1. Edit the `.env` file with your credentials:

```bash
nano .env
# or
vim .env
```

2. Required configuration:
   - `UNIBASE_ACCOUNT` - Your Unibase account address
   - `MEMBASE_ACCOUNT` - Your Membase account name
   - `JUDGE_PRIVATE_KEY` - Private key for signing transactions
   - `BOUNTY_TOKEN_ADDRESS` - Address of the bounty token contract

3. Optional configuration:
   - `TARGET_SECRET_KEY` - Secret key for verification (default: "fetch_ai_2024")
   - `LOG_LEVEL` - Logging level (default: "INFO")
   - Bounty rates and security settings

## Running the Judge Agent

### Main Agent

```bash
# Activate virtual environment first
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows

# Run the agent
python judge_agent_main.py
```

### Example Usage

```bash
python judge_agent_main_example.py
```

## Usage Example

```python
from judge_agent_main import IntegratedJudgeAgent
from config import get_config

# Load configuration
config = get_config()

# Initialize agent
judge = IntegratedJudgeAgent(config)

# Monitor an attack
event_id = await judge.monitor_attack(
    red_team_id="red_team_alpha",
    target_id="target_app",
    attack_data={
        "exploit_type": "sql_injection",
        "payload": "' OR '1'='1"
    }
)

# Process attack result
result = await judge.process_attack_result(
    event_id["event_id"],
    {
        "success": True,
        "secret_key": "fetch_ai_2024"
    }
)
```

## Troubleshooting

### Python version error

If you get a Python version error, ensure you have Python 3.11 or higher:

```bash
python3 --version
```

### Virtual environment issues

If the virtual environment doesn't activate:

```bash
# Remove and recreate
rm -rf venv
python3 -m venv venv
source venv/bin/activate
```

### Missing dependencies

If dependencies fail to install:

```bash
# Upgrade pip first
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

### Configuration validation errors

If you get configuration validation errors:

1. Check that `.env` file exists
2. Verify all required fields are set:
   - `UNIBASE_ACCOUNT`
   - `MEMBASE_ACCOUNT`
   - `JUDGE_PRIVATE_KEY`
   - `BOUNTY_TOKEN_ADDRESS`

## Project Structure

```
agent/
├── config.py                 # Configuration management
├── judge_agent.py            # Core Judge Agent class
├── judge_agent_main.py       # Integrated Judge Agent
├── judge_agent_main_example.py  # Usage examples
├── unibase.py                # Unibase integration
├── logger.py                 # Logging utilities
├── requirements.txt          # Python dependencies
├── env.example              # Environment template
├── setup.sh                 # Linux/macOS setup script
├── setup.bat                # Windows setup script
└── QUICKSTART.md            # This file
```

## Next Steps

1. Configure your `.env` file with actual credentials
2. Test the agent with the example script
3. Integrate with your Red Team and Target systems
4. Monitor bounties and audit logs

## Support

For issues or questions, please refer to the main project documentation.

