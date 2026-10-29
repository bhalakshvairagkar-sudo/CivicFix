"""
==============================================================================
CivicFix - Unified Integration & DBMS Test Runner
Runs all 4 test suites across Phases 1, 2, 3, 4, and 5:
  1. verify_db_lifecycle.py (Phase 1)
  2. verify_phase2_phase3.py (Phases 2 & 3)
  3. verify_phase4_concurrency.py (Phase 4)
  4. verify_phase5_advanced_dbms.py (Phase 5)
==============================================================================
"""

import sys
import os
import unittest
import time

# Ensure backend directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import test cases
from tests.verify_db_lifecycle import TestDatabaseConnectivityAndLifecycle
from tests.verify_phase2_phase3 import TestPhase2SchemaAndIntegrity, TestPhase3SecurityAndAuth
from tests.verify_phase4_concurrency import TestPhase4ReliableTransactionsAndConcurrency
from tests.verify_phase5_advanced_dbms import TestPhase5AdvancedDBMSFeatures

def run_all_suites():
    print("=" * 80)
    print("  CIVICFIX - COMPREHENSIVE INTEGRATION & DBMS VERIFICATION SUITE")
    print("=" * 80)
    print(f"Executing against MySQL Database Engine (Python {sys.version.split()[0]})")
    print("-" * 80)

    suites = [
        ("Phase 1: DB Connectivity & Lifecycle", [TestDatabaseConnectivityAndLifecycle]),
        ("Phase 2 & 3: Schema Integrity & Security", [TestPhase2SchemaAndIntegrity, TestPhase3SecurityAndAuth]),
        ("Phase 4: Transactions & Concurrency", [TestPhase4ReliableTransactionsAndConcurrency]),
        ("Phase 5: Demonstrable DBMS Features", [TestPhase5AdvancedDBMSFeatures]),
    ]

    total_tests = 0
    total_passed = 0
    total_failed = 0
    total_errors = 0
    results_summary = []

    start_time = time.time()

    for suite_name, test_classes in suites:
        print(f"\n>>> Running {suite_name}...")
        loader = unittest.TestLoader()
        combined_suite = unittest.TestSuite()
        for tc in test_classes:
            combined_suite.addTests(loader.loadTestsFromTestCase(tc))

        runner = unittest.TextTestRunner(verbosity=1)
        suite_res = runner.run(combined_suite)

        count = suite_res.testsRun
        fails = len(suite_res.failures)
        errs = len(suite_res.errors)
        passed = count - (fails + errs)

        total_tests += count
        total_passed += passed
        total_failed += fails
        total_errors += errs

        status = "PASSED (100%)" if (fails == 0 and errs == 0) else "FAILED"
        results_summary.append({
            "phase": suite_name,
            "total": count,
            "passed": passed,
            "failed": fails,
            "errors": errs,
            "status": status
        })

    elapsed = round(time.time() - start_time, 2)

    print("\n" + "=" * 80)
    print(f"  INTEGRATION TEST RESULTS SUMMARY ({elapsed}s elapsed)")
    print("=" * 80)
    print(f"{'Phase / Test Suite':<45} | {'Tests':<6} | {'Passed':<6} | {'Status':<10}")
    print("-" * 80)
    for r in results_summary:
        print(f"{r['phase']:<45} | {r['total']:<6} | {r['passed']:<6} | {r['status']:<10}")
    print("-" * 80)
    print(f"{'TOTAL':<45} | {total_tests:<6} | {total_passed:<6} | {'ALL PASSED' if total_failed + total_errors == 0 else 'FAILURES'}")
    print("=" * 80)

    if total_failed + total_errors > 0:
        print(f"\n[ERROR] {total_failed} tests failed, {total_errors} errors occurred.")
        sys.exit(1)
    else:
        print(f"\n[SUCCESS] All {total_passed} tests passed successfully with zero failures!")
        sys.exit(0)

if __name__ == "__main__":
    run_all_suites()
