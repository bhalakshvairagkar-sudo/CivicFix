# Entity-Relationship (ER) Diagram & Structural Analysis

## 1. System Overview

**CivicFix** is an enterprise-grade municipal infrastructure monitoring and repair intelligence system. The database is designed according to relational database design principles and modeled to represent real-world civic entities, physical infrastructure assets, citizen submissions, work order dispatches, quality inspections, and immutable audit logs.

---

## 2. Entity Dictionary

The system consists of **10 strongly-typed entities** in Third Normal Form (3NF):

| Entity Name | Description | Key Business Function |
| :--- | :--- | :--- |
| **`departments`** | Municipal departments (e.g., Roads & Bridges, Water Supply) | Manages public budgets, personnel, and assigned physical assets |
| **`users`** | Actors within the system (CITIZEN, STAFF, ADMIN) | Role-Based Access Control (RBAC), authentication, and ownership |
| **`sensitive_locations`** | Vulnerable urban coordinates (Hospitals, Schools, Transit Hubs) | Spatial safety buffers and risk score prioritization |
| **`infrastructure_assets`** | Physical infrastructure memory (Road segments, Bridges, Drains) | Asset health index, lifespan tracking, and recurrence tracking |
| **`repair_cases`** | Consolidated repair cases grouping one or more citizen reports | Core lifecycle management, risk prioritization score, state transitions |
| **`citizen_reports`** | Granular citizen problem reports with photos and tracking codes | Crowdsourced defect intake, GPS coordinates, upvotes |
| **`work_orders`** | Field execution orders dispatched to contractors or municipal crews | Cost estimations, actual costs, scheduled deadlines, work status |
| **`repair_inspections`** | Post-repair quality and verification audits | Before/after photographic audits, quality ratings, anomaly flags |
| **`audit_logs`** | Append-only immutable system event log | Historical change tracking, security auditing, JSON state diffs |
| **`benchmark_records`** | 12,000+ synthetic benchmarking dataset | Live `EXPLAIN` query optimization demonstration |

---

