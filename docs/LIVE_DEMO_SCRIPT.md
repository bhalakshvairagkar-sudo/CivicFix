# Live Evaluator Demonstration Script (5-Step Sequence)

This guide provides a structured, step-by-step walkthrough for demonstrating **CivicFix** to your course professor or evaluator. It follows the exact 5-step live demonstration sequence designed to showcase the full depth of your relational database implementation.

---

## 💡 Quick Launch Options for the Demonstration

You can present this demonstration either via the **Automated Showcase CLI** or through the **Web Application & MySQL Workbench**:

- **Automated CLI Showcase**:
  ```powershell
  python backend/scripts/demo_live_showcase.py
  ```
  *(Press Enter after each step to advance smoothly while narrating).*
- **Web Interface**: `http://localhost:5173` (with backend on `http://127.0.0.1:8000`).

---

## Step 1: Show the Schema

### What to Explain:
> *"Our project is built upon a fully normalized, Third Normal Form (3NF) relational schema implemented in MySQL InnoDB. It features 10 core tables with surrogate integer primary keys, strict foreign key referential integrity rules (`ON DELETE RESTRICT` and `SET NULL`), and 28 database-level domain CHECK constraints."*

### What to Show in MySQL Workbench or Terminal:
1. **Show Tables & Row Counts**:
   ```sql
   SELECT TABLE_NAME, TABLE_ROWS, ENGINE 
   FROM information_schema.TABLES 
   WHERE TABLE_SCHEMA = 'civicfix_db' AND TABLE_TYPE = 'BASE TABLE';
   ```
   *Point out the 10 normalized tables.*

2. **Show Foreign Key Constraints**:
   ```sql
   SELECT k.TABLE_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, rc.DELETE_RULE
   FROM information_schema.KEY_COLUMN_USAGE k
   JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON k.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
   WHERE k.TABLE_SCHEMA = 'civicfix_db' AND k.REFERENCED_TABLE_NAME IS NOT NULL;
   ```
   *Highlight `ON DELETE RESTRICT` on operational tables to prevent accidental cascading deletion.*

3. **Show Domain CHECK Constraints**:
   ```sql
   SELECT CONSTRAINT_NAME, CHECK_CLAUSE 
   FROM information_schema.CHECK_CONSTRAINTS 
   WHERE CONSTRAINT_SCHEMA = 'civicfix_db';
   ```
   *Point out `chk_report_lat` ($-90 \le \text{lat} \le 90$), `chk_case_priority_score` ($0-100$), and `chk_wo_completion_date` ($completion \ge created$).*

---

## Step 2: Create a Repair Report in CivicFix

### What to Explain:
> *"Here we demonstrate the real-time intake flow: a citizen submits a defect report through the portal. The backend captures the payload, validates coordinates and data types, inserts a row into `citizen_reports`, and associates it with a consolidated `repair_case`. Notice that an automated database trigger instantly updates the case's linked report counter."*

### What to Do / Show:
1. **On Frontend (`/` or `/reports/new`)**:
   - Log in using 1-click **CITIZEN** persona (Alice Cooper).
   - Submit a new defect:
     - **Category**: `POTHOLE`
     - **Severity**: `CRITICAL`
     - **Location**: `40.71280000, -74.00600000` (Near Metro General Hospital)
     - **Description**: *"Severe asphalt collapse blocking emergency vehicle access."*
2. **Show the Resulting Database Row**:
   ```sql
   SELECT report_id, tracking_code, category, severity, status, created_at
   FROM citizen_reports
   ORDER BY report_id DESC LIMIT 1;
   ```
3. **Show the Trigger's Action on the Parent Case**:
   ```sql
   SELECT case_id, case_number, total_linked_reports, priority_score
   FROM repair_cases
   WHERE case_id = 1;
   ```
   *Show that `total_linked_reports` automatically incremented via `trg_after_citizen_report_insert` without application calculation.*

---

## Step 3: Demonstrate Database Logic (View, Stored Proc, Trigger)

### What to Explain:
> *"CivicFix delegates critical business rules directly to the database engine. We have relational views for real-time reporting, stored procedures for transactional state machines with custom SQLSTATE error signals, and authoritative database triggers that record audit trails without duplicate application logging."*

### What to Do / Show:
1. **Demonstrate Relational View (`vw_case_summary`)**:
   ```sql
   SELECT * FROM vw_case_summary ORDER BY total_cases DESC;
   ```
   *Explain that this view calculates active case distribution grouped by status and severity in real time.*

