import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Setup path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from config import settings
from database import (
    create_db_connection,
    get_db_cursor,
    transaction_cursor,
    ping_database,
    DatabaseConnectionError
)

class TestDatabaseConnectivityAndLifecycle(unittest.TestCase):

    def test_01_incorrect_credentials_produces_explicit_error(self):
        """Acceptance Criteria: Incorrect credentials produce a clear, human-readable error."""
        with patch.object(settings, 'DB_PASSWORD', 'definitely_wrong_password_xyz_123'):
            with patch.object(settings, 'DB_PORT', 3306):
                try:
                    create_db_connection(connect_timeout=2)
                    self.fail("Expected DatabaseConnectionError was not raised")
                except DatabaseConnectionError as err:
                    self.assertIn("Access denied for user", str(err))
                    self.assertIn("Please check your DB_USER and DB_PASSWORD in backend/.env", str(err))
                    self.assertEqual(err.error_code, 1045)
                    print("\n[PASS] Test 1: Incorrect credentials produced explicit error:", str(err))

    def test_02_unreachable_server_produces_explicit_error(self):
        """Verify connecting to an invalid port produces clear diagnostic error."""
        with patch.object(settings, 'DB_PORT', 59999): # unused port
            try:
                create_db_connection(connect_timeout=1)
                self.fail("Expected DatabaseConnectionError was not raised")
            except DatabaseConnectionError as err:
                self.assertTrue("Unable to connect to MySQL server" in str(err) or "Connection Error" in str(err))
                print("\n[PASS] Test 2: Unreachable server produced explicit error:", str(err))

    def test_03_no_implicit_subprocess_spawning(self):
        """Acceptance Criteria: MySQL startup is not treated as an implicit side effect."""
        with patch('subprocess.Popen') as mock_popen, patch('subprocess.run') as mock_run:
            with patch.object(settings, 'DB_PORT', 59999):
                try:
                    create_db_connection(connect_timeout=1)
                except DatabaseConnectionError:
                    pass
            mock_popen.assert_not_called()
            mock_run.assert_not_called()
            print("\n[PASS] Test 3: No implicit daemon or subprocess was spawned on connection failure.")

    def test_04_resource_cleanup_on_success_and_exception(self):
        """Acceptance Criteria: Ensure connections close correctly after queries and exceptions."""
        # Mock conn
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        with patch('database.create_db_connection', return_value=mock_conn):
            # Normal query with get_db_cursor
            with get_db_cursor(autocommit=True) as cur:
                self.assertEqual(cur, mock_cursor)
            mock_conn.close.assert_called_once()
            mock_conn.close.reset_mock()

            # Exception during get_db_cursor
            try:
                with get_db_cursor(autocommit=True):
                    raise ValueError("Simulation query crash")
            except ValueError:
                pass
            mock_conn.close.assert_called_once()
            mock_conn.close.reset_mock()

            # Transaction commit & close on clean exit
            with transaction_cursor() as cur:
                pass
            mock_conn.commit.assert_called_once()
            mock_conn.close.assert_called_once()
            mock_conn.commit.reset_mock()
            mock_conn.close.reset_mock()

            # Transaction rollback & close on exception
            try:
                with transaction_cursor() as cur:
                    raise RuntimeError("Transaction error")
            except RuntimeError:
                pass
            mock_conn.rollback.assert_called_once()
            mock_conn.close.assert_called_once()
            print("\n[PASS] Test 4: Resource cleanup verified. conn.close() called on all paths.")

    def test_05_ping_database_reports_actual_status(self):
        """Acceptance Criteria: /api/health reports the actual database status."""
        # When DB fails
        with patch.object(settings, 'DB_PORT', 59999):
            result = ping_database()
            self.assertEqual(result['status'], 'error')
            self.assertIn('host', result)
            self.assertIn('port', result)
            self.assertIn('message', result)
            print("\n[PASS] Test 5: ping_database accurately reports failure details without crashing:", result['status'])

if __name__ == '__main__':
    unittest.main(verbosity=2)
