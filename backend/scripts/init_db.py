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

def test_mysql_ready(host: str, port: int, timeout: float = 2.0) -> bool:
    """Checks if the target host and port accepts socket connections."""
    s = socket.socket()
    s.settimeout(timeout)
    try:
        res = s.connect_ex((host, port))
        return res == 0
    finally:
        s.close()

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
    if not test_mysql_ready(settings.DB_HOST, int(settings.DB_PORT)):
        raise ConnectionError(
            f"MySQL is not accepting connections at {settings.DB_HOST}:{settings.DB_PORT}. "
            f"Please ensure your MySQL Windows service is started (e.g. 'Start-Service MySQL97')."
        )

    logger.info(f"Connecting to MySQL admin server at {settings.DB_HOST}:{settings.DB_PORT} as '{settings.DB_USER}'...")
    try:
        admin_conn = pymysql.connect(
            host=settings.DB_HOST,
            port=int(settings.DB_PORT),
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            charset="utf8mb4",
            autocommit=True
        )
    except pymysql.err.OperationalError as e:
        if e.args[0] == 1045:
            raise PermissionError(
                f"Access denied for user '{settings.DB_USER}'@'{settings.DB_HOST}'. "
                f"Please update DB_PASSWORD in backend/.env with your valid MySQL password."
            ) from e
        raise e

    with admin_conn.cursor() as cur:
        if drop_existing:
            logger.warning(f"Dropping existing database {settings.DB_NAME}...")
            cur.execute(f"DROP DATABASE IF EXISTS {settings.DB_NAME};")
        cur.execute(f"CREATE DATABASE IF NOT EXISTS {settings.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    admin_conn.close()

    conn = pymysql.connect(
        host=settings.DB_HOST,
        port=int(settings.DB_PORT),
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