2. **Demonstrate Stored Procedure with State Machine Rule (`sp_transition_case_status`)**:
   - Explain that merged duplicate cases cannot be reopened:
   ```sql
   CALL sp_transition_case_status(4, 'OPEN', 1, 'Marcus Admin', 'Illegal reopen', @s, @m);
   ```
   *Show that MySQL rejects this call with **Error 1644 (SQLSTATE 45000)**: `"Invalid status transition: Merged duplicate cases cannot be reopened or transitioned."`*

3. **Demonstrate Authoritative Audit Trigger (`trg_audit_case_critical_changes`)**:
   ```sql
   SELECT log_id, action_type, entity_id, actor_name, old_state, new_state, change_summary, created_at
   FROM audit_logs
   WHERE entity_type = 'REPAIR_CASE'
   ORDER BY log_id DESC LIMIT 1;
   ```
   *Highlight that the trigger captured the old and new JSON state snapshots and the actor's name via MySQL session context variables (`@app_current_user_name`).*

---

## Step 4: Prove Transaction Safety (Commit vs. Rollback)

### What to Explain:
> *"Here we demonstrate the Atomicity of ACID transactions. First, we show a transaction that modifies multiple tables and commits in unison. Next, we execute a controlled failure where the second statement violates a domain CHECK constraint. We will prove that MySQL aborts the entire transaction, leaving zero partial changes in the database."*

### What to Do / Show:
1. **The Successful Multi-Table Commit**:
   - Point out that updating case status atomically updates linked citizen reports and writes an audit log in a single transaction.

2. **The Controlled Failure with Guaranteed Rollback**:
   - Query Case #3's version:
     ```sql
     SELECT version FROM repair_cases WHERE case_id = 3; -- Example: version = 7
     ```
   - Attempt a transaction where Statement 1 updates Case #3 to version 999, but Statement 2 inserts an invalid report with `latitude = 999.00`:
     ```sql
     START TRANSACTION;
     UPDATE repair_cases SET version = 999 WHERE case_id = 3;
     INSERT INTO citizen_reports (tracking_code, user_id, case_id, category, description, latitude, longitude, address_text, severity, status)
     VALUES ('FAIL-DEMO', 1, 3, 'POTHOLE', 'Trigger failure', 999.00, 0.00, 'Invalid Geo', 'LOW', 'SUBMITTED');
     -- Storage engine raises Error 1264/3819!
     ROLLBACK;
     ```
   - Query Case #3's version immediately after:
     ```sql
     SELECT version FROM repair_cases WHERE case_id = 3;
     ```
   - **The Punchline**: *The version remains 7! Statement 1 was completely rolled back by MySQL. No partial write or corrupt state remains.*

---

## Step 5: Show Query Optimization Evidence

### What to Explain:
> *"Finally, we demonstrate relational query optimization on 12,000 benchmark records. We will compare MySQL's execution plan (`EXPLAIN FORMAT=TRADITIONAL`) for an unindexed full table scan against a composite B-Tree index lookup."*

### What to Do / Show:
1. **Run the Benchmark Script**:
   ```powershell
   python backend/scripts/demo_query_optimization.py
   ```
2. **Walk Through the Side-by-Side Comparison Table**:
   - **Access Type**: Shift from `ALL` (full table scan) to `ref` (B-Tree pointer equality).
   - **Rows Scanned**: Dropped from **11,942 rows** down to **398 rows** (**96.6% reduction**).
   - **Filtered Metric**: Increased from 1.0% to 100%, proving zero CPU evaluation cycles wasted on irrelevant rows.
   - **Latency**: Cut in half (from ~11.3 ms to ~5.5 ms).
3. **Show the Composite Index DDL**:
   ```sql
   SHOW INDEX FROM benchmark_records WHERE Key_name = 'idx_bm_cat_stat';
   ```
   *Explain why a composite index on `(category, status)` matches the multi-column filter perfectly according to the Leftmost Prefix Rule.*

---

## 🎯 Summary Checklist for Presentation Day

- [x] Schema: 10 tables, surrogate PKs, FK RESTRICT, 28 CHECK constraints shown.
- [x] Report Intake: Submitted citizen report and verified immediate DB insertion and trigger response.
- [x] Database Logic: Relational view queried, stored proc state machine error (45000) triggered, trigger audit entry inspected.
- [x] Transaction Safety: Proved complete rollback after intentional constraint violation (version untouched).
- [x] Query Optimization: Demonstrated 96.6% rows scanned reduction using real MySQL `EXPLAIN`.
