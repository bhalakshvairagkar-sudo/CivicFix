import os
import sys
import unittest
import pymysql
from pathlib import Path
from fastapi.testclient import TestClient

# Setup path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from config import settings
from database import get_db_cursor, transaction_cursor

class TestPhase2SchemaAndIntegrity(unittest.TestCase):
    """Phase 2: Strengthen schema and data integrity verification."""

    def test_01_coordinate_latitude_check_constraint(self):
        """CHECK (latitude BETWEEN -90 AND 90) prevents invalid coordinates (error 3819)."""
        with self.assertRaises(pymysql.err.OperationalError) as ctx:
            with get_db_cursor() as cur:
                cur.execute("""
                    INSERT INTO citizen_reports (
                        tracking_code, user_id, case_id, category, severity,
                        description, photo_url, latitude, longitude, address_text, status
                    ) VALUES (
                        'TEST-INVALID-LAT', 1, 1, 'POTHOLE', 'CRITICAL',
                        'Testing out of range latitude', 'https://example.com/p.jpg', 95.12345678, 12.34567890, 'Test St', 'SUBMITTED'
                    )
                """)
        self.assertEqual(ctx.exception.args[0], 3819)
        self.assertIn("chk_report_lat", str(ctx.exception))
        print("\n[PASS] Phase 2 Test 1: chk_report_lat rejected invalid latitude (> 90).")

    def test_02_coordinate_longitude_check_constraint(self):
        """CHECK (longitude BETWEEN -180 AND 180) prevents invalid coordinates (error 3819)."""
        with self.assertRaises(pymysql.err.OperationalError) as ctx:
            with get_db_cursor() as cur:
                cur.execute("""
                    INSERT INTO citizen_reports (
                        tracking_code, user_id, case_id, category, severity,
                        description, photo_url, latitude, longitude, address_text, status
                    ) VALUES (
                        'TEST-INVALID-LNG', 1, 1, 'POTHOLE', 'CRITICAL',
                        'Testing out of range longitude', 'https://example.com/p.jpg', 12.34567890, -195.12345678, 'Test St', 'SUBMITTED'
                    )
                """)
        self.assertEqual(ctx.exception.args[0], 3819)
        self.assertIn("chk_report_lng", str(ctx.exception))
        print("\n[PASS] Phase 2 Test 2: chk_report_lng rejected invalid longitude (<-180).")

    def test_03_work_order_completion_date_constraint(self):
        """CHECK (actual_completion_date >= created_at) prevents backdated completions prior to creation."""
        with self.assertRaises(pymysql.err.OperationalError) as ctx:
            with get_db_cursor() as cur:
                cur.execute("""
                    INSERT INTO work_orders (
                        work_order_number, case_id, department_id, assigned_team_leader,
                        estimated_cost, actual_cost, created_at, target_completion_date,
                        actual_completion_date, status
                    ) VALUES (
                        'WO-TEST-ERR', 1, 1, 'Test Lead',
                        100.00, 100.00, '2026-05-10 12:00:00', '2026-05-15 12:00:00',
                        '2026-05-01 12:00:00', 'WORK_COMPLETED'
                    )
                """)
        self.assertEqual(ctx.exception.args[0], 3819)
        self.assertIn("chk_wo_completion_date", str(ctx.exception))
        print("\n[PASS] Phase 2 Test 3: chk_wo_completion_date rejected completion before creation.")

    def test_04_foreign_key_and_restrict_deletion_behavior(self):
        """ON DELETE RESTRICT prevents deleting active users or parent entities that have children."""
        # 1. Orphan insert raises 1452
        with self.assertRaises((pymysql.err.IntegrityError, pymysql.err.OperationalError)) as ctx:
            with get_db_cursor() as cur:
                cur.execute("""
                    INSERT INTO citizen_reports (
                        tracking_code, user_id, case_id, category, severity,
                        description, photo_url, latitude, longitude, address_text, status
                    ) VALUES (
                        'TEST-ORPHAN', 999999, 1, 'POTHOLE', 'LOW',
                        'Testing orphan user_id', 'https://example.com/p.jpg', 12.0, 12.0, 'Test St', 'SUBMITTED'
                    )
                """)
        self.assertEqual(ctx.exception.args[0], 1452)

        # 2. Delete parent user with existing reports raises 1451
        with self.assertRaises((pymysql.err.IntegrityError, pymysql.err.OperationalError)) as ctx:
            with get_db_cursor() as cur:
                cur.execute("DELETE FROM users WHERE email = 'alice.citizen@gmail.com'")
        self.assertEqual(ctx.exception.args[0], 1451)
        print("\n[PASS] Phase 2 Test 4: Foreign keys and ON DELETE RESTRICT prevent orphan rows and accidental cascaded deletions.")

    def test_05_stored_generated_column_cost_variance(self):
        """work_orders.cost_variance_pct is a STORED GENERATED column that correctly calculates variance."""
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT work_order_number, estimated_cost, actual_cost, cost_variance_pct
                FROM work_orders
                WHERE work_order_number = 'WO-2026-0004'
            """)
            row = cur.fetchone()
            self.assertIsNotNone(row)
            # WO-2026-0004: estimated 4200, actual 7850 -> variance = ((7850-4200)/4200)*100 = 86.90%
            self.assertAlmostEqual(float(row['cost_variance_pct']), 86.90, places=1)
            print("\n[PASS] Phase 2 Test 5: STORED GENERATED cost_variance_pct calculated automatically by MySQL (86.90%).")


class TestPhase3SecurityAndAuth(unittest.TestCase):
    """Phase 3: Secure authentication and database access verification."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Admin login
        resp_admin = cls.client.post("/api/auth/login", json={"email": "marcus.admin@civicfix.gov", "password": "Password123!"})
        assert resp_admin.status_code == 200, f"Admin login failed: {resp_admin.text}"
        cls.admin_token = resp_admin.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Citizen login
        resp_cit = cls.client.post("/api/auth/login", json={"email": "alice.citizen@gmail.com", "password": "Password123!"})
        assert resp_cit.status_code == 200, f"Citizen login failed: {resp_cit.text}"
        cls.citizen_token = resp_cit.json()["access_token"]
        cls.citizen_headers = {"Authorization": f"Bearer {cls.citizen_token}"}

    def test_01_unauthenticated_requests_blocked(self):
        """Unauthenticated requests to protected endpoints return 401 Unauthorized."""
        endpoints = [
            ("POST", "/api/work-orders", {"case_id": 1, "department_id": 1, "assigned_team_leader": "Test", "estimated_cost": 100, "target_completion_date": "2026-12-31"}),
            ("PATCH", "/api/work-orders/1", {"status": "IN_PROGRESS"}),
            ("GET", "/api/audit-logs", None),
            ("POST", "/api/cases/1/merge-duplicate", {"secondary_case_id": 2}),
            ("POST", "/api/auth/staff", {"full_name": "Test", "email": "test@test.gov", "password": "p", "role": "STAFF"})
        ]
        for method, endpoint, body in endpoints:
            if method == "GET":
                res = self.client.get(endpoint)
            elif method == "POST":
                res = self.client.post(endpoint, json=body)
            elif method == "PATCH":
                res = self.client.patch(endpoint, json=body)
            self.assertEqual(res.status_code, 401, f"Expected 401 for {method} {endpoint}, got {res.status_code}")
        print("\n[PASS] Phase 3 Test 1: Unauthenticated requests to protected endpoints rejected with HTTP 401.")

    def test_02_rbac_prevents_citizen_from_administrative_endpoints(self):
        """CITIZEN role cannot access audit logs, staff provisioning, or duplicate merge."""
        # Citizen attempting audit logs -> 403
        res = self.client.get("/api/audit-logs", headers=self.citizen_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Access denied", res.json()["detail"])

        # Citizen attempting staff creation -> 403
        res = self.client.post("/api/auth/staff", headers=self.citizen_headers, json={
            "full_name": "Hacker Staff",
            "email": "hacker@civicfix.gov",
            "password": "Password123!",
            "role": "ADMIN"
        })
        self.assertEqual(res.status_code, 403)

        # Citizen attempting merge-duplicate -> 403
        res = self.client.post("/api/cases/1/merge-duplicate", headers=self.citizen_headers, json={"secondary_case_id": 2})
        self.assertEqual(res.status_code, 403)
        print("\n[PASS] Phase 3 Test 2: RBAC enforced; CITIZEN blocked from ADMIN endpoints with HTTP 403.")

    def test_03_admin_can_access_administrative_endpoints(self):
        """ADMIN role can successfully access audit logs."""
        res = self.client.get("/api/audit-logs", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) > 0)
        print("\n[PASS] Phase 3 Test 3: ADMIN user successfully retrieved audit logs (HTTP 200).")

    def test_04_privilege_escalation_blocked_on_public_register(self):
        """Public register endpoint forces role='CITIZEN' even if user submits role='ADMIN'."""
        import uuid
        test_email = f"attacker_{uuid.uuid4().hex[:6]}@malicious.org"
        res = self.client.post("/api/auth/register", json={
            "full_name": "Sneaky Attacker",
            "email": test_email,
            "password": "Password123!",
            "phone_number": "+1234567890",
            "role": "ADMIN" # Attacker attempts privilege escalation
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["user"]["role"], "CITIZEN", "Public registration must force role to CITIZEN!")

        # Verify directly in database
        with get_db_cursor() as cur:
            cur.execute("SELECT role FROM users WHERE email = %s", (test_email,))
            row = cur.fetchone()
            self.assertEqual(row["role"], "CITIZEN")
        print("\n[PASS] Phase 3 Test 4: Privilege escalation blocked; registration strictly coerced to CITIZEN.")

    def test_05_sql_injection_resistance_on_search_and_filters(self):
        """Parameterized SQL safely handles SQL injection payloads without syntax errors or data leak."""
        # Attempt SQL injection in search parameter
        sql_injection_payload = "'; DROP TABLE dummy_table; --"
        res = self.client.get(
            "/api/cases",
            params={"search": sql_injection_payload},
            headers=self.citizen_headers
        )
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)
        self.assertEqual(len(res.json()), 0)

        # Another injection attempt: ' OR '1'='1
        res = self.client.get(
            "/api/cases",
            params={"search": "' OR '1'='1"},
            headers=self.citizen_headers
        )
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)
        self.assertEqual(len(res.json()), 0)
        print("\n[PASS] Phase 3 Test 5: SQL injection payloads safely escaped via parameterized queries.")

    def test_06_password_hashing_and_secret_hygiene(self):
        """Passwords in users table are cryptographically hashed; .env is excluded from git."""
        with get_db_cursor() as cur:
            cur.execute("SELECT email, password_hash FROM users")
            users = cur.fetchall()
            for u in users:
                phash = u["password_hash"]
                self.assertTrue(
                    phash.startswith("$2b$") or phash.startswith("$2a$"),
                    f"Password for {u['email']} is not a valid bcrypt hash!"
                )
        print(f"\n[PASS] Phase 3 Test 6a: Verified {len(users)} user passwords are all securely bcrypt-hashed.")

        # Verify .gitignore and git tracking of .env
        env_path = backend_dir / ".env"
        self.assertTrue(env_path.exists(), "backend/.env must exist for local configuration")

        import subprocess
        # Check backend/.env is matched by gitignore
        res_ignore = subprocess.run(["git", "check-ignore", "backend/.env"], cwd=str(backend_dir.parent), capture_output=True, text=True)
        self.assertEqual(res_ignore.returncode, 0, "backend/.env must be matched by .gitignore!")

        # Check backend/.env is not tracked in git index
        res_ls = subprocess.run(["git", "ls-files", "backend/.env"], cwd=str(backend_dir.parent), capture_output=True, text=True)
        self.assertEqual(res_ls.stdout.strip(), "", "backend/.env must not be tracked in git index!")
        print("\n[PASS] Phase 3 Test 6b: Confirmed backend/.env is untracked and excluded from git submission.")


if __name__ == '__main__':
    unittest.main(verbosity=2)
