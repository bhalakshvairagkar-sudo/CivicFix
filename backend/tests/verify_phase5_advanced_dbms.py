import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient
import pymysql

# Setup path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from database import get_db_cursor, transaction_cursor

class TestPhase5AdvancedDBMSFeatures(unittest.TestCase):
    """
    Phase 5: Make advanced DBMS features demonstrable.
    Verifies Views, Stored Procedures, Triggers, Aggregation Queries, and Multi-Table Joins.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Login admin
        res_admin = cls.client.post("/api/auth/login", json={"email": "marcus.admin@civicfix.gov", "password": "Password123!"})
        assert res_admin.status_code == 200, "Admin login failed"
        cls.admin_token = res_admin.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    def test_01_views_return_correct_results_against_real_data(self):
        """Acceptance Criteria: Views return correct results against real database records."""
        # Test View 1: vw_case_summary
        res1 = self.client.get("/api/dbms/views/case-summary")
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()["data"]
        self.assertTrue(len(data1) > 0)

        # Sum of total_cases in view must match actual count in repair_cases
        view_total = sum(row["total_cases"] for row in data1)
        with get_db_cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM repair_cases")
            actual_total = cur.fetchone()["count"]
        self.assertEqual(view_total, actual_total, f"vw_case_summary sum ({view_total}) must equal actual repair_cases ({actual_total})")

        # Test View 2: vw_open_cases_staff
        res2 = self.client.get("/api/dbms/views/open-cases-staff")
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()["data"]
        self.assertTrue(len(data2) > 0)

        for row in data2:
            self.assertIn(row["status"], ["OPEN", "ASSIGNED", "IN_PROGRESS", "REOPENED"])
            self.assertIsNotNone(row["department_name"])

        print("\n[PASS] Phase 5 Test 1: Views (vw_case_summary, vw_open_cases_staff) verified against real data.")

    def test_02_stored_procedure_validates_and_rejects_invalid_transitions(self):
        """Acceptance Criteria: Stored procedure rejects invalid status transitions with SQLSTATE 45000."""
        # 1. Valid Transition via procedure: OPEN -> ASSIGNED
        # Case 1 is initially OPEN
        with get_db_cursor() as cur:
            cur.execute("SELECT status FROM repair_cases WHERE case_id = 1")
            status_before = cur.fetchone()["status"]

        if status_before == "OPEN":
            res_valid = self.client.post(
                "/api/cases/1/transition-procedure",
                headers=self.admin_headers,
                json={"status": "ASSIGNED", "notes": "Assigned via stored procedure"}
            )
            self.assertEqual(res_valid.status_code, 200)
            self.assertIn("successfully transitioned to ASSIGNED", res_valid.json()["message"])

        # 2. Invalid Transition: ASSIGNED -> VERIFIED_CLOSED (Skipping IN_PROGRESS & REPAIR_COMPLETED)
        res_invalid = self.client.post(
            "/api/cases/1/transition-procedure",
            headers=self.admin_headers,
            json={"status": "VERIFIED_CLOSED", "notes": "Illegal direct closure"}
        )
        # Should be rejected with HTTP 400 containing the procedure error message
        self.assertEqual(res_invalid.status_code, 400)
        self.assertIn("Invalid status transition", res_invalid.json()["detail"])

        # 3. Direct MySQL invocation test: Case 4 is DUPLICATE_MERGED / terminal
        # Calling procedure directly in MySQL to verify SQLSTATE 45000
        with self.assertRaises(pymysql.err.OperationalError) as ctx:
            with get_db_cursor() as cur:
                cur.execute("""
                    CALL sp_transition_case_status(
                        4, 'OPEN', 1, 'Marcus Admin', 'Trying to reopen merged case', @s, @m
                    );
                """)
        self.assertEqual(ctx.exception.args[0], 1644) # MySQL 1644: User-defined exception from SIGNAL SQLSTATE '45000'
        self.assertIn("Invalid status transition", str(ctx.exception))

        print("\n[PASS] Phase 5 Test 2: sp_transition_case_status enforced state machine; rejected illegal transitions with SQLSTATE 45000.")

    def test_03_trigger_executes_automatically_without_duplication(self):
        """Acceptance Criteria: Triggers execute when the relevant DB operation occurs without double-logging."""
        with get_db_cursor() as cur:
            cur.execute("SELECT case_id, status FROM repair_cases WHERE status NOT IN ('DUPLICATE_MERGED') LIMIT 1")
            target = cur.fetchone()
            case_id = target["case_id"]
            current_status = target["status"]

            cur.execute("SELECT COUNT(*) AS count FROM audit_logs WHERE entity_type = 'REPAIR_CASE' AND entity_id = %s", (case_id,))
            initial_audit_count = cur.fetchone()["count"]

        # Toggle to a different status so the trigger trg_audit_case_critical_changes fires
        target_status = "ASSIGNED" if current_status == "IN_PROGRESS" else "IN_PROGRESS"

        # Update case status via standard API
        res = self.client.patch(
            f"/api/cases/{case_id}/status",
            headers=self.admin_headers,
            json={"status": target_status, "notes": "Trigger test execution"}
        )
        self.assertEqual(res.status_code, 200)

        # Verify audit_logs was populated by the database trigger
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT action_type, entity_id, actor_name, old_state, new_state, change_summary
                FROM audit_logs
                WHERE entity_type = 'REPAIR_CASE' AND entity_id = %s
                ORDER BY log_id DESC LIMIT 1
            """, (case_id,))
            audit_entry = cur.fetchone()

            self.assertIsNotNone(audit_entry)
            self.assertEqual(audit_entry["action_type"], "STATUS_CHANGE")
            self.assertEqual(audit_entry["actor_name"], "Marcus Vance") # Set via @app_current_user_name

            # Verify NO double-logging: exactly 1 new record was added
            cur.execute("SELECT COUNT(*) AS count FROM audit_logs WHERE entity_type = 'REPAIR_CASE' AND entity_id = %s", (case_id,))
            final_audit_count = cur.fetchone()["count"]
            self.assertEqual(final_audit_count, initial_audit_count + 1, "There should be EXACTLY ONE audit record created (no trigger + app duplication)!")

        print("\n[PASS] Phase 5 Test 3: Database trigger executed automatically; zero duplicate audit logs.")

    def test_04_aggregations_match_underlying_records(self):
        """Acceptance Criteria: Aggregation queries match underlying records."""
        res = self.client.get("/api/dbms/queries/case-aggregation")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["count"] > 0)

        # Aggregate total must equal total rows in repair_cases
        sum_aggregated = sum(row["case_count"] for row in data["aggregates"])
        with get_db_cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM repair_cases")
            actual_total = cur.fetchone()["total"]

        self.assertEqual(sum_aggregated, actual_total)
        print(f"\n[PASS] Phase 5 Test 4: Aggregation query verified ({sum_aggregated} cases matched exactly).")

    def test_05_multi_table_relational_join(self):
        """Acceptance Criteria: Join shows a citizen report alongside its case and work order."""
        res = self.client.get("/api/dbms/queries/report-case-workorder-join?limit=5")
        self.assertEqual(res.status_code, 200)
        records = res.json()["records"]
        self.assertTrue(len(records) > 0)

        first = records[0]
        # Verify joined fields from citizen_reports, repair_cases, departments
        self.assertIn("report_id", first)
        self.assertIn("tracking_code", first)
        self.assertIn("case_number", first)
        self.assertIn("case_title", first)
        self.assertIn("department_name", first)
        # Verify work order relation
        self.assertIn("work_order_number", first)

        print(f"\n[PASS] Phase 5 Test 5: Multi-table relational JOIN successfully retrieved report-case-workorder graph.")

    def test_06_evaluation_concepts_endpoint(self):
        """Verify the DBMS evaluation concepts endpoint provides complete academic explanations."""
        res = self.client.get("/api/dbms/evaluation")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("view_vs_stored_table", data)
        self.assertIn("why_triggers_execute_automatically", data)
        self.assertIn("stored_procedure_vs_application_logic", data)
        print("\n[PASS] Phase 5 Test 6: DBMS evaluation concepts verified.")


if __name__ == '__main__':
    unittest.main(verbosity=2)
