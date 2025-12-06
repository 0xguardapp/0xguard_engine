#!/bin/bash
# Start all 0xGuard services: Backend API, Frontend, and optionally Agents
# Usage: ./start_all.sh [--with-agents]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}🚀 Starting 0xGuard Services...${NC}"

# Check if Redis is running (optional but recommended)
if ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Redis is not running. Logging will fall back to file-based storage.${NC}"
    echo -e "${YELLOW}   To start Redis: brew services start redis (macOS) or docker run -d -p 6379:6379 redis${NC}"
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend API Server
echo -e "${GREEN}📡 Starting Agent API Server (port 8003)...${NC}"
cd agent
python3 -m uvicorn api_server:app --host 0.0.0.0 --port 8003 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8003/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend API Server is running${NC}"
        break
    fi
    sleep 1
done

if ! curl -s http://localhost:8003/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend failed to start. Check logs/backend.log${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start Frontend
echo -e "${GREEN}🌐 Starting Frontend (port 3000)...${NC}"
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
echo -e "${YELLOW}⏳ Waiting for frontend to start...${NC}"
sleep 5

# Check if frontend is running
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✅ Frontend is starting${NC}"
else
    echo -e "${RED}❌ Frontend failed to start. Check logs/frontend.log${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

echo -e "\n${GREEN}✨ All services started!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📡 Backend API:    http://localhost:8003${NC}"
echo -e "${GREEN}🌐 Frontend:       http://localhost:3000${NC}"
echo -e "${GREEN}📊 Backend Logs:   logs/backend.log${NC}"
echo -e "${GREEN}📊 Frontend Logs:  logs/frontend.log${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}💡 To start agents, use the frontend or call:${NC}"
echo -e "${YELLOW}   curl -X POST http://localhost:8003/api/agents/start \\${NC}"
echo -e "${YELLOW}     -H 'Content-Type: application/json' \\${NC}"
echo -e "${YELLOW}     -d '{\"targetAddress\": \"0x...\", \"intensity\": \"quick\"}'${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Keep script running
wait

