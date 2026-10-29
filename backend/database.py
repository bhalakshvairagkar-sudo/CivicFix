import pymysql
from pymysql.cursors import DictCursor
from contextlib import contextmanager
from typing import Generator
import logging
from config import settings
from scripts.db_lifecycle import ensure_mysql_running

logger = logging.getLogger("civicfix.database")

def get_connection(autocommit: bool = True):
    """Establishes a connection to MySQL using application settings, ensuring daemon is up."""
    ensure_mysql_running()
    return pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=autocommit,
        connect_timeout=5,
    )

def ping_database() -> dict:
    """Verifies MySQL connectivity and retrieves server version."""
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT VERSION() AS version, DATABASE() AS current_db;")
            info = cur.fetchone()
        conn.close()
        return {"status": "connected", "version": info["version"], "database": info["current_db"]}
    except Exception as e:
        logger.error(f"Database ping failed: {e}")
        return {"status": "error", "message": str(e)}

@contextmanager
def get_db_cursor() -> Generator[pymysql.cursors.DictCursor, None, None]:
    """Context manager for standalone read/write statements with autocommit."""
    conn = get_connection(autocommit=True)
    try:
        with conn.cursor() as cur:
            yield cur
    finally:
        conn.close()

@contextmanager
def transaction_cursor() -> Generator[pymysql.cursors.DictCursor, None, None]:
    """
    ACID Transaction Context Manager:
    Ensures START TRANSACTION, atomic COMMIT on clean exit,
    and automatic ROLLBACK if any exception occurs.
    """
    conn = get_connection(autocommit=False)
    conn.begin()
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Transaction aborted & rolled back due to error: {e}")
        raise e
    finally:
        conn.close()
