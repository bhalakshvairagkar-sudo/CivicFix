# Relational Schema Specification & Data Dictionary

## 1. Schema Design Principles

The **CivicFix** database schema is implemented on **MySQL 8.0+ / 9.0+ InnoDB** engine (`utf8mb4_unicode_ci` character collation). The design adheres to relational database standards:
1. **Surrogate Primary Keys**: Every base relation uses an unsigned integer `AUTO_INCREMENT PRIMARY KEY` to provide immutable identity and prevent key updates.
2. **Referential Integrity Defense**: Deletion anomalies are mitigated via strict `ON DELETE RESTRICT` on mission-critical relational hierarchies, while `ON DELETE SET NULL` preserves operational records if administrative accounts are deactivated.
3. **Domain Integrity via CHECK Constraints**: Coordinates, scores, budgets, ratings, and time sequences are strictly validated at the storage engine level.
4. **Deterministic Generated Columns**: Financial cost variances are calculated deterministically by MySQL using `STORED GENERATED` columns.

---

## 2. Table-by-Table Data Dictionary

### Table 1: `departments`
*Municipal departmental registry managing municipal budgets, personnel, and infrastructure.*

| Column | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `department_id` | `INT` | No | `AUTO_INCREMENT` | `PRIMARY KEY` | Unique surrogate departmental identifier |
| `code` | `VARCHAR(30)` | No | — | `UNIQUE` | Human-readable departmental code (e.g., `ROADS`, `LIGHT`) |
| `name` | `VARCHAR(120)` | No | — | — | Department title (e.g., Roads & Bridges Department) |
| `contact_email`| `VARCHAR(120)` | No | — | — | Official departmental email |
| `contact_phone`| `VARCHAR(30)` | No | — | — | Department dispatch phone |
| `annual_budget`| `DECIMAL(14,2)`| No | `500000.00` | `CHECK (annual_budget >= 0.00)` | Annual operational budget |
| `spent_budget` | `DECIMAL(14,2)`| No | `0.00` | `CHECK (spent_budget >= 0.00)` | Year-to-date expenditure |
| `is_active` | `BOOLEAN` | No | `TRUE` | — | Soft-delete flag |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — | Record creation timestamp |

---

### Table 2: `users`
*Role-Based Access Control (RBAC) authentication table.*

| Column | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `user_id` | `INT` | No | `AUTO_INCREMENT` | `PRIMARY KEY` | Surrogate user identifier |
| `email` | `VARCHAR(120)` | No | — | `UNIQUE` | User login email address |
| `password_hash`| `VARCHAR(255)` | No | — | — | Bcrypt cryptographic password hash |
| `full_name` | `VARCHAR(100)` | No | — | — | Full legal name |
| `role` | `ENUM` | No | `'CITIZEN'` | `'CITIZEN','STAFF','ADMIN'` | Authorization level |
| `department_id`| `INT` | Yes | `NULL` | `FK -> departments.department_id` (`ON DELETE SET NULL`) | Assigned department (`NULL` for citizens) |
| `phone` | `VARCHAR(30)` | Yes | `NULL` | — | User contact phone number |
| `is_active` | `BOOLEAN` | No | `TRUE` | — | Account status flag |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — | Registration timestamp |

---

### Table 3: `sensitive_locations`
*Spatial landmarks utilized for proximity hazard risk multiplier.*

| Column | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `location_id` | `INT` | No | `AUTO_INCREMENT` | `PRIMARY KEY` | Surrogate location identifier |
| `name` | `VARCHAR(150)` | No | — | — | Landmark name (e.g. Metro General Hospital) |
| `type` | `ENUM` | No | — | `'HOSPITAL','SCHOOL','TRANSIT_HUB','FIRE_STATION','ELDER_CARE'` | Category of sensitive zone |
| `latitude` | `DECIMAL(10,8)`| No | — | `CHECK (latitude BETWEEN -90 AND 90)` | WGS-84 decimal latitude |
| `longitude` | `DECIMAL(11,8)`| No | — | `CHECK (longitude BETWEEN -180 AND 180)` | WGS-84 decimal longitude |
| `buffer_meters`| `INT` | No | `350` | `CHECK (buffer_meters > 0 AND buffer_meters <= 5000)` | Proximity risk radius |
| `weight_score` | `INT` | No | `20` | `CHECK (weight_score BETWEEN 0 AND 100)` | Additional risk penalty points |
| `address` | `VARCHAR(255)` | No | — | — | Physical street address |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — | Registration timestamp |

---