## 3. Mermaid Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    departments ||--o{ users : "employs"
    departments ||--|{ infrastructure_assets : "maintains"
    departments ||--o{ repair_cases : "assigned_to"
    departments ||--o{ work_orders : "manages"

    users ||--o{ citizen_reports : "submits"
    users ||--o{ repair_cases : "triages"
    users ||--o{ repair_inspections : "inspects"
    users ||--o{ audit_logs : "performs"

    infrastructure_assets ||--o{ repair_cases : "sustains_damage"
    repair_cases ||--|{ citizen_reports : "consolidates"
    repair_cases ||--o{ work_orders : "dispatched_via"
    repair_cases ||--o{ repair_inspections : "verified_by"
    repair_cases ||--o{ repair_cases : "merges_or_reopens"

    work_orders ||--o| repair_inspections : "evaluated_by"

    departments {
        int department_id PK
        string code UK
        string name
        decimal annual_budget
        decimal spent_budget
        boolean is_active
        datetime created_at
    }

    users {
        int user_id PK
        string email UK
        string password_hash
        string full_name
        enum role
        int department_id FK
        boolean is_active
        datetime created_at
    }

    sensitive_locations {
        int location_id PK
        string name
        enum type
        decimal latitude
        decimal longitude
        int buffer_meters
        int weight_score
        string address
        datetime created_at
    }

    infrastructure_assets {
        int asset_id PK
        string asset_code UK
        string name
        enum asset_type
        int department_id FK
        string ward_number
        decimal latitude
        decimal longitude
        int install_year
        int expected_lifespan_years
        decimal current_health_score
        int total_incidents_count
        int recurring_failures_count
        decimal cumulative_repair_cost
        decimal estimated_replacement_cost
        datetime created_at
    }

    repair_cases {
        int case_id PK
        string case_number UK
        string title
        enum category
        enum severity
        enum status
        decimal priority_score
        enum priority_level
        int total_linked_reports
        int asset_id FK
        int department_id FK
        int created_by_user_id FK
        int previous_case_id FK
        int version
        datetime created_at
        datetime closed_at
    }

    citizen_reports {
        int report_id PK
        string tracking_code UK
        int user_id FK
        int case_id FK
        boolean is_primary_case_report
        enum category
        enum severity
        string description
        string photo_url
        decimal latitude
        decimal longitude
        string address_text
        enum status
        int upvotes_count
        datetime created_at
    }

    work_orders {
        int work_order_id PK
        string order_number UK
        int case_id FK
        int department_id FK
        string contractor_name
        string lead_technician
        decimal estimated_cost
        decimal actual_cost
        decimal cost_variance_pct
        enum status
        datetime scheduled_start_date
        datetime estimated_completion_date
        datetime actual_completion_date
        datetime created_at
    }

    repair_inspections {
        int inspection_id PK
        int case_id FK
        int work_order_id FK "UK"
        int inspector_user_id FK
        string before_photo_url
        string after_photo_url
        tinyint quality_rating
        enum durability_assessment
        boolean passed_verification
        boolean is_suspicious
        json suspicious_flags
        datetime inspected_at
    }

    audit_logs {
        bigint log_id PK
        enum action_type
        string entity_type
        int entity_id
        int performed_by_user_id FK
        string actor_name
        json old_state
        json new_state
        text change_summary
        datetime created_at
    }

    benchmark_records {
        bigint record_id PK
        string batch_code
        string asset_code
        string category
        string status
        string severity
        decimal repair_cost
        date logged_date
        text notes
    }
```

---

## 4. Cardinality & Participation Matrix

In relational modeling, cardinality defines the numerical relationship between entities ($1:1$, $1:N$, $M:N$), while participation defines whether an entity's existence requires association with another entity (**Total / Mandatory** vs. **Partial / Optional**).

| Relationship | Cardinality | Parent Entity Participation | Child Entity Participation | Foreign Key & Constraint Implementation |
| :--- | :---: | :---: | :---: | :--- |
| `departments` $\to$ `users` | $1:N$ | Partial (Dept may have 0 users initially) | Partial (`CITIZEN` has `NULL` department; `STAFF`/`ADMIN` have FK) | `users.department_id` REFERENCES `departments.department_id` (`ON DELETE SET NULL`) |
| `departments` $\to$ `infrastructure_assets` | $1:N$ | Partial | **Total (Mandatory)**: Every asset must belong to a responsible department | `infrastructure_assets.department_id` REFERENCES `departments.department_id` (`ON DELETE RESTRICT`) |
| `departments` $\to$ `repair_cases` | $1:N$ | Partial | **Total (Mandatory)**: Every case is assigned to a department | `repair_cases.department_id` REFERENCES `departments.department_id` (`ON DELETE RESTRICT`) |
| `departments` $\to$ `work_orders` | $1:N$ | Partial | **Total (Mandatory)**: Every work order is managed by a department | `work_orders.department_id` REFERENCES `departments.department_id` (`ON DELETE RESTRICT`) |
| `users` $\to$ `citizen_reports` | $1:N$ | Partial | **Total (Mandatory)**: Every report must have an authenticated submitter | `citizen_reports.user_id` REFERENCES `users.user_id` (`ON DELETE RESTRICT`) |
| `users` $\to$ `repair_inspections` | $1:N$ | Partial | **Total (Mandatory)**: An inspector must sign off on every inspection | `repair_inspections.inspector_user_id` REFERENCES `users.user_id` (`ON DELETE RESTRICT`) |
| `users` $\to$ `audit_logs` | $1:N$ | Partial | Partial: Direct SQL or trigger events may have `performed_by_user_id = NULL` | `audit_logs.performed_by_user_id` REFERENCES `users.user_id` (`ON DELETE SET NULL`) |
| `infrastructure_assets` $\to$ `repair_cases` | $1:N$ | Partial | **Total (Mandatory)**: Every case must map to a physical asset | `repair_cases.asset_id` REFERENCES `infrastructure_assets.asset_id` (`ON DELETE RESTRICT`) |
| `repair_cases` $\to$ `citizen_reports` | $1:N$ | **Total (Mandatory)**: A case must have $\ge 1$ report | **Total (Mandatory)**: Every report belongs to a case | `citizen_reports.case_id` REFERENCES `repair_cases.case_id` (`ON DELETE RESTRICT`) |
| `repair_cases` $\to$ `work_orders` | $1:N$ | Partial (Case in `OPEN` state has 0 work orders) | **Total (Mandatory)**: Work order must target an existing case | `work_orders.case_id` REFERENCES `repair_cases.case_id` (`ON DELETE RESTRICT`) |
| `work_orders` $\to$ `repair_inspections` | $1:1$ | Partial (Inspection only exists after repair) | **Total (Mandatory)**: Inspection must evaluate a completed work order | `repair_inspections.work_order_id` REFERENCES `work_orders.work_order_id` (`ON DELETE RESTRICT`, `UNIQUE`) |
| `repair_cases` $\to$ `repair_cases` (Self) | $1:N$ | Partial (Recursive) | Partial: Tracks recurrence history or merge targets | `repair_cases.previous_case_id` REFERENCES `repair_cases.case_id` (`ON DELETE SET NULL`) |

---

## 5. Elimination of $M:N$ Relationships

Relational database theory mandates that Many-to-Many ($M:N$) relationships must be resolved into associative entities to eliminate update and deletion anomalies:

1. **Citizen Submissions $\longleftrightarrow$ Physical Assets ($M:N$ resolved):**
   - Citizens lodge reports against urban locations, while assets experience multiple incidents over their lifespan.
   - **Resolved via Associative Entity**: `repair_cases` acts as the unifying entity. Individual submissions are grouped into `citizen_reports` referencing `repair_cases`, which in turn references `infrastructure_assets`.
2. **Work Orders $\longleftrightarrow$ Inspections ($1:1$ strictly enforced):**
   - Each work order receives at most one formal post-repair inspection audit.
   - Enforced by placing a `UNIQUE` constraint on `repair_inspections.work_order_id`.
