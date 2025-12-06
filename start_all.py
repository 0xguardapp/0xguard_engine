#!/usr/bin/env python3
"""
Start all 0xGuard services: Backend API, Frontend, and optionally Agents
Usage: python start_all.py [--with-agents]
"""
import subprocess
import sys
import time
import signal
import os
from pathlib import Path

# Get script directory
SCRIPT_DIR = Path(__file__).parent
os.chdir(SCRIPT_DIR)

# Track processes
processes = []

def cleanup(signum, frame):
    """Cleanup on exit"""
    print("\n🛑 Shutting down services...")
    for proc in processes:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except:
            try:
                proc.kill()
            except:
                pass
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def check_service(url, name, max_attempts=30):
    """Check if a service is ready"""
    import urllib.request
    import urllib.error
    
    for i in range(max_attempts):
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except:
            time.sleep(1)
    return False

def main():
    print("🚀 Starting 0xGuard Services...\n")
    
    # Check if Redis is running (optional)
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, socket_connect_timeout=1)
        r.ping()
        print("✅ Redis is running")
    except:
        print("⚠️  Redis is not running. Logging will fall back to file-based storage.")
        print("   To start Redis: brew services start redis (macOS) or docker run -d -p 6379:6379 redis\n")
    
    # Create logs directory
    logs_dir = SCRIPT_DIR / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    # Start Backend API Server
    print("📡 Starting Agent API Server (port 8003)...")
    backend_log = logs_dir / "backend.log"
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8003"],
        cwd=SCRIPT_DIR / "agent",
        stdout=open(backend_log, "w"),
        stderr=subprocess.STDOUT
    )
    processes.append(backend_proc)
    
    # Wait for backend to be ready
    print("⏳ Waiting for backend to start...")
    if check_service("http://localhost:8003/health", "Backend"):
        print("✅ Backend API Server is running")
    else:
        print("❌ Backend failed to start. Check logs/backend.log")
        cleanup(None, None)
        return
    
    # Start Frontend
    print("\n🌐 Starting Frontend (port 3000)...")
    frontend_log = logs_dir / "frontend.log"
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=SCRIPT_DIR / "frontend",
        stdout=open(frontend_log, "w"),
        stderr=subprocess.STDOUT
    )
    processes.append(frontend_proc)
    
    # Wait a bit for frontend
    time.sleep(5)
    
    if frontend_proc.poll() is None:
        print("✅ Frontend is starting")
    else:
        print("❌ Frontend failed to start. Check logs/frontend.log")
        cleanup(None, None)
        return
    
    print("\n✨ All services started!")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📡 Backend API:    http://localhost:8003")
    print("🌐 Frontend:       http://localhost:3000")
    print("📊 Backend Logs:   logs/backend.log")
    print("📊 Frontend Logs:  logs/frontend.log")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("\n💡 To start agents, use the frontend or call:")
    print("   curl -X POST http://localhost:8003/api/agents/start \\")
    print("     -H 'Content-Type: application/json' \\")
    print("     -d '{\"targetAddress\": \"0x...\", \"intensity\": \"quick\"}'")
    print("\nPress Ctrl+C to stop all services\n")
    
    # Keep script running
    try:
        for proc in processes:
            proc.wait()
    except KeyboardInterrupt:
        cleanup(None, None)

if __name__ == "__main__":
    main()

