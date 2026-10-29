import os
import sys
import time
import socket
import subprocess
import pymysql
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from config import settings
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("civicfix.init_db")

def is_port_open(host: str, port: int) -> bool:
    s = socket.socket()
    try:
        res = s.connect_ex((host, port))
        return res == 0
    finally:
        s.close()

def ensure_mysql_running():
    """Checks port 3307; if not open, launches mysqld in detached mode."""
    if is_port_open(settings.DB_HOST, settings.DB_PORT):
        logger.info(f"MySQL is already active on port {settings.DB_PORT}.")
        return

    logger.info(f"MySQL not detected on port {settings.DB_PORT}. Spawning daemon...")
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
        raise RuntimeError("mysqld executable not found on host machine.")

    cmd = [
        mysqld_bin,
        "--no-defaults",
        f"--datadir={datadir}",
        f"--port={settings.DB_PORT}",
        "--bind-address=0.0.0.0",
        "--mysqlx=0",
        "--console"
    ]

    flags = 0x00000008 | 0x00000200 if sys.platform == "win32" else 0
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)

    for i in range(12):
        time.sleep(1)
        if is_port_open(settings.DB_HOST, settings.DB_PORT):
            logger.info(f"MySQL successfully started on port {settings.DB_PORT} (in {i+1}s).")
            return

    raise RuntimeError(f"MySQL failed to accept connections on port {settings.DB_PORT}.")

def run_sql_file(conn, file_path: Path):
    """Executes multi-statement SQL script safely."""
    logger.info(f"Executing SQL file: {file_path.name}")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    statements = []
    current_stmt = []
    delimiter = ";"

    lines = content.splitlines()
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("--") or not stripped:
            continue
        if stripped.upper().startswith("DELIMITER"):
            parts = stripped.split()
            if len(parts) > 1:
                delimiter = parts[1]
            continue
        
        current_stmt.append(line)
        if stripped.endswith(delimiter):
            stmt_text = "\n".join(current_stmt)
            if delimiter != ";":
                stmt_text = stmt_text[:-(len(delimiter))].strip()
            else:
                stmt_text = stmt_text[:-1].strip()
            if stmt_text:
                statements.append(stmt_text)
            current_stmt = []

    with conn.cursor() as cur:
        for stmt in statements:
            try:
                cur.execute(stmt)
            except Exception as e:
                logger.warning(f"Notice executing statement: {e} | Snippet: {stmt[:60]}...")
    conn.commit()
    logger.info(f"Finished {file_path.name} ({len(statements)} statements).")

def init_database(drop_existing: bool = False):
    """Initializes the database, schemas, views, and stored procedures."""
    ensure_mysql_running()

    logger.info(f"Connecting to MySQL at {settings.DB_HOST}:{settings.DB_PORT}...")
    
    admin_conn = pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        charset="utf8mb4",
        autocommit=True
    )
    with admin_conn.cursor() as cur:
        if drop_existing:
            logger.warning(f"Dropping existing database {settings.DB_NAME}...")
            cur.execute(f"DROP DATABASE IF EXISTS {settings.DB_NAME};")
        cur.execute(f"CREATE DATABASE IF NOT EXISTS {settings.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    admin_conn.close()

    conn = pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
        charset="utf8mb4",
        autocommit=False
    )

    sql_dir = backend_dir.parent / "sql"
    run_sql_file(conn, sql_dir / "01_schema.sql")
    run_sql_file(conn, sql_dir / "02_views.sql")
    run_sql_file(conn, sql_dir / "03_procedures_triggers.sql")
    
    conn.close()
    logger.info("CivicFix database schema successfully initialized!")

if __name__ == "__main__":
    init_database(drop_existing=True)
