import os
import sys
import time
import socket
import subprocess
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from config import settings
import logging

logger = logging.getLogger("civicfix.lifecycle")

def is_db_connected() -> bool:
    """Verifies that MySQL is not only open on the port, but accepts connection to civicfix_db."""
    try:
        import pymysql
        conn = pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
            charset="utf8mb4",
            connect_timeout=1
        )
        conn.close()
        return True
    except Exception:
        return False

def ensure_mysql_running():
    """Ensures MySQL is running and accepting connections on settings.DB_PORT."""
    if is_db_connected():
        return True

    workspace_root = backend_dir.parent.parent
    datadir = workspace_root / "mysql_local_data"
    mysqld_paths = [
        r"C:\Program Files\MySQL\MySQL Server 9.7\bin\mysqld.exe",
        r"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe",
        r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe",
    ]
    mysqld_bin = None
    for p in mysqld_paths:
        if os.path.exists(p):
            mysqld_bin = p
            break

    if not mysqld_bin:
        logger.warning("mysqld executable not found on host machine.")
        return False

    cmd = [
        mysqld_bin,
        "--no-defaults",
        f"--datadir={datadir}",
        f"--port={settings.DB_PORT}",
        "--bind-address=127.0.0.1",
        "--mysqlx=0",
        "--console"
    ]

    flags = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
    try:
        subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)
    except Exception as e:
        logger.error(f"Failed to spawn mysqld process: {e}")

    for i in range(12):
        time.sleep(1)
        if is_db_connected():
            logger.info(f"MySQL successfully running and authenticated on port {settings.DB_PORT}.")
            return True

    return False
