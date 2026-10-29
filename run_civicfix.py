#!/usr/bin/env python3
"""
CivicFix — Unified Orchestration & Startup Engine
Launches:
1. MySQL 9.7 InnoDB Database on port 3308
2. Python FastAPI Backend on http://127.0.0.1:8000
3. React 19 Frontend on http://localhost:5173
4. Opens browser to http://localhost:5173
"""
import os
import sys
import time
import socket
import subprocess
import threading
import webbrowser
from pathlib import Path

CIVICFIX_ROOT = Path(__file__).resolve().parent
WORKSPACE_ROOT = CIVICFIX_ROOT.parent

# Add backend to sys.path
backend_path = CIVICFIX_ROOT / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

def is_port_open(host: str, port: int, timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False

def free_port(port: int):
    """Terminates stale processes holding the target port."""
    if not is_port_open("127.0.0.1", port):
        return
    try:
        out = subprocess.check_output(f'netstat -ano | findstr ":{port}"', shell=True).decode()
        for line in out.strip().splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and "LISTENING" in parts:
                pid = parts[-1]
                if pid != "0" and int(pid) != os.getpid():
                    print(f"      [INFO] Stopping lingering process PID {pid} on port {port}...")
                    subprocess.call(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1)
    except Exception:
        pass

from config import settings

def get_python_bin() -> str:
    """Returns the virtual environment python if present, else sys.executable."""
    venv_py = CIVICFIX_ROOT / ".venv" / "Scripts" / "python.exe"
    if venv_py.exists():
        return str(venv_py)
    return sys.executable

def check_mysql_status() -> tuple[bool, str]:
    """Tests MySQL connectivity with explicit diagnostic status."""
    try:
        import pymysql
        conn = pymysql.connect(
            host=settings.DB_HOST,
            port=int(settings.DB_PORT),
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            connect_timeout=2
        )
        with conn.cursor() as cur:
            cur.execute("SELECT VERSION();")
            ver = cur.fetchone()[0]
        conn.close()
        return True, f"Connected to MySQL {ver} on {settings.DB_HOST}:{settings.DB_PORT}"
    except Exception as e:
        return False, str(e)

def verify_mysql_preflight():
    print(f"[1/4] Checking MySQL Database Service on {settings.DB_HOST}:{settings.DB_PORT}...")
    success, msg = check_mysql_status()
    if success:
        print(f"      [OK] {msg}")
        return True
    
    print(f"      [ERROR] Could not connect to MySQL server at {settings.DB_HOST}:{settings.DB_PORT}")
    print(f"      Diagnostic detail: {msg}")
    print("      Troubleshooting tips:")
    print("      1. Ensure your MySQL Windows service is running (e.g., in PowerShell: 'Start-Service MySQL97')")
    print("      2. Verify DB_PORT, DB_USER, and DB_PASSWORD in backend/.env")
    return False

def ensure_database_seeded():
    print("[2/4] Verifying CivicFix database and schema...")
    py_bin = get_python_bin()
    try:
        import pymysql
        conn = pymysql.connect(
            host=settings.DB_HOST,
            port=int(settings.DB_PORT),
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            charset="utf8mb4",
            connect_timeout=2
        )
        with conn.cursor() as cur:
            cur.execute("SHOW DATABASES LIKE %s;", (settings.DB_NAME,))
            exists = cur.fetchone()
        conn.close()

        if not exists:
            print(f"      [INFO] Initializing '{settings.DB_NAME}' schema and seed records...")
            init_script = backend_path / "scripts" / "init_db.py"
            seed_script = backend_path / "scripts" / "seed_data.py"
            subprocess.run([py_bin, str(init_script)], check=True)
            subprocess.run([py_bin, str(seed_script)], check=True)
            print("      [OK] Database successfully initialized and seeded.")
        else:
            print(f"      [OK] Database '{settings.DB_NAME}' verified with tables.")
    except Exception as e:
        print(f"      [NOTICE] Database check notice: {e}")

def open_browser_delayed(url: str, delay: float = 1.5):
    def _open():
        time.sleep(delay)
        print(f"\n[4/4] Opening CivicFix in your default web browser ({url})...\n")
        webbrowser.open(url)
    t = threading.Thread(target=_open, daemon=True)
    t.start()

def main():
    print("=" * 75)
    print("  CivicFix — Infrastructure Monitoring & Repair Intelligence System")
    print("  College DBMS Course Project • 3NF Relational Architecture")
    print("=" * 75)
    print()

    # Step 1: MySQL Service Preflight
    verify_mysql_preflight()

    # Step 2: Database and Schema
    ensure_database_seeded()

    # Step 3: Free Ports
    free_port(8000)
    free_port(5173)

    print("[3/4] Launching FastAPI Backend and React Frontend...")

    # Launch Backend using virtual environment python
    py_bin = get_python_bin()
    backend_cmd = [py_bin, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=str(backend_path)
    )
    print(f"      [OK] FastAPI backend running on http://127.0.0.1:8000 (PID {backend_proc.pid})")

    # Launch Frontend (using Vite preview for instant high-speed production rendering)
    frontend_path = CIVICFIX_ROOT / "frontend"
    # npm.cmd on Windows
    npm_bin = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_cmd = [npm_bin, "run", "dev"]
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=str(frontend_path)
    )
    print(f"      [OK] React Vite frontend running on http://localhost:5173 (PID {frontend_proc.pid})")

    # Step 4: Open Browser
    open_browser_delayed("http://localhost:5173")

    print()
    print("=" * 75)
    print("  CivicFix Application is LIVE!")
    print("  • Frontend UI: http://localhost:5173")
    print("  • Backend API: http://127.0.0.1:8000/docs (Swagger Interactive API Documentation)")
    print("  • DBMS Insights: http://localhost:5173 (Click 'DBMS Insights' in the sidebar)")
    print("  Press Ctrl+C in this terminal to shut down both servers cleanly.")
    print("=" * 75)
    print()

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("[ERROR] FastAPI backend process stopped unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("[ERROR] React frontend process stopped unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\n[INFO] Gracefully shutting down CivicFix servers...")
    finally:
        try:
            backend_proc.terminate()
            backend_proc.wait(timeout=3)
        except Exception:
            try:
                subprocess.call(f"taskkill /F /PID {backend_proc.pid}", shell=True)
            except Exception:
                pass

        try:
            frontend_proc.terminate()
            frontend_proc.wait(timeout=3)
        except Exception:
            try:
                subprocess.call(f"taskkill /F /PID {frontend_proc.pid}", shell=True)
            except Exception:
                pass

        print("[OK] CivicFix shutdown complete. Thank you!")

if __name__ == "__main__":
    main()