### Table 4: `infrastructure_assets`
*Persistent physical infrastructure memory tracking degradation, lifecycle, and repair spend.*

| Column | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `asset_id` | `INT` | No | `AUTO_INCREMENT` | `PRIMARY KEY` | Surrogate asset identifier |
| `asset_code` | `VARCHAR(40)` | No | — | `UNIQUE` | Physical asset tracking code (e.g., `AST-ROD-0101`) |
| `name` | `VARCHAR(150)` | No | — | — | Descriptive name |
| `asset_type` | `ENUM` | No | — | `'ROAD_SEGMENT','BRIDGE','STREETLIGHT_POLE','DRAINAGE_CHANNEL','WATER_PIPE'` | Physical asset classification |
| `department_id`| `INT` | No | — | `FK -> departments.department_id` (`ON DELETE RESTRICT`) | Responsible department |
| `ward_number` | `VARCHAR(20)` | No | — | — | Municipal administrative district |
| `latitude` | `DECIMAL(10,8)`| No | — | `CHECK (latitude BETWEEN -90 AND 90)` | Physical asset latitude |
| `longitude` | `DECIMAL(11,8)`| No | — | `CHECK (longitude BETWEEN -180 AND 180)` | Physical asset longitude |
| `install_year` | `INT` | No | — | `CHECK (install_year BETWEEN 1900 AND 2100)` | Commissioning year |
| `expected_lifespan_years`| `INT` | No | `15` | `CHECK (expected_lifespan_years BETWEEN 1 AND 100)` | Engineering lifespan |
| `current_health_score` | `DECIMAL(5,2)`| No | `100.00` | `CHECK (current_health_score BETWEEN 0.00 AND 100.00)` | Health index ($0-100\%$) |
| `total_incidents_count` | `INT` | No | `0` | `CHECK (total_incidents_count >= 0)` | Historical incident count |
| `recurring_failures_count`| `INT` | No | `0` | `CHECK (recurring_failures_count >= 0)` | Recurrences within warranty window |
| `cumulative_repair_cost` | `DECIMAL(12,2)`| No | `0.00` | `CHECK (cumulative_repair_cost >= 0.00)` | Cumulative spend on repairs |
| `estimated_replacement_cost`| `DECIMAL(12,2)`| No | — | `CHECK (estimated_replacement_cost > 0.00)`| Cost to replace entire asset |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — | Commissioning timestamp |

---

### Table 5: `repair_cases`
*Consolidated municipal repair cases grouping citizen reports.*

| Column | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `case_id` | `INT` | No | `AUTO_INCREMENT` | `PRIMARY KEY` | Surrogate case identifier |
| `case_number` | `VARCHAR(40)` | No | — | `UNIQUE` | Public case code (e.g. `CAS-2026-0001`) |
| `title` | `VARCHAR(200)` | No | — | — | Concise case headline |
| `category` | `ENUM` | No | — | `'POTHOLE','STREETLIGHT','FOOTPATH','DRAINAGE','WATER_LEAK','TRAFFIC_SIGNAL'` | Defect classification |
| `severity` | `ENUM` | No | — | `'LOW','MEDIUM','HIGH','CRITICAL'` | Base engineering severity |
| `status` | `ENUM` | No | `'OPEN'` | `'OPEN','ASSIGNED','IN_PROGRESS','REPAIR_COMPLETED','VERIFIED_CLOSED','REOPENED','DUPLICATE_MERGED'` | State machine phase |
| `priority_score` | `DECIMAL(5,2)` | No | `0.00` | `CHECK (priority_score BETWEEN 0.00 AND 100.00)` | Calculated dynamic priority score |
| `priority_level` | `ENUM` | No | `'LOW'` | `'LOW','MEDIUM','HIGH','CRITICAL'` | Categorical priority bracket |
| `priority_breakdown` | `JSON` | Yes | `NULL` | — | Transparent mathematical scoring factors |
| `total_linked_reports` | `INT` | No | `1` | `CHECK (total_linked_reports >= 1)` | Submissions consolidated in this case |
| `asset_id` | `INT` | No | — | `FK -> infrastructure_assets.asset_id` (`ON DELETE RESTRICT`) | Mapped physical asset |
| `department_id`| `INT` | No | — | `FK -> departments.department_id` (`ON DELETE RESTRICT`) | Assigned handling department |
| `created_by_user_id` | `INT` | Yes | `NULL` | `FK -> users.user_id` (`ON DELETE SET NULL`) | Triage officer |
| `previous_case_id` | `INT` | Yes | `NULL` | `FK -> repair_cases.case_id` (`ON DELETE SET NULL`) | Reference to prior recurring failure |
| `is_recurring_failure` | `BOOLEAN` | No | `FALSE` | — | Recurrence flag (within warranty) |
| `days_since_last_repair` | `INT` | Yes | `NULL` | `CHECK (days_since_last_repair >= 0)` | Time elapsed since prior closure |
| `latitude` | `DECIMAL(10,8)`| No | — | `CHECK (latitude BETWEEN -90 AND 90)` | Consolidated centroid latitude |
| `longitude` | `DECIMAL(11,8)`| No | — | `CHECK (longitude BETWEEN -180 AND 180)` | Consolidated centroid longitude |
| `description` | `TEXT` | No | — | — | Consolidated case description |
| `version` | `INT` | No | `1` | `CHECK (version >= 1)` | Optimistic concurrency version lock |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — | Case inception timestamp |
| `closed_at` | `DATETIME` | Yes | `NULL` | `CHECK (closed_at >= created_at)` | Managerial signoff timestamp |

