#!/usr/bin/env python3
"""
Simple HTTP server to serve the 0xGuard frontend.
Run this script to start the development server.
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = 8080

# Change to the project root directory
project_root = Path(__file__).parent
os.chdir(project_root)

# Custom handler to serve files from frontend/ and allow CORS for logs.json
class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_GET(self):
        # Handle logs.json - serve from project root
        if self.path == '/logs.json' or self.path == '/logs.json/':
            self.path = '/logs.json'
            return super().do_GET()
        
        # Handle root and index.html - serve frontend/index.html
        if self.path == '/' or self.path == '/index.html':
            self.path = '/frontend/index.html'
            return super().do_GET()
        
        # Handle frontend assets (CSS, JS) - they reference relative paths
        if self.path.startswith('/frontend/'):
            return super().do_GET()
        
        # For other paths, try serving from frontend directory
        if not self.path.startswith('/frontend/'):
            # Check if file exists in frontend
            frontend_path = Path('frontend') / self.path.lstrip('/')
            if frontend_path.exists():
                self.path = '/frontend' + self.path
                return super().do_GET()
        
        return super().do_GET()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"🚀 0xGuard UI server running at http://localhost:{PORT}")
        print(f"📁 Serving from: {project_root}")
        print(f"📝 Make sure logs.json exists in the project root for live updates")
        print(f"🛑 Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")
            sys.exit(0)

