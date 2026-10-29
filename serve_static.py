"""
CivicFix - Lightweight SPA Static File Server
Enables serving the built React 19 UI (dist/) when deployed as a Python Web Service on Render.
Handles client-side routing (rewriting non-asset paths to index.html).
"""

import os
import sys
import http.server
import socketserver
from pathlib import Path

PORT = int(os.environ.get("PORT", 8000))

# Search for dist directory in multiple possible relative locations
candidates = [
    Path(__file__).resolve().parent / "dist",
    Path(__file__).resolve().parent.parent / "dist",
    Path(__file__).resolve().parent.parent.parent / "dist",
    Path.cwd() / "dist",
    Path.cwd().parent / "dist",
    Path.cwd().parent.parent / "dist",
    Path.cwd() / "frontend" / "dist",
    Path.cwd().parent / "frontend" / "dist",
]

DIST_DIR = None
for cand in candidates:
    if cand.exists() and (cand / "index.html").exists():
        DIST_DIR = cand.resolve()
        break

if not DIST_DIR:
    print("[ERROR] Built UI files (dist/index.html) not found in any candidate directory:")
    for c in candidates:
        print(f"  - {c}")
    sys.exit(1)

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self):
        # Strip query string for file existence check
        clean_path = self.path.split("?")[0].lstrip("/")
        target_file = (DIST_DIR / clean_path).resolve()

        # If requesting a specific file with an extension (.js, .css, .svg, .png, etc.) that exists, serve it
        if target_file.is_file() and target_file.exists():
            return super().do_GET()

        # For all SPA client-side routes (e.g. /map, /cases, /assets, /dbms), serve index.html
        self.path = "/index.html"
        return super().do_GET()

    def end_headers(self):
        # Enable CORS and basic security headers
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

def main():
    print("=" * 60)
    print(f"CivicFix UI Static Server starting on port {PORT}")
    print(f"Serving assets from: {DIST_DIR}")
    print("=" * 60)

    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
        print(f"Server is listening on 0.0.0.0:{PORT}...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    main()
