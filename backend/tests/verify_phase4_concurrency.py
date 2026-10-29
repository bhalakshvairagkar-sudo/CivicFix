import sys
import unittest
import threading
from pathlib import Path
from fastapi.testclient import TestClient
import pymysql

# Setup path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from database import get_db_cursor, transaction_cursor

class TestPhase4ReliableTransactionsAndConcurrency(unittest.TestCase):
    """
    Phase 4: Implement reliable transactions and concurrency.
    Demonstrates ACID properties: Atomicity, Consistency, Isolation, and Durability.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Login staff / admin
        res_admin = cls.client.post("/api/auth/login", json={"email": "marcus.admin@civicfix.gov", "password": "Password123!"})
        assert res_admin.status_code == 200, "Admin login failed"
        cls.admin_token = res_admin.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Login citizen
        res_cit = cls.client.post("/api/auth/login", json={"email": "alice.citizen@gmail.com", "password": "Password123!"})
        assert res_cit.status_code == 200, "Citizen login failed"
        cls.citizen_token = res_cit.json()["access_token"]
        cls.citizen_headers = {"Authorization": f"Bearer {cls.citizen_token}"}

    def test_01_atomic_commit_across_multiple_tables(self):
        """Acceptance Criteria: Both writes commit together across related tables."""
        # 1. Fetch an active case not currently in IN_PROGRESS
        with get_db_cursor() as cur:
            cur.execute("SELECT case_id, status, version FROM repair_cases WHERE status != 'IN_PROGRESS' AND status != 'DUPLICATE_MERGED' ORDER BY case_id LIMIT 1")
            initial = cur.fetchone()

        test_case_id = initial["case_id"]
        init_version = initial["version"]

        # 2. Update status to IN_PROGRESS via API (triggers repair_cases update + citizen_reports update + trigger audit)
        res = self.client.patch(
            f"/api/cases/{test_case_id}/status",
            headers=self.admin_headers,
            json={"status": "IN_PROGRESS", "notes": "Technician dispatched to site."}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["new_version"], init_version + 1)

        # 3. Verify MySQL database state reflects all writes atomically
        with get_db_cursor() as cur:
            # Case updated
            cur.execute("SELECT status, version FROM repair_cases WHERE case_id = %s", (test_case_id,))
            updated = cur.fetchone()
            self.assertEqual(updated["status"], "IN_PROGRESS")
            self.assertEqual(updated["version"], init_version + 1)

            # Linked reports updated to WORK_UNDERWAY
            cur.execute("SELECT status FROM citizen_reports WHERE case_id = %s", (test_case_id,))
            rep_statuses = [r["status"] for r in cur.fetchall()]
            if rep_statuses:
                self.assertTrue(all(s == "WORK_UNDERWAY" for s in rep_statuses))

            # Audit log inserted
            cur.execute("""
                SELECT action_type, entity_id, actor_name, change_summary
                FROM audit_logs
                WHERE entity_type = 'REPAIR_CASE' AND entity_id = %s
                ORDER BY log_id DESC LIMIT 1
            """, (test_case_id,))
            audit = cur.fetchone()
            self.assertIsNotNone(audit)
            self.assertEqual(audit["action_type"], "STATUS_CHANGE")
            self.assertIn("IN_PROGRESS", audit["change_summary"])

        print("\n[PASS] Phase 4 Test 1: Atomic multi-table commit succeeded (case, reports, audit log).")

    def test_02_transaction_rollback_on_intentional_failure(self):
        """Acceptance Criteria: An intentional failure in the second write rolls back the first."""
        case_id = 2

        with get_db_cursor() as cur:
            cur.execute("SELECT status, version FROM repair_cases WHERE case_id = %s", (case_id,))
            before = cur.fetchone()

        original_status = before["status"]
        original_version = before["version"]

        # Perform transaction where second write intentionally fails
        raised = False
        try:
            with transaction_cursor() as cur:
                # First write: update case status
                cur.execute("""
                    UPDATE repair_cases
                    SET status = 'REPAIR_COMPLETED', version = version + 1
                    WHERE case_id = %s
                """, (case_id,))

                # Intentional failure: insert into audit_logs with invalid action_type violating ENUM
                # This causes MySQL OperationalError/DataError
                cur.execute("""
                    INSERT INTO audit_logs (
                        action_type, entity_type, entity_id, actor_name, change_summary
                    ) VALUES (
                        'NON_EXISTENT_ACTION_TYPE', 'REPAIR_CASE', %s, 'Tester', 'Should fail and rollback'
                    )
                """, (case_id,))
        except Exception:
            raised = True
            # Rollback handled by transaction_cursor

        self.assertTrue(raised, "Expected database exception was not raised.")

        # Verify that the first write was completely rolled back in MySQL
        with get_db_cursor() as cur:
            cur.execute("SELECT status, version FROM repair_cases WHERE case_id = %s", (case_id,))
            after = cur.fetchone()
            self.assertEqual(after["status"], original_status, "Status should NOT have changed after rollback!")
            self.assertEqual(after["version"], original_version, "Version should NOT have incremented after rollback!")

        print("\n[PASS] Phase 4 Test 2: Intentional second-write failure triggered full transaction rollback.")

    def test_03_optimistic_concurrency_control_prevents_lost_updates(self):
        """Acceptance Criteria: Two concurrent updates cannot silently overwrite each other when version checking is required."""
        case_id = 3

        with get_db_cursor() as cur:
            cur.execute("SELECT status, version FROM repair_cases WHERE case_id = %s", (case_id,))
            case_state = cur.fetchone()

        current_ver = case_state["version"]

        # Client B updates the case successfully, advancing version to current_ver + 1
        res_b = self.client.patch(
            f"/api/cases/{case_id}/status",
            headers=self.admin_headers,
            json={"status": "IN_PROGRESS", "expected_version": current_ver, "notes": "Client B update"}
        )
        self.assertEqual(res_b.status_code, 200)
        self.assertEqual(res_b.json()["new_version"], current_ver + 1)

        # Client A tries to update using the stale version (current_ver)
        res_a = self.client.patch(
            f"/api/cases/{case_id}/status",
            headers=self.admin_headers,
            json={"status": "REOPENED", "expected_version": current_ver, "notes": "Client A stale update"}
        )
        # Should be rejected with HTTP 409 Conflict
        self.assertEqual(res_a.status_code, 409)
        self.assertIn("Conflict", res_a.json()["detail"])
        self.assertIn(str(current_ver + 1), res_a.json()["detail"])

        # Verify database still has Client B's update, not Client A's
        with get_db_cursor() as cur:
            cur.execute("SELECT status, version FROM repair_cases WHERE case_id = %s", (case_id,))
            final_case = cur.fetchone()
            self.assertEqual(final_case["status"], "IN_PROGRESS")
            self.assertEqual(final_case["version"], current_ver + 1)

        print("\n[PASS] Phase 4 Test 3: Optimistic concurrency rejected stale update with HTTP 409 Conflict.")

    def test_04_concurrent_duplicate_report_submissions_with_row_locks(self):
        """Acceptance Criteria: Duplicate report submissions do not create inconsistent records."""
        # Target Case 1 (Hospital pothole)
        target_case_id = 1
        with get_db_cursor() as cur:
            cur.execute("SELECT total_linked_reports, latitude, longitude, description FROM repair_cases WHERE case_id = %s", (target_case_id,))
            initial = cur.fetchone()

        initial_count = initial["total_linked_reports"]
        lat = float(initial["latitude"])
        lng = float(initial["longitude"])

        num_concurrent_reports = 5
        results = []

        def submit_duplicate(idx):
            client = TestClient(app)
            # High-confidence duplicate report targeting Case 1
            payload = {
                "category": "POTHOLE",
                "severity": "CRITICAL",
                "description": f"Hazardous asphalt crater directly in front of Metro General Hospital emergency ambulance entry. Dangerous #{idx}.",
                "latitude": lat,
                "longitude": lng,
                "address_text": "102 Hospital Way Entrance"
            }
            res = client.post("/api/reports", headers=self.citizen_headers, json=payload)
            results.append((res.status_code, res.json()))

        # Run concurrent threads simultaneously
        threads = [threading.Thread(target=submit_duplicate, args=(i,)) for i in range(num_concurrent_reports)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Verify all concurrent requests succeeded and linked to the same case
        for status_code, data in results:
            self.assertEqual(status_code, 201, f"Report submission failed: {data}")
            self.assertEqual(data["case_id"], target_case_id, f"Report should have linked to Case {target_case_id}, got {data['case_id']}")
            self.assertFalse(data["is_primary"], "Linked duplicate must not be primary")
            self.assertTrue(data["duplicate_linked"], "duplicate_linked flag should be True")

        # Verify that total_linked_reports in MySQL has the EXACT increment without lost updates
        with get_db_cursor() as cur:
            cur.execute("SELECT total_linked_reports FROM repair_cases WHERE case_id = %s", (target_case_id,))
            final_case = cur.fetchone()
            expected_total = initial_count + num_concurrent_reports
            self.assertEqual(
                final_case["total_linked_reports"],
                expected_total,
                f"Lost update detected! Expected {expected_total}, but found {final_case['total_linked_reports']}"
            )

        print(f"\n[PASS] Phase 4 Test 4: {num_concurrent_reports} concurrent duplicate reports safely serialized with row-level locks (total: {expected_total}).")


if __name__ == '__main__':
    unittest.main(verbosity=2)
