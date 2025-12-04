#!/bin/bash
# Initialize Midnight Devnet
# This script sets up and starts the Midnight development network

set -e

echo "🌙 Initializing Midnight Devnet..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^midnight-devnet$"; then
    echo "⚠️  Container 'midnight-devnet' already exists."
    read -p "Do you want to remove and recreate it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing container..."
        docker stop midnight-devnet > /dev/null 2>&1 || true
        docker rm midnight-devnet > /dev/null 2>&1 || true
    else
        echo "Starting existing container..."
        docker start midnight-devnet
        echo "✅ Devnet started!"
        exit 0
    fi
fi

# Check if port 6300 is available
if lsof -Pi :6300 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 6300 is already in use."
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start the devnet
echo "Starting Midnight proof server..."
docker run -d \
    --name midnight-devnet \
    -p 6300:6300 \
    midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'

# Wait for server to be ready
echo "Waiting for server to be ready..."
sleep 5

# Verify it's running
if docker ps --format '{{.Names}}' | grep -q "^midnight-devnet$"; then
    echo "✅ Midnight Devnet started successfully!"
    echo ""
    echo "Container status:"
    docker ps --filter name=midnight-devnet --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "To view logs: npm run devnet:logs"
    echo "To stop: npm run devnet:stop"
    echo "To verify: npm run devnet:verify"
else
    echo "❌ Failed to start devnet. Check logs:"
    docker logs midnight-devnet
    exit 1
fi