---

### Table 6: `citizen_reports`
*Raw crowdsourced defect submissions from citizens.*

| Column | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `report_id` | `INT` | No | `AUTO_INCREMENT` | `PRIMARY KEY` | Surrogate report identifier |
| `tracking_code`| `VARCHAR(40)` | No | — | `UNIQUE` | Citizen tracking token (e.g., `REP-A1B2C3D`) |
| `user_id` | `INT` | No | — | `FK -> users.user_id` (`ON DELETE RESTRICT`) | Reporting citizen |
| `case_id` | `INT` | No | — | `FK -> repair_cases.case_id` (`ON DELETE RESTRICT`) | Consolidated case link |
| `is_primary_case_report` | `BOOLEAN` | No | `FALSE` | — | True if this report initiated the case |
| `category` | `ENUM` | No | — | `'POTHOLE','STREETLIGHT','FOOTPATH','DRAINAGE','WATER_LEAK','TRAFFIC_SIGNAL'` | Submitted defect type |
| `severity` | `ENUM` | No | — | `'LOW','MEDIUM','HIGH','CRITICAL'` | Citizen assessed severity |
| `description` | `TEXT` | No | — | — | Citizen defect narrative |
| `photo_url` | `VARCHAR(500)` | Yes | `NULL` | — | Uploaded evidence photo |
| `latitude` | `DECIMAL(10,8)`| No | — | `CHECK (latitude BETWEEN -90 AND 90)` | Exact GPS latitude |
| `longitude` | `DECIMAL(11,8)`| No | — | `CHECK (longitude BETWEEN -180 AND 180)` | Exact GPS longitude |
| `address_text` | `VARCHAR(255)` | No | — | — | Physical street description |
| `status` | `ENUM` | No | `'SUBMITTED'`| `'SUBMITTED','LINKED_TO_CASE','INVESTIGATING','WORK_UNDERWAY','RESOLVED','REJECTED'` | Citizen tracking status |
| `upvotes_count`| `INT` | No | `0` | `CHECK (upvotes_count >= 0)` | Community corroborations |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — | Submission timestamp |

---

### Table 7: `work_orders`
*Contractor and municipal crew dispatch orders.*

| Column | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `work_order_id`| `INT` | No | `AUTO_INCREMENT` | `PRIMARY KEY` | Surrogate order identifier |
| `order_number` | `VARCHAR(40)` | No | — | `UNIQUE` | Order reference code |
| `case_id` | `INT` | No | — | `FK -> repair_cases.case_id` (`ON DELETE RESTRICT`) | Target repair case |
| `department_id`| `INT` | No | — | `FK -> departments.department_id` (`ON DELETE RESTRICT`) | Managing department |
| `contractor_name`| `VARCHAR(120)` | No | — | — | Assigned repair company |
| `lead_technician`| `VARCHAR(100)` | No | — | — | Responsible site engineer |
| `estimated_cost`| `DECIMAL(10,2)`| No | — | `CHECK (estimated_cost >= 0.00)` | Approved budget estimate |
| `actual_cost` | `DECIMAL(10,2)`| Yes | `NULL` | `CHECK (actual_cost >= 0.00)` | Final invoiced cost |
| `cost_variance_pct` | `DECIMAL(6,2)` | Yes | Generated | `STORED GENERATED` | `((actual_cost - estimated_cost)/estimated_cost)*100` |
| `status` | `ENUM` | No | `'PENDING'`| `'PENDING','ASSIGNED','CREW_DISPATCHED','WORK_IN_PROGRESS','WORK_COMPLETED','CANCELLED'` | Work order state |
| `scheduled_start_date` | `DATETIME` | No | — | — | Planned execution date |
| `estimated_completion_date`| `DATETIME` | No | — | — | Contractual deadline |
| `actual_completion_date` | `DATETIME` | Yes | `NULL` | `CHECK (actual_completion_date >= created_at)` | Physical signoff date |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — | Order generation timestamp |

