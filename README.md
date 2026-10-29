# CivicFix — Intelligent Infrastructure Monitoring & Repair Intelligence System

A production-grade, advanced **Database Management System (DBMS)** course project built with **React 19**, **FastAPI (Python)**, and a fully normalized **MySQL 8.0+ / 9.0+ InnoDB** relational database.

![Theme](https://img.shields.io/badge/Theme-Modern%20Dark%20Graphite-10b981?style=for-the-badge)
![DBMS](https://img.shields.io/badge/DBMS-3NF%20Normalized-0284c7?style=for-the-badge)
![MySQL](https://img.shields.io/badge/MySQL-9.7%20InnoDB-00758F?style=for-the-badge&logo=mysql&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Maps](https://img.shields.io/badge/Maps-Leaflet%20OSM-16a34a?style=for-the-badge)

---

## 🏛️ System Overview

**CivicFix** is an enterprise-grade municipal infrastructure management system engineered to solve the real-world problem of decaying urban roads, damaged drainage, unlit streetlights, and repeat pothole failures. 

Unlike simple CRUD mockups, CivicFix features **genuine relational database intelligence**:
1. **Duplicate Report Consolidation:** Automatic grouping of citizen submissions within proximity thresholds (Haversine formula + token similarity) linked to consolidated repair cases via ACID transactions.
2. **Infrastructure Memory:** Persistent physical asset records (`infrastructure_assets`) tracking lifespan, material deterioration, cumulative repair spend vs. replacement thresholds, and recurring failures.
3. **Repair Failure Intelligence:** Detects when a repaired issue reappears on the same physical asset within a warranty/durability window (30–90 days).
4. **Transparent Risk-Based Prioritization:** Explainable multi-factor scoring algorithm:
   $$\text{Priority Score} = \text{Base Severity} + \text{Age Waiting Penalty} + \text{Recurrence Penalty} + \text{Sensitive Proximity} + \text{Citizen Confirmations}$$
5. **Evidence-Based Repair Verification:** Photographic proof audits (before & after photos), quality ratings, and non-accusatory flags for anomalies (closures without photos, abnormally fast resolution, cost overruns).
6. **Dedicated DBMS Insights & Live EXPLAIN Benchmarking:** Live query execution comparing indexed B-Tree lookups (`ref`) against unindexed table scans (`ALL`) on 12,000+ records.

---

## 🗄️ Database Architecture & Normalization (3NF)

CivicFix is designed according to **Third Normal Form (3NF)** standards to eliminate data redundancy, update anomalies, and deletion anomalies.

```
+--------------------------------------------------------------------------------------------------+
|                                     CIVICFIX RELATIONAL SCHEMA                                   |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|   [departments] 1 ────────── N [users] (Role-Based: CITIZEN, STAFF, ADMIN)                       |
|         │                            │                                                           |
|         │ 1                          │ 1                                                         |
|         ▼ N                          ▼ N                                                         |
|   [infrastructure_assets]      [audit_logs] (Append-only immutable event log)                    |
|         │ 1                          ▲                                                           |
|         ▼ N                          │ Recorded By                                               |
|   [repair_cases] 1 ──────────────────┴──────────────────────┐                                    |
|         │ 1                                                 │ 1                                  |
|         ├────────────── N [citizen_reports] (Raw Submissions)│                                   |
|         │                                                   ▼ N                                  |
|         └────────────── N [work_orders] 1 ────────── N [repair_inspections]                      |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
```

### Table Dictionary (10 Normalized Tables)

| # | Table Name | Primary Key | Foreign Key References | Purpose |
|---|------------|-------------|------------------------|---------|
| 1 | `departments` | `department_id` | — | Municipal departments (budget, contact) |
| 2 | `users` | `user_id` | `department_id` $\rightarrow$ `departments` | RBAC authentication (CITIZEN, STAFF, ADMIN) |
| 3 | `sensitive_locations` | `location_id` | — | Schools, hospitals, transit hubs for proximity risk |
| 4 | `infrastructure_assets` | `asset_id` | `department_id` $\rightarrow$ `departments` | Persistent physical infrastructure memory & health index |
| 5 | `repair_cases` | `case_id` | `asset_id`, `department_id`, `previous_case_id` | Consolidated repair cases with calculated risk score |
| 6 | `citizen_reports` | `report_id` | `user_id`, `case_id` | Original citizen submissions with photos & tracking codes |
| 7 | `work_orders` | `work_order_id` | `case_id`, `department_id` | Repair execution dispatches, contractors, and costs |
| 8 | `repair_inspections` | `inspection_id` | `case_id`, `work_order_id`, `inspector_user_id` | Photographic verification & suspicious anomaly flags |
| 9 | `audit_logs` | `log_id` | `performed_by_user_id` | Immutable append-only transaction history & JSON diffs |
| 10 | `benchmark_records` | `record_id` | — | 12,000+ records for live B-Tree query benchmarking |

---

## ⚡ DBMS Core Concepts Demonstrated

### 1. Relational Normalization (1NF $\rightarrow$ 2NF $\rightarrow$ 3NF)
- **1NF:** Atomic attributes. Coordinates are stored as distinct `DECIMAL(10,8)` numeric values. Multi-report duplicates are stored as separate tuples in `citizen_reports` rather than comma-separated lists.
- **2NF:** Single-attribute surrogate primary keys (`AUTO_INCREMENT`). No composite keys exist; partial functional dependency is mathematically impossible.
- **3NF:** No transitive functional dependencies ($X \rightarrow Y \rightarrow Z$). Department details reside strictly in `departments`, asset lifespan in `infrastructure_assets`, and citizen profiles in `users`.

### 2. ACID Transaction Handling
- **Duplicate Merge Transaction:**
  ```sql
  START TRANSACTION;
  UPDATE citizen_reports SET case_id = target_id, is_primary_case_report = FALSE WHERE case_id = secondary_id;
  UPDATE repair_cases SET status = 'DUPLICATE_MERGED' WHERE case_id = secondary_id;
  UPDATE repair_cases SET total_linked_reports = ..., version = version + 1 WHERE case_id = target_id;
  INSERT INTO audit_logs (...) VALUES (...);
  COMMIT; -- Automatic ROLLBACK on any SQLEXCEPTION
  ```
- **Concurrency Control:** Optimistic locking via `version INT NOT NULL DEFAULT 1` and `SELECT ... FOR UPDATE` row locks.

### 3. Database Views
- `v_case_priority_metrics`: Real-time composite view joining cases, assets, departments, and linked report counts.
- `v_asset_health_summary`: Calculates cumulative spend vs replacement cost and asset health score.
- `v_department_performance`: Aggregates active work orders, budget utilization %, and MTTR resolution hours.

### 4. Live Query Optimization Demonstration
- Live MySQL `EXPLAIN FORMAT=TRADITIONAL` comparison against 12,000+ benchmark rows:
  - **Unindexed Scan:** `type: ALL`, `key: NULL`, `rows: 12,000` (Full Table Scan)
  - **Indexed Scan:** `type: ref`, `key: idx_bm_cat_stat`, `rows: 1` (B-Tree traversal)

---

## 🚀 Quick Start Guide (Windows Localhost)

### Prerequisites
- **Python 3.10+** (Python 3.14 verified)
- **Node.js 18+** (Node v24 verified)
- **MySQL 8.0+ / 9.0+** (MySQL 9.7 verified on port 3307 or 3306)

### One-Click Launch
Double-click `START_CIVICFIX.bat` in the project root, or execute:
```powershell
python run_civicfix.py
```
This orchestrator will automatically:
1. Verify and launch the MySQL 9.7 engine on port 3307.
2. Initialize database schema, views, and seed data (if not already initialized).
3. Start the FastAPI backend on `http://127.0.0.1:8000`.
4. Start the React frontend on `http://localhost:5173`.
5. Open your default web browser to the dashboard.

---

## 🔑 Demo Evaluator Accounts (1-Click Login)

The login screen includes **1-click sign-in buttons** for all pre-seeded evaluator personas:

| Role | Name | Email | Password | Access Capabilities |
|------|------|-------|----------|---------------------|
| **ADMIN** | Marcus Vance | `marcus.admin@civicfix.gov` | `Password123!` | Full control: merge duplicate cases, approve closures, view DBMS insights & audit trail. |
| **STAFF** | Dave Rodriguez | `dave.roads@civicfix.gov` | `Password123!` | Roads & Bridges: dispatch work orders, update costs, submit before/after inspections. |
| **STAFF** | Elena Rostova | `elena.lighting@civicfix.gov` | `Password123!` | Electrical & Lighting: manage streetlight outages and electrical crews. |
| **CITIZEN** | Alice Cooper | `alice.citizen@gmail.com` | `Password123!` | Citizen: lodge defect reports, track progress by tracking code, upvote hazards. |

---

## 📖 Evaluation & Demonstration Walkthrough

When presenting this project to your professor or evaluator, follow this structured demo script:

1. **Executive Dashboard (`/`):**
   - Review live KPIs calculated from MySQL (`active_cases`, `recurring_failure_rate_pct`, `avg_resolution_hours`).
   - Point out that all cards and charts query real relational data—no fake hardcoded numbers.
2. **Interactive Map Explorer (`/map`):**
   - Demonstrate the Leaflet OpenStreetMap view.
   - Show safety buffer circles (red circle around **Metro General Hospital**, amber circle around **Lincoln High School**).
   - Click Case `#CAS-2026-0001` (40cm asphalt crater directly outside the hospital emergency gate).
3. **Risk Prioritization Score Breakdown:**
   - Click the **Priority Badge (Critical 92.5)** on Case `#CAS-2026-0001`.
   - Show the transparent mathematical breakdown:
     $$\text{Score} = 40.0\text{ (Base Severity)} + 4.5\text{ (Age)} + 20.0\text{ (Recurrence)} + 25.0\text{ (110m from Hospital)} + 9.0\text{ (4 Citizen Reports)} = 98.5$$
4. **Duplicate Report Consolidation:**
   - In Case Details, show that 4 separate citizen reports (`REP-A1B2C3D`, `REP-B2C3D4E`, etc.) are linked into this single repair case while preserving each citizen's individual submission.
   - Open the **Merge Duplicates** modal to show the Haversine distance, token similarity %, and atomic database transaction.
5. **Evidence-Based Repair Verification:**
   - Inspect Case `#CAS-2026-0004` (Suspicious Case Demo).
   - Show that it is flagged with non-accusatory warnings: `MISSING_AFTER_PHOTO` and `SUBSTANDARD_QUALITY_RATING` (2/5 stars).
   - Review Case `#CAS-2026-0005` for a flagged `SIGNIFICANT_COST_OVERRUN` (actual cost exceeded estimate by 86%).
6. **Infrastructure Memory (`/assets`):**
   - Show asset `AST-ROD-0101` and `AST-DRN-0201`.
   - Point out the health score degradation (down to 38%), repeated failure count, and cumulative spend exceeding 75% of full replacement cost.
7. **⭐ DBMS Insights & Query Performance Benchmarks (`/dbms`):**
   - **ER Diagram & Schema:** Display the live table row counts and foreign keys.
   - **Normalization Tab:** Explain the 1NF $\rightarrow$ 2NF $\rightarrow$ 3NF proofs.
   - **Live Benchmark Tab:** Click **Run Live MySQL Benchmark**. Show the side-by-side comparison of **Unindexed Full Table Scan (`ALL`, 12,000 rows scanned)** vs. **B-Tree Index Scan (`ref`, 1 row scanned)** with real MySQL execution plans!
