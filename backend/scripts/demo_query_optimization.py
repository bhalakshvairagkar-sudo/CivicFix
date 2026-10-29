"""
==============================================================================
CivicFix - Query Optimization & Indexing Benchmark Demonstrator
Demonstrates genuine MySQL query optimization using EXPLAIN plans and
execution timing on 12,000+ benchmark records.

Usage:
  python backend/scripts/demo_query_optimization.py
==============================================================================
"""

import sys
import os
import time

# Ensure backend directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import get_db_cursor

def run_query_benchmark():
    print("=" * 85)
    print("  CIVICFIX - MYSQL QUERY OPTIMIZATION & BENCHMARK DEMONSTRATOR")
    print("=" * 85)

    with get_db_cursor() as cur:
        # Check record count
        cur.execute("SELECT COUNT(*) AS total FROM benchmark_records;")
        total_rows = cur.fetchone()["total"]
        print(f"Target Benchmark Table: `benchmark_records` ({total_rows:,} total rows)")
        print("-" * 85)

        # --------------------------------------------------------------------------
        # Benchmark 1: Category & Status Filter
        # --------------------------------------------------------------------------
        print("\n[BENCHMARK 1] Multi-Column Filter: category = 'POTHOLE' AND status = 'IN_PROGRESS'")
        print("  Index Tested: Composite B-Tree Index `idx_bm_cat_stat` (category, status)")
        print("-" * 85)

        unindexed_sql = """
            SELECT record_id, batch_code, asset_code, category, status, severity, repair_cost
            FROM benchmark_records IGNORE INDEX (idx_bm_cat_stat)
            WHERE category = 'POTHOLE' AND status = 'IN_PROGRESS'
        """

        indexed_sql = """
            SELECT record_id, batch_code, asset_code, category, status, severity, repair_cost
            FROM benchmark_records FORCE INDEX (idx_bm_cat_stat)
            WHERE category = 'POTHOLE' AND status = 'IN_PROGRESS'
        """

        # 1. EXPLAIN Plans
        cur.execute(f"EXPLAIN FORMAT=TRADITIONAL {unindexed_sql}")
        unindexed_plan = cur.fetchone()

        cur.execute(f"EXPLAIN FORMAT=TRADITIONAL {indexed_sql}")
        indexed_plan = cur.fetchone()

        # 2. Measure Execution Times (Average of 5 runs)
        unindexed_times = []
        for _ in range(5):
            t0 = time.perf_counter()
            cur.execute(unindexed_sql)
            cur.fetchall()
            unindexed_times.append((time.perf_counter() - t0) * 1000.0)
        unindexed_avg = sum(unindexed_times) / len(unindexed_times)

        indexed_times = []
        for _ in range(5):
            t0 = time.perf_counter()
            cur.execute(indexed_sql)
            cur.fetchall()
            indexed_times.append((time.perf_counter() - t0) * 1000.0)
        indexed_avg = sum(indexed_times) / len(indexed_times)

        speedup = unindexed_avg / max(0.001, indexed_avg)

        # Display Comparison Table
        print(f"{'Metric':<30} | {'Unindexed (Full Table Scan)':<26} | {'Indexed (B-Tree ref)':<22}")
        print("-" * 85)
        print(f"{'Access Type (`type`)':<30} | {str(unindexed_plan.get('type')):<26} | {str(indexed_plan.get('type')):<22}")
        print(f"{'Index Key Used (`key`)':<30} | {str(unindexed_plan.get('key')):<26} | {str(indexed_plan.get('key')):<22}")
        print(f"{'Estimated Rows Scanned':<30} | {str(unindexed_plan.get('rows')):<26} | {str(indexed_plan.get('rows')):<22}")
        print(f"{'Extra Notes':<30} | {str(unindexed_plan.get('Extra')):<26} | {str(indexed_plan.get('Extra')):<22}")
        print(f"{'Average Latency (5 runs)':<30} | {unindexed_avg:.2f} ms{'':<20} | {indexed_avg:.2f} ms")
        print(f"{'Query Performance Gain':<30} | {'BASELINE':<26} | {speedup:.1f}x Faster ({((unindexed_avg - indexed_avg) / unindexed_avg)*100:.1f}% reduction)")
        print("-" * 85)

        # --------------------------------------------------------------------------
        # Benchmark 2: Asset History Lookup
        # --------------------------------------------------------------------------
        print("\n[BENCHMARK 2] Asset Code Lookup: asset_code = 'AST-ROD-0101'")
        print("  Index Tested: B-Tree Index `idx_bm_asset_code` (asset_code)")
        print("-" * 85)

        unindexed_asset_sql = """
            SELECT record_id, asset_code, repair_cost, logged_date, notes
            FROM benchmark_records IGNORE INDEX (idx_bm_asset_code)
            WHERE asset_code = 'AST-ROD-0101'
        """

        indexed_asset_sql = """
            SELECT record_id, asset_code, repair_cost, logged_date, notes
            FROM benchmark_records FORCE INDEX (idx_bm_asset_code)
            WHERE asset_code = 'AST-ROD-0101'
        """

        cur.execute(f"EXPLAIN FORMAT=TRADITIONAL {unindexed_asset_sql}")
        unindexed_plan2 = cur.fetchone()

        cur.execute(f"EXPLAIN FORMAT=TRADITIONAL {indexed_asset_sql}")
        indexed_plan2 = cur.fetchone()

        unindexed_times2 = []
        for _ in range(5):
            t0 = time.perf_counter()
            cur.execute(unindexed_asset_sql)
            cur.fetchall()
            unindexed_times2.append((time.perf_counter() - t0) * 1000.0)
        unindexed_avg2 = sum(unindexed_times2) / len(unindexed_times2)

        indexed_times2 = []
        for _ in range(5):
            t0 = time.perf_counter()
            cur.execute(indexed_asset_sql)
            cur.fetchall()
            indexed_times2.append((time.perf_counter() - t0) * 1000.0)
        indexed_avg2 = sum(indexed_times2) / len(indexed_times2)

        speedup2 = unindexed_avg2 / max(0.001, indexed_avg2)

        print(f"{'Metric':<30} | {'Unindexed (Full Table Scan)':<26} | {'Indexed (B-Tree ref)':<22}")
        print("-" * 85)
        print(f"{'Access Type (`type`)':<30} | {str(unindexed_plan2.get('type')):<26} | {str(indexed_plan2.get('type')):<22}")
        print(f"{'Index Key Used (`key`)':<30} | {str(unindexed_plan2.get('key')):<26} | {str(indexed_plan2.get('key')):<22}")
        print(f"{'Estimated Rows Scanned':<30} | {str(unindexed_plan2.get('rows')):<26} | {str(indexed_plan2.get('rows')):<22}")
        print(f"{'Average Latency (5 runs)':<30} | {unindexed_avg2:.2f} ms{'':<20} | {indexed_avg2:.2f} ms")
        print(f"{'Query Performance Gain':<30} | {'BASELINE':<26} | {speedup2:.1f}x Faster")
        print("-" * 85)

        print("\n[CONCLUSION] DBMS Optimization Proof:")
        print("  1. Unindexed scans force MySQL storage engine to read EVERY data page into buffer pool.")
        print("  2. B-Tree index traversal resolves queries via direct pointer dereferencing, reducing disk I/O by orders of magnitude.")
        print("=" * 85)

if __name__ == "__main__":
    run_query_benchmark()
