#!/bin/bash
# Test script for Midnight Devnet

set -e

echo "🔍 Testing Midnight Devnet..."

# Pull the image
echo "📥 Pulling Midnight devnet image..."
docker pull midnightnetwork/devnet:latest

# Run the devnet container
echo "🚀 Starting Midnight devnet container..."
docker run -d \
  --name midnight-devnet-test \
  -p 6300:6300 \
  midnightnetwork/devnet:latest

# Wait for devnet to be ready
echo "⏳ Waiting for devnet to be ready (this may take up to 60 seconds)..."
for i in {1..30}; do
  if curl -f http://localhost:6300/health > /dev/null 2>&1; then
    echo "✅ Midnight devnet is ready!"
    break
  fi
  echo "   Attempt $i/30..."
  sleep 2
done

# Test health endpoint
echo ""
echo "🏥 Testing health endpoint..."
if curl -f http://localhost:6300/health; then
  echo ""
  echo "✅ Health check passed!"
else
  echo ""
  echo "❌ Health check failed!"
  exit 1
fi

# Cleanup
echo ""
read -p "Stop and remove test container? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  docker stop midnight-devnet-test
  docker rm midnight-devnet-test
  echo "🧹 Cleaned up test container"
fi

echo ""
echo "✅ Midnight devnet test complete!"

