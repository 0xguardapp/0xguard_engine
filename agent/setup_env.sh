#!/bin/bash
# Setup script for 0xGuard agent environment variables

set -e

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${AGENT_DIR}/.env"
ENV_EXAMPLE="${AGENT_DIR}/env.example"

echo "🔧 Setting up 0xGuard Agent Environment Configuration"
echo ""

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env file already exists at: $ENV_FILE"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Existing .env file preserved."
        exit 0
    fi
    echo "Backing up existing .env to .env.backup"
    cp "$ENV_FILE" "${ENV_FILE}.backup"
fi

# Copy from example if .env doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo "📋 Creating .env from env.example..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "✅ Created $ENV_FILE"
else
    echo "📋 Updating existing .env file..."
fi

echo ""
echo "🔑 Setting Agentverse API Key..."

# Set Agentverse API Key
AGENTVERSE_KEY="eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3Njc0NjQ3NzQsImlhdCI6MTc2NDg3Mjc3NCwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiIzMDExMjJiNWNiODkwN2I1YTBjMzRjMDQiLCJwayI6IkF1NCtIWjYxUlM2K283RTFkak1RYnlYWWJQRVNNWFVFZmZ5ZUhGNVE5NlBUIiwic2NvcGUiOiJhdiIsInN1YiI6IjVjMDdiNDQxZmM5ZTk1MDFlM2I0Y2FjYWJkNmM5MTJhYWIxMTM3ZTY5YWIxODk0YSJ9.ko8LHxDG3CB6CBlHX_OYq6DmOB9dCAcpBLywMCatEOzRXwdF1LiwnuI9AVOwpeqdmtqlispQgbNwmT3cY31clq32xmX3fn4Py_eLR4YDswdogJ6_v1rRNF_d6I4H8wgJDx4Tx31ZG9hrYiXHK6btY6ltg_JsfGxAR7o25iRzM3lHmwjFsL3skkfPf-XPgUZc_Nc5cGj93cEQ-NXV3YvYrbGkyn7fBDz_REdvepykjLOHMsLCXHBYf5lpYklQGCQBSZU1QK9lTcu5ZQvZkYY0EbwYqx0hTtiWq77uYU6hDhbHvSwKtGzv9xwdr9RjVcfxKkUBuidxrbK842FxvcLzrg"

# Update or add AGENTVERSE_KEY in .env file
if grep -q "^AGENTVERSE_KEY=" "$ENV_FILE"; then
    # Key exists, update it
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^AGENTVERSE_KEY=.*|AGENTVERSE_KEY=$AGENTVERSE_KEY|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^AGENTVERSE_KEY=.*|AGENTVERSE_KEY=$AGENTVERSE_KEY|" "$ENV_FILE"
    fi
    echo "✅ Updated AGENTVERSE_KEY in .env"
else
    # Key doesn't exist, add it
    echo "" >> "$ENV_FILE"
    echo "# Agentverse API Key" >> "$ENV_FILE"
    echo "AGENTVERSE_KEY=$AGENTVERSE_KEY" >> "$ENV_FILE"
    echo "✅ Added AGENTVERSE_KEY to .env"
fi

echo ""
echo "✅ Configuration complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Review and update other values in: $ENV_FILE"
echo "   2. Set required variables:"
echo "      - UNIBASE_ACCOUNT"
echo "      - MEMBASE_ACCOUNT"
echo "      - JUDGE_PRIVATE_KEY"
echo "      - BOUNTY_TOKEN_ADDRESS"
echo "      - ASI_API_KEY (if using AI attack generation)"
echo ""
echo "🔒 Security reminder:"
echo "   - Never commit .env file to git"
echo "   - Keep your API keys secure"
echo ""

