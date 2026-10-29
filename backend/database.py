import time
import logging
from contextlib import contextmanager
from typing import Generator, Optional
import pymysql
from pymysql.cursors import DictCursor
from pymysql.err import OperationalError

from config import settings

logger = logging.getLogger("civicfix.database")

class DatabaseConnectionError(Exception):
    """Raised when MySQL connection fails with clear human-readable guidance."""
    def __init__(self, message: str, original_error: Optional[Exception] = None, error_code: Optional[int] = None):
        super().__init__(message)
        self.original_error = original_error
        self.error_code = error_code

def create_db_connection(autocommit: bool = True, connect_timeout: int = 5) -> pymysql.Connection:
    """
    Creates a new direct PyMySQL connection.
    Does NOT attempt to spawn mysqld or alter external system state.
    Provides clear, human-readable error messages for common failure modes.
    """
    try:
        conn = pymysql.connect(
            host=settings.DB_HOST,
            port=int(settings.DB_PORT),
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
            charset="utf8mb4",
            cursorclass=DictCursor,
            autocommit=autocommit,
            connect_timeout=connect_timeout,
        )
        return conn
    except OperationalError as err:
        error_code = err.args[0] if err.args else None
        error_msg = err.args[1] if len(err.args) > 1 else str(err)

        if error_code == 1045:
            guidance = (
                f"[MySQL Auth Error 1045] Access denied for user '{settings.DB_USER}'@'{settings.DB_HOST}'. "
                f"Please check your DB_USER and DB_PASSWORD in backend/.env."
            )
        elif error_code == 2003:
            guidance = (
                f"[MySQL Connection Error 2003] Unable to connect to MySQL server at {settings.DB_HOST}:{settings.DB_PORT}. "
                f"Please verify that MySQL service is running on Windows (e.g. 'Start-Service MySQL97' or 'MySQL80') "
                f"and that DB_PORT={settings.DB_PORT} matches the listening port."
            )
        elif error_code == 1049:
            guidance = (
                f"[MySQL Database Error 1049] Unknown database '{settings.DB_NAME}'. "
                f"The database does not exist yet on {settings.DB_HOST}:{settings.DB_PORT}. "
                f"Run the setup script ('python backend/scripts/init_db.py') to create the schema."
            )
        else:
            guidance = (
                f"[MySQL Error {error_code}] Failed to connect to MySQL at {settings.DB_HOST}:{settings.DB_PORT} "
                f"as '{settings.DB_USER}': {error_msg}"
            )

        logger.error(guidance)
        raise DatabaseConnectionError(guidance, original_error=err, error_code=error_code) from err
    except Exception as exc:
        guidance = (
            f"[Database Connection Error] Unexpected error connecting to {settings.DB_HOST}:{settings.DB_PORT}: {exc}"
        )
        logger.error(guidance)
        raise DatabaseConnectionError(guidance, original_error=exc) from exc

# Alias for backwards compatibility with any scripts importing get_connection
get_connection = create_db_connection

@contextmanager
def get_db_cursor(autocommit: bool = True) -> Generator[DictCursor, None, None]:
    """
    Context manager for safe database cursor execution.
    Guarantees connection cleanup (conn.close) after both successful queries
    and exceptions.
    """
    conn = create_db_connection(autocommit=autocommit)
    try:
        with conn.cursor() as cursor:
            yield cursor
        if not autocommit:
            conn.commit()
    except Exception as exc:
        if not autocommit:
            try:
                conn.rollback()
            except Exception as rb_exc:
                logger.error(f"Failed to rollback transaction: {rb_exc}")
        raise exc
    finally:
        try:
            conn.close()
        except Exception as close_exc:
            logger.debug(f"Notice closing connection: {close_exc}")

@contextmanager
def transaction_cursor() -> Generator[DictCursor, None, None]:
    """
    Dedicated ACID Transaction Context Manager:
    Ensures safe transaction boundary, explicit commit on success,
    automatic rollback on error, and guaranteed connection closure in finally.
    """
    with get_db_cursor(autocommit=False) as cursor:
        yield cursor

def ping_database() -> dict:
    """Verifies MySQL connectivity, server version, and latency without throwing."""
    start_time = time.perf_counter()
    try:
        with get_db_cursor(autocommit=True) as cur:
            cur.execute("SELECT VERSION() AS version, DATABASE() AS current_db;")
            info = cur.fetchone()
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "connected",
            "host": settings.DB_HOST,
            "port": settings.DB_PORT,
            "user": settings.DB_USER,
            "database": info.get("current_db") if info else settings.DB_NAME,
            "version": info.get("version") if info else "unknown",
            "latency_ms": latency_ms
        }
    except DatabaseConnectionError as db_err:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "error",
            "host": settings.DB_HOST,
            "port": settings.DB_PORT,
            "user": settings.DB_USER,
            "database": settings.DB_NAME,
            "error_code": db_err.error_code,
            "message": str(db_err),
            "latency_ms": latency_ms
        }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "error",
            "host": settings.DB_HOST,
            "port": settings.DB_PORT,
            "user": settings.DB_USER,
            "database": settings.DB_NAME,
            "message": str(e),
            "latency_ms": latency_ms
        }

