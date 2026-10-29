# CivicFix — Intelligent Infrastructure Monitoring & Repair Intelligence System

A production-grade, advanced **Database Management System (DBMS)** course project built with **React 19**, **FastAPI (Python)**, and a fully normalized **MySQL 8.0+ / 9.0+ InnoDB** relational database engine.

[![Build Status](https://img.shields.io/badge/Build-Passing-10b981?style=for-the-badge&logo=githubactions&logoColor=white)](#-automated-verification--test-results-2626-passing)
[![Tests Passing](https://img.shields.io/badge/Tests-26%2F26%20Passing%20(100%25)-success?style=for-the-badge&logo=pytest&logoColor=white)](#-automated-verification--test-results-2626-passing)
[![DBMS](https://img.shields.io/badge/DBMS-3NF%20%2F%20BCNF%20Normalized-0284c7?style=for-the-badge&logo=databricks&logoColor=white)](#-database-architecture--normalization-3nf)
[![MySQL](https://img.shields.io/badge/MySQL-9.7%20InnoDB-00758F?style=for-the-badge&logo=mysql&logoColor=white)](#-table-dictionary-10-normalized-tables)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](#-quick-start-guide)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#-quick-start-guide)
[![Maps](https://img.shields.io/badge/Maps-Leaflet%20OSM-16a34a?style=for-the-badge&logo=openstreetmap&logoColor=white)](#-evaluation--demonstration-walkthrough)

---

## 📑 Table of Contents

1. [Course-Project Deliverables & Submission Index (`docs/`)](#-final-course-project-submission-package-docs)
2. [System Architecture & Relational Intelligence](#-system-architecture--relational-intelligence)
3. [Database Architecture & Normalization (3NF)](#-database-architecture--normalization-3nf)
4. [Table Dictionary (10 Normalized Tables)](#-table-dictionary-10-normalized-tables)
5. [Advanced DBMS Concepts Demonstrated](#-advanced-dbms-concepts-demonstrated)
   - [ACID Transactions & Guaranteed Rollbacks](#1-acid-transactions--concurrency-control)
   - [Optimistic & Pessimistic Concurrency](#2-optimistic--pessimistic-concurrency-control)
   - [Relational Views & Stored Procedures](#3-relational-views--stored-procedures)
   - [Authoritative Triggers (Zero Double-Logging)](#4-authoritative-database-triggers)
   - [Empirical Query Optimization (EXPLAIN Benchmarks)](#5-live-query-optimization-benchmarks)
6. [Automated Verification & Test Results (26/26 Passing)](#-automated-verification--test-results-2626-passing)
7. [Quick Start Guide (Windows, Linux, macOS)](#-quick-start-guide)
8. [Demo Evaluator Accounts (1-Click Sign-In)](#-demo-evaluator-accounts-1-click-login)
9. [5-Step Live Demonstration Guide](#-5-step-evaluator-live-demonstration-sequence)

---

## 📚 Final Course-Project Submission Package (`docs/`)

For evaluators, professors, and reviewers, exhaustive technical documentation and reproducible evidence are structured in the [`docs/`](docs/) directory:

| Deliverable | Document Link | Description |
| :--- | :--- | :--- |
| **ER Diagram** | [`docs/ER_DIAGRAM.md`](docs/ER_DIAGRAM.md) | Mermaid ER diagram, entity dictionary, cardinalities ($1:1, 1:N$), and participation matrix |
| **Relational Schema** | [`docs/RELATIONAL_SCHEMA.md`](docs/RELATIONAL_SCHEMA.md) | 10 normalized tables, surrogate PKs, FK rules (`RESTRICT`/`SET NULL`), 28 domain CHECK constraints |
| **Normalization Report** | [`docs/NORMALIZATION_REPORT.md`](docs/NORMALIZATION_REPORT.md) | Functional dependencies ($FDs$), mathematical proofs of 1NF, 2NF, 3NF, and BCNF |
| **DBMS Technical Specs** | [`docs/DBMS_TECHNICAL_DOCUMENTATION.md`](docs/DBMS_TECHNICAL_DOCUMENTATION.md) | Views, Stored Procedures (SQLSTATE 45000), Triggers (session variables), Indexes |
| **Setup & Run Guide** | [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) | Step-by-step reproduction instructions for Windows, Linux, and macOS |
| **Master SQL Script** | [`sql/civicfix_master_init.sql`](sql/civicfix_master_init.sql) | Single-click unified SQL initialization script for MySQL Workbench or CLI |
| **Query Optimization** | [`docs/QUERY_OPTIMIZATION_EVIDENCE.md`](docs/QUERY_OPTIMIZATION_EVIDENCE.md) | Before/after EXPLAIN query plans on 12,000 records ($96.6\%$ rows scanned reduction) |
| **Transaction Safety** | [`docs/TRANSACTION_SAFETY_DEMO.md`](docs/TRANSACTION_SAFETY_DEMO.md) | ACID proof: atomic multi-table commit vs controlled failure with automatic ROLLBACK |
| **Integration Test Suite** | [`docs/INTEGRATION_TEST_RESULTS.md`](docs/INTEGRATION_TEST_RESULTS.md) | Complete verification report: **26 / 26 automated tests passing (100%)** |
| **Live Evaluator Demo** | [`docs/LIVE_DEMO_SCRIPT.md`](docs/LIVE_DEMO_SCRIPT.md) | 5-step evaluator live demonstration sequence with CLI orchestrator |

---

## 🏛️ System Architecture & Relational Intelligence

**CivicFix** is an enterprise municipal infrastructure monitoring and repair intelligence system engineered to address real-world urban road decay, drainage damage, streetlight outages, and repeat pothole failures.

Unlike simple CRUD mockups, CivicFix features **genuine relational database intelligence**:
1. **Duplicate Report Consolidation:** Automatic grouping of citizen submissions within proximity thresholds (Haversine formula + token similarity) linked to consolidated repair cases via atomic ACID transactions.
2. **Infrastructure Memory:** Persistent physical asset records (`infrastructure_assets`) tracking engineering lifespan, material deterioration, cumulative repair spend vs. replacement thresholds, and recurring failures.
3. **Repair Failure Intelligence:** Detects when a repaired issue reappears on the same physical asset within a warranty/durability window (30–90 days).
4. **Transparent Risk-Based Prioritization:** Explainable multi-factor scoring algorithm:
   $$\text{Priority Score} = \text{Base Severity} + \text{Age Waiting Penalty} + \text{Recurrence Penalty} + \text{Sensitive Proximity} + \text{Citizen Confirmations}$$
5. **Evidence-Based Repair Verification:** Photographic proof audits (before & after photos), quality ratings, and non-accusatory flags for anomalies (closures without photos, abnormally fast resolution, cost overruns).
6. **Live Query Optimization Benchmarks:** Live MySQL `EXPLAIN` query execution comparing indexed B-Tree lookups (`type: ref`) against unindexed table scans (`type: ALL`) on 12,000+ records.

---

## 🗄️ Database Architecture & Normalization (3NF)

CivicFix is designed according to **Third Normal Form (3NF)** and **Boyce-Codd Normal Form (BCNF)** standards to eliminate data redundancy, update anomalies, and deletion anomalies.

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
|         └────────────── N [work_orders] 1 ────────── 1 [repair_inspections]                      |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
```

---

## 📋 Table Dictionary (10 Normalized Tables)

| # | Table Name | Primary Key | Foreign Key References | Purpose |
|---|------------|-------------|------------------------|---------|
| 1 | `departments` | `department_id` | — | Municipal departments (budgets, contact dispatch) |
| 2 | `users` | `user_id` | `department_id` $\to$ `departments` | RBAC authentication (CITIZEN, STAFF, ADMIN) |
| 3 | `sensitive_locations` | `location_id` | — | Schools, hospitals, transit hubs for proximity risk |
| 4 | `infrastructure_assets` | `asset_id` | `department_id` $\to$ `departments` | Persistent physical infrastructure memory & health index |
| 5 | `repair_cases` | `case_id` | `asset_id`, `department_id`, `previous_case_id` | Consolidated repair cases with calculated risk score |
| 6 | `citizen_reports` | `report_id` | `user_id`, `case_id` | Original citizen submissions with photos & tracking codes |
| 7 | `work_orders` | `work_order_id` | `case_id`, `department_id` | Repair execution dispatches, contractors, and costs |
| 8 | `repair_inspections` | `inspection_id` | `case_id`, `work_order_id`, `inspector_user_id` | Photographic verification & suspicious anomaly flags |
| 9 | `audit_logs` | `log_id` | `performed_by_user_id` | Immutable append-only transaction history & JSON diffs |
| 10 | `benchmark_records` | `record_id` | — | 12,000+ records for live B-Tree query benchmarking |

---

## ⚡ Advanced DBMS Concepts Demonstrated

### 1. ACID Transactions & Concurrency Control
All workflows modifying multiple tables execute within atomic transactions via Python's `transaction_cursor()` context manager.
- **Controlled Failure with Guaranteed Rollback**:
  ```python
  with transaction_cursor() as cur:
      cur.execute("UPDATE repair_cases SET version = 999 WHERE case_id = 3;")
      # Violates CHECK (latitude BETWEEN -90 AND 90)
      cur.execute("INSERT INTO citizen_reports (..., latitude=999.00) VALUES (...);")
  # MySQL throws Error 1264/3819 -> Automatic ROLLBACK -> Case #3 version untouched!
  ```

### 2. Optimistic & Pessimistic Concurrency Control
- **Optimistic Concurrency Control**: Modifying a case accepts an `expected_version`. If another user modified the case concurrently, the query detects `rowcount == 0` and raises `HTTP 409 Conflict`.
- **Pessimistic Row-Level Locking**: Concurrent duplicate reports targeting the same repair case serialize via `SELECT ... FOR UPDATE`, guaranteeing atomic increments of `total_linked_reports`.

### 3. Relational Views & Stored Procedures
- **Views**: `vw_case_summary` (active case distribution), `vw_open_cases_staff` (dispatch queue), `v_case_priority_metrics` (composite scoring).
- **Stored Procedure `sp_transition_case_status`**: Enforces the repair state machine inside MySQL (`OPEN` $\to$ `ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `REPAIR_COMPLETED` $\to$ `VERIFIED_CLOSED`). Throws custom `SQLSTATE '45000'` with descriptive error text on illegal transitions.

### 4. Authoritative Database Triggers
- **`trg_after_citizen_report_insert`**: Automatically synchronizes `repair_cases.total_linked_reports` on insert.
- **`trg_audit_case_critical_changes`**: Captures status transitions into `audit_logs` using session variables (`@app_current_user_name`), eliminating application-layer double logging.

### 5. Live Query Optimization Benchmarks
Execution plans (`EXPLAIN FORMAT=TRADITIONAL`) on 12,000 benchmark records:
```
Metric                       | Unindexed (Full Table Scan) | Indexed (B-Tree Composite)
-------------------------------------------------------------------------------------
Access Type (`type`)         | ALL                        | ref                     
Index Key (`key`)            | None                       | idx_bm_cat_stat         
Rows Scanned (`rows`)        | 11942                      | 398                     
Average Latency (5 runs)     | 11.31 ms                   | 5.57 ms (2.0x faster)   
Net Performance Improvement  | BASELINE                   | 96.6% reduction in rows 
```

---

## 🧪 Automated Verification & Test Results (26/26 Passing)

To execute the complete 26-test verification suite:
```powershell
python backend/tests/run_all_tests.py
```

```
================================================================================
  CIVICFIX - COMPREHENSIVE INTEGRATION & DBMS VERIFICATION SUITE
================================================================================
Phase / Test Suite                            | Tests  | Passed | Status    
--------------------------------------------------------------------------------
Phase 1: DB Connectivity & Lifecycle          | 5      | 5      | PASSED (100%)
Phase 2 & 3: Schema Integrity & Security      | 11     | 11     | PASSED (100%)
Phase 4: Transactions & Concurrency           | 4      | 4      | PASSED (100%)
Phase 5: Demonstrable DBMS Features           | 6      | 6      | PASSED (100%)
--------------------------------------------------------------------------------
TOTAL                                         | 26     | 26     | ALL PASSED
================================================================================
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (Python 3.14 verified)
- **Node.js 18+** (Node v20/v24 verified)
- **MySQL 8.0+ / 9.0+** (MySQL 9.7 verified on port 3306 or 3307)

### Windows 1-Click Launch
Double-click `START_CIVICFIX.bat` in the project root, or execute:
```powershell
python run_civicfix.py
```

### Manual Cross-Platform Launch

1. **Environment Setup**:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Update DB_PASSWORD in backend/.env with your MySQL root password
   ```

2. **Initialize Database**:
   ```bash
   python backend/scripts/init_db.py
   python backend/scripts/seed_data.py
   # Or import sql/civicfix_master_init.sql directly into MySQL
   ```

3. **Start Backend (FastAPI)**:
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

4. **Start Frontend (React 19 + Vite)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🔑 Demo Evaluator Accounts (1-Click Login)

The login screen features **1-click sign-in buttons** for all pre-seeded evaluator personas:

| Role | Name | Email | Password | Access Capabilities |
|------|------|-------|----------|---------------------|
| **ADMIN** | Marcus Vance | `marcus.admin@civicfix.gov` | `Password123!` | Full control: merge duplicate cases, approve closures, view DBMS insights & audit trail. |
| **STAFF** | Dave Rodriguez | `dave.roads@civicfix.gov` | `Password123!` | Roads & Bridges: dispatch work orders, update costs, submit before/after inspections. |
| **STAFF** | Elena Rostova | `elena.lighting@civicfix.gov` | `Password123!` | Electrical & Lighting: manage streetlight outages and electrical crews. |
| **CITIZEN** | Alice Cooper | `alice.citizen@gmail.com` | `Password123!` | Citizen: lodge defect reports, track progress by tracking code, upvote hazards. |

---

## 🎬 5-Step Evaluator Live Demonstration Sequence

Follow the automated interactive script during project evaluations:
```powershell
python backend/scripts/demo_live_showcase.py
```

1. **Step 1: Show the Schema**: Queries MySQL `information_schema` to inspect all 10 tables, 14 foreign keys with delete rules, and 28 CHECK constraints.
2. **Step 2: Create a Repair Report**: Submits a citizen defect report, verifies row insertion in `citizen_reports`, and confirms automatic increment of `total_linked_reports` via `trg_after_citizen_report_insert`.
3. **Step 3: Demonstrate Database Logic**: Queries reporting view `vw_case_summary`, invokes `sp_transition_case_status` to prove state machine rejection with custom Error 1644 (SQLSTATE 45000), and inspects authoritative audit trigger logs in `audit_logs`.
4. **Step 4: Prove Transaction Safety**: Executes a successful multi-table atomic commit, then executes a controlled failure (violating `latitude` CHECK constraint) to prove automatic `ROLLBACK` and verify zero partial state remains.
5. **Step 5: Show Optimization Evidence**: Executes live `EXPLAIN FORMAT=TRADITIONAL` comparison on 12,000 benchmark records, proving a 96.6% reduction in rows scanned.

For detailed narration points and SQL queries, see [`docs/LIVE_DEMO_SCRIPT.md`](docs/LIVE_DEMO_SCRIPT.md).

---

## 📄 License

This project is submitted as an academic Database Management System (DBMS) course project and is distributed under the **MIT License**.
