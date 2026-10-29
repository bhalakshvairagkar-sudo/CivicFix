# DBMS Technical Documentation — Views, Stored Procedures, Triggers & Indexes

## 1. Overview

**CivicFix** demonstrates advanced Database Management System (DBMS) architecture by delegating business rules, referential synchronization, multi-table aggregations, and transactional state machines directly to the **MySQL InnoDB storage engine**.

---

## 2. Relational Database Views

Views encapsulate complex multi-table queries, providing simplified analytical interfaces, enforcing column-level security, and guaranteeing consistent computation of derived metrics.

### View 1: `vw_case_summary`
- **Script Location**: [`sql/02_views.sql`](file:///C:/Users/BHALAKSH%20VAIRAGKAR/.gemini/antigravity/scratch/civicFix/sql/02_views.sql)
- **API Endpoint**: `GET /api/dbms/views/case-summary`
- **Purpose**: High-performance operational view summarizing case volume partitioned by current state and engineering severity.
- **DDL Definition**:
  ```sql
  CREATE OR REPLACE VIEW vw_case_summary AS
  SELECT 
      status,
      severity,
      COUNT(*) AS total_cases
  FROM repair_cases
  GROUP BY status, severity;
  ```
- **Performance Characteristics**: Virtual view executed without materialization, ensuring real-time consistency with zero storage overhead.

### View 2: `vw_open_cases_staff`
- **Script Location**: [`sql/02_views.sql`](file:///C:/Users/BHALAKSH%20VAIRAGKAR/.gemini/antigravity/scratch/civicFix/sql/02_views.sql)
- **API Endpoint**: `GET /api/dbms/views/open-cases-staff`
- **Purpose**: Provides operational staff with a unified dispatch view joining open cases with responsible departments and lead personnel.
- **DDL Definition**:
  ```sql
  CREATE OR REPLACE VIEW vw_open_cases_staff AS
  SELECT 
      c.case_id,
      c.case_number,
      c.title,
      c.category,
      c.severity,
      c.status,
      c.priority_score,
      c.created_at,
      d.department_id,
      d.name AS department_name,
      d.contact_email AS department_email,
      u.user_id AS staff_user_id,
      u.full_name AS assigned_staff_name,
      u.email AS assigned_staff_email
  FROM repair_cases c
  JOIN departments d ON c.department_id = d.department_id
  LEFT JOIN users u ON d.department_id = u.department_id AND u.role IN ('STAFF', 'ADMIN')
  WHERE c.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED');
  ```

### View 3: `v_case_priority_metrics`
- **Script Location**: [`sql/02_views.sql`](file:///C:/Users/BHALAKSH%20VAIRAGKAR/.gemini/antigravity/scratch/civicFix/sql/02_views.sql)
- **Purpose**: Joins cases, physical infrastructure assets, departments, and linked report counts to compute age in days and total citizen upvotes for real-time dashboard ranking.

### View 4: `v_asset_health_summary`
- **Script Location**: [`sql/02_views.sql`](file:///C:/Users/BHALAKSH%20VAIRAGKAR/.gemini/antigravity/scratch/civicFix/sql/02_views.sql)
- **Purpose**: Implements **Infrastructure Memory**: Computes cumulative repair spend vs. estimated replacement cost ratio (`cumulative_spend_ratio_pct`), flagging assets that exceed municipal replacement thresholds.

### View 5: `v_department_performance`
- **Script Location**: [`sql/02_views.sql`](file:///C:/Users/BHALAKSH%20VAIRAGKAR/.gemini/antigravity/scratch/civicFix/sql/02_views.sql)
- **Purpose**: Aggregates total active work orders, budget utilization percentage, and Mean Time to Repair (MTTR in hours) for municipal accountability.

---

## 3. Stored Procedures

Stored procedures encapsulate multi-step transactional logic inside MySQL, eliminating network round-trips and enforcing ACID properties.

### Procedure 1: `sp_transition_case_status`
- **Script Location**: [`sql/03_procedures_triggers.sql`](file:///C:/Users/BHALAKSH%20VAIRAGKAR/.gemini/antigravity/scratch/civicFix/sql/03_procedures_triggers.sql)
- **API Endpoint**: `POST /api/cases/{case_id}/transition-procedure`
- **Signature**:
  ```sql
  CALL sp_transition_case_status(
      IN p_case_id INT,
      IN p_new_status VARCHAR(30),
      IN p_user_id INT,
      IN p_actor_name VARCHAR(100),
      IN p_notes TEXT,
      OUT p_success BOOLEAN,
      OUT p_message VARCHAR(255)
  );
  ```
- **State Machine Rules Enforced**:
  - `OPEN` $\to$ `ASSIGNED`, `IN_PROGRESS`, `DUPLICATE_MERGED`
  - `ASSIGNED` $\to$ `OPEN`, `IN_PROGRESS`
  - `IN_PROGRESS` $\to$ `ASSIGNED`, `REPAIR_COMPLETED`
  - `REPAIR_COMPLETED` $\to$ `IN_PROGRESS`, `VERIFIED_CLOSED`, `REOPENED`
  - `VERIFIED_CLOSED` $\to$ `REOPENED`
  - `REOPENED` $\to$ `ASSIGNED`, `IN_PROGRESS`
  - `DUPLICATE_MERGED` $\to$ Terminal state (cannot be transitioned or reopened).
- **Error Handling & Signal Propagation**:
  Uses `DECLARE EXIT HANDLER FOR SQLEXCEPTION` with `ROLLBACK; RESIGNAL;` to abort the transaction while propagating user-defined `SIGNAL SQLSTATE '45000'` with descriptive error text directly to application clients.
- **Relational Side Effects**:
  Synchronizes linked `citizen_reports` status atomically (`IN_PROGRESS` $\to$ `WORK_UNDERWAY`, `VERIFIED_CLOSED` $\to$ `RESOLVED`).

### Procedure 2: `sp_merge_duplicate_reports`
- **Script Location**: [`sql/03_procedures_triggers.sql`](file:///C:/Users/BHALAKSH%20VAIRAGKAR/.gemini/antigravity/scratch/civicFix/sql/03_procedures_triggers.sql)
- **Purpose**: Atomically merges a redundant repair case (`p_secondary_case_id`) into a primary target case (`p_target_case_id`).
- **Transactional Guarantees**:
  1. Validates existence of both cases with row-level locks.
  2. Updates all `citizen_reports` mapped to secondary case, setting `case_id = p_target_case_id` and `is_primary_case_report = FALSE`.
  3. Records `ROW_COUNT()` of moved reports.
  4. Marks secondary case as `DUPLICATE_MERGED`.
  5. Recalculates `total_linked_reports` on target case and increments `version = version + 1`.
  6. Inserts an immutable event record into `audit_logs`.
  7. Issues `COMMIT`, or automatic `ROLLBACK` on any `SQLEXCEPTION`.

---

## 4. Database Triggers

Triggers enforce data integrity and audit logging automatically at the engine level, independent of which client or application issues the mutation.

### Trigger 1: `trg_after_citizen_report_insert`
- **Timing & Event**: `AFTER INSERT ON citizen_reports FOR EACH ROW`
- **Purpose**: Automatically updates `repair_cases.total_linked_reports` to reflect the exact count of linked submissions:
  ```sql
  CREATE TRIGGER trg_after_citizen_report_insert
  AFTER INSERT ON citizen_reports
  FOR EACH ROW
  BEGIN
      UPDATE repair_cases
      SET total_linked_reports = (
          SELECT COUNT(*) FROM citizen_reports WHERE case_id = NEW.case_id
      )
      WHERE case_id = NEW.case_id;
  END;
  ```
- **Integrity Value**: Eliminates application-layer synchronization errors. Even if reports are added via raw SQL or external imports, the parent case counter remains accurate.

### Trigger 2: `trg_audit_case_critical_changes`
- **Timing & Event**: `AFTER UPDATE ON repair_cases FOR EACH ROW`
- **Purpose**: Authoritative audit logging of case status transitions into `audit_logs`.
- **Application Context Integration via Session Variables**:
  Reads MySQL session variables `@app_current_user_id` and `@app_current_user_name` set by the API connection prior to update:
  ```sql
  IF OLD.status <> NEW.status THEN
      INSERT INTO audit_logs (
          action_type, entity_type, entity_id, performed_by_user_id,
          actor_name, old_state, new_state, change_summary
      ) VALUES (
          'STATUS_CHANGE', 'REPAIR_CASE', NEW.case_id,
          @app_current_user_id,
          COALESCE(@app_current_user_name, 'DB_TRIGGER'),
          JSON_OBJECT('status', OLD.status, 'priority_score', OLD.priority_score, 'version', OLD.version),
          JSON_OBJECT('status', NEW.status, 'priority_score', NEW.priority_score, 'version', NEW.version),
          CONCAT('Case #', NEW.case_number, ' transitioned from ', OLD.status, ' to ', NEW.status)
      );
  END IF;
  ```
- **Elimination of Double-Logging**: Application endpoints set session variables rather than performing manual application-level `INSERT INTO audit_logs`, creating a single, authoritative audit pipeline.

---

## 5. Indexing Architecture & Strategy

Indexes are systematically applied based on query workload patterns, foreign key joins, and range filters:

| Table | Index Name | Index Type | Columns Indexed | Query Justification |
| :--- | :--- | :---: | :--- | :--- |
| **`repair_cases`** | `PRIMARY` | Clustered B-Tree | `case_id` | $O(1)$ Primary key row lookup |
| **`repair_cases`** | `idx_cases_case_num` | B-Tree (Unique) | `case_number` | Rapid lookup of public case numbers |
| **`repair_cases`** | `idx_cases_asset` | B-Tree | `asset_id` | Foreign key joins with `infrastructure_assets` |
| **`repair_cases`** | `idx_cases_dept_status` | Composite B-Tree | `department_id`, `status` | Optimizes dashboard filters for departmental open cases |
| **`repair_cases`** | `idx_cases_coords` | Composite B-Tree | `latitude`, `longitude` | Haversine bounding-box duplicate scans |
| **`repair_cases`** | `idx_cases_priority` | B-Tree | `priority_score DESC` | Priority queue sorting for repair dispatches |
| **`citizen_reports`** | `PRIMARY` | Clustered B-Tree | `report_id` | Surrogate primary key |
| **`citizen_reports`** | `idx_reports_tracking` | B-Tree (Unique) | `tracking_code` | Citizen tracking token resolution |
| **`citizen_reports`** | `idx_reports_case` | B-Tree | `case_id` | Foreign key joins and trigger aggregation queries |
| **`citizen_reports`** | `idx_reports_user` | B-Tree | `user_id` | Citizen profile history queries |
| **`work_orders`** | `idx_wo_case` | B-Tree | `case_id` | Foreign key joins with parent case |
| **`repair_inspections`** | `idx_insp_wo` | B-Tree (Unique) | `work_order_id` | Enforces 1:1 inspection constraint |
| **`benchmark_records`** | `idx_bm_cat_stat` | Composite B-Tree | `category`, `status` | Demonstration benchmark: $12,000 \to 398$ rows scanned |
| **`benchmark_records`** | `idx_bm_asset_code` | B-Tree | `asset_code` | Demonstration benchmark: $12,000 \to 702$ rows scanned |