---

### Table 8: `repair_inspections`
*Photographic and quality assurance audit verification.*

| Column | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `inspection_id`| `INT` | No | `AUTO_INCREMENT` | `PRIMARY KEY` | Surrogate inspection ID |
| `case_id` | `INT` | No | — | `FK -> repair_cases.case_id` (`ON DELETE RESTRICT`) | Case verified |
| `work_order_id`| `INT` | No | — | `FK -> work_orders.work_order_id` (`ON DELETE RESTRICT`, `UNIQUE`) | Work order verified |
| `inspector_user_id`| `INT`| No | — | `FK -> users.user_id` (`ON DELETE RESTRICT`) | Quality inspector |
| `before_photo_url` | `VARCHAR(500)` | No | — | — | Baseline photographic evidence |
| `after_photo_url` | `VARCHAR(500)` | Yes | `NULL` | — | Completed repair evidence |
| `quality_rating` | `TINYINT` | No | `4` | `CHECK (quality_rating BETWEEN 1 AND 5)` | Workmanship rating ($1-5$) |
| `durability_assessment` | `ENUM` | No | `'GOOD'` | `'POOR','SATISFACTORY','GOOD','EXCELLENT'` | Long-term durability rating |
| `inspection_notes` | `TEXT` | No | — | — | Quality audit notes |
| `passed_verification` | `BOOLEAN` | No | `FALSE` | — | Quality sign-off flag |
| `is_suspicious` | `BOOLEAN` | No | `FALSE` | — | Automated anomaly flag |
| `suspicious_flags` | `JSON` | Yes | `NULL` | — | JSON array of detected flags |
| `inspected_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — | Audit execution timestamp |

---

### Table 9: `audit_logs`
*Immutable, append-only security and transaction audit trail.*

| Column | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `log_id` | `BIGINT` | No | `AUTO_INCREMENT` | `PRIMARY KEY` | High-cardinality surrogate ID |
| `action_type` | `ENUM` | No | — | `'REPORT_CREATED','DUPLICATE_MERGE','CASE_ASSIGNMENT','STATUS_CHANGE','WORK_ORDER_CREATED','COST_UPDATED','INSPECTION_SUBMITTED','CLOSURE_APPROVED','CASE_REOPENED','SUSPICIOUS_FLAG_RAISED'` | Classification of event |
| `entity_type` | `VARCHAR(50)` | No | — | — | Target entity (e.g. `REPAIR_CASE`) |
| `entity_id` | `INT` | No | — | — | Foreign entity primary key |
| `performed_by_user_id`| `INT` | Yes | `NULL` | `FK -> users.user_id` (`ON DELETE SET NULL`) | Actor user ID |
| `actor_name` | `VARCHAR(100)` | No | `'SYSTEM'` | — | Actor name |
| `old_state` | `JSON` | Yes | `NULL` | — | Pre-mutation JSON snapshot |
| `new_state` | `JSON` | Yes | `NULL` | — | Post-mutation JSON snapshot |
| `change_summary`| `TEXT` | No | — | — | Human-readable explanation |
| `created_at` | `DATETIME` | No | `CURRENT_TIMESTAMP` | — | Immutable timestamp |

---

### Table 10: `benchmark_records`
*High-volume synthetic benchmarking dataset for index performance testing.*

| Column | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `record_id` | `BIGINT` | No | `AUTO_INCREMENT` | `PRIMARY KEY` | Surrogate ID |
| `batch_code` | `VARCHAR(30)` | No | — | — | Batch identifier |
| `asset_code` | `VARCHAR(40)` | No | — | Indexed | Physical asset foreign reference |
| `category` | `VARCHAR(40)` | No | — | Composite Index | Defect category |
| `status` | `VARCHAR(30)` | No | — | Composite Index | Work status |
| `severity` | `VARCHAR(20)` | No | — | — | Defect severity |
| `repair_cost` | `DECIMAL(10,2)`| No | `0.00` | — | Synthetic cost |
| `logged_date` | `DATE` | No | — | — | Synthetic timestamp |
| `notes` | `TEXT` | Yes | `NULL` | — | Free-text notes |
