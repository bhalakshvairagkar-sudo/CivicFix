from fastapi import APIRouter, Query
from database import get_db_cursor
from schemas import BenchmarkRequest
from services.benchmark_engine import run_performance_benchmark

router = APIRouter(prefix="/api/dbms", tags=["DBMS Insights & Query Performance"])

@router.get("/overview")
def get_dbms_overview():
    """
    Returns live database metadata, table row counts, engine types, and storage metrics.
    """
    with get_db_cursor() as cur:
        # Table sizes and row counts in civicfix_db
        cur.execute("""
            SELECT 
                TABLE_NAME AS table_name,
                ENGINE AS engine,
                TABLE_ROWS AS estimated_rows,
                DATA_LENGTH AS data_bytes,
                INDEX_LENGTH AS index_bytes,
                ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 2) AS total_kb
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
        """)
        tables = cur.fetchall()

        # Database version and character set
        cur.execute("SELECT VERSION() AS version, @@transaction_isolation AS isolation_level, @@sql_mode AS sql_mode;")
        engine_info = cur.fetchone()

        # Count total foreign keys
        cur.execute("""
            SELECT COUNT(*) AS fk_count
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL;
        """)
        fk_count = cur.fetchone()["fk_count"]

    return {
        "engine_info": engine_info,
        "foreign_keys_count": fk_count,
        "tables": tables
    }

@router.get("/schema")
def get_schema_details():
    """
    Returns full relational schema architecture for ER diagram visualization:
    Tables, columns, primary keys, foreign keys, data types, and indexes.
    """
    with get_db_cursor() as cur:
        # Columns
        cur.execute("""
            SELECT 
                TABLE_NAME AS table_name,
                COLUMN_NAME AS column_name,
                COLUMN_TYPE AS column_type,
                IS_NULLABLE AS is_nullable,
                COLUMN_KEY AS column_key,
                COLUMN_DEFAULT AS default_value,
                EXTRA AS extra
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME, ORDINAL_POSITION;
        """)
        columns = cur.fetchall()

        # Foreign Keys
        cur.execute("""
            SELECT 
                TABLE_NAME AS table_name,
                COLUMN_NAME AS column_name,
                CONSTRAINT_NAME AS constraint_name,
                REFERENCED_TABLE_NAME AS referenced_table,
                REFERENCED_COLUMN_NAME AS referenced_column
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL;
        """)
        foreign_keys = cur.fetchall()

        # Indexes
        cur.execute("""
            SELECT 
                TABLE_NAME AS table_name,
                INDEX_NAME AS index_name,
                COLUMN_NAME AS column_name,
                NON_UNIQUE AS non_unique,
                INDEX_TYPE AS index_type
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
        """)
        indexes = cur.fetchall()

    return {
        "columns": columns,
        "foreign_keys": foreign_keys,
        "indexes": indexes
    }

@router.get("/normalization")
def get_normalization_decisions():
    """
    Detailed academic breakdown of 1NF, 2NF, and 3NF normalization proofs
    for course project evaluation.
    """
    return {
        "title": "CivicFix Relational Schema Normalization Analysis",
        "target_form": "3NF (Third Normal Form)",
        "justifications": [
            {
                "level": "1NF (First Normal Form)",
                "rules": "Atomic values, no repeating groups, unique primary key per table.",
                "application": (
                    "Every table has a designated primary key. Column values are strictly atomic "
                    "(e.g., coordinates are separated into numeric latitude and longitude rather than a composite string; "
                    "multi-report associations are stored across distinct tuples in 'citizen_reports' rather than comma-separated IDs)."
                )
            },
            {
                "level": "2NF (Second Normal Form)",
                "rules": "Must be in 1NF and have no partial dependencies (all non-key attributes fully depend on the entire candidate key).",
                "application": (
                    "All tables utilize single-attribute primary keys (INT AUTO_INCREMENT). "
                    "Consequently, partial key dependency is mathematically impossible, ensuring full functional dependency on the key."
                )
            },
            {
                "level": "3NF (Third Normal Form)",
                "rules": "Must be in 2NF and have no transitive dependencies (no non-key attribute depends on another non-key attribute: X -> Y where neither is a superkey).",
                "application": (
                    "Department metadata (e.g., annual_budget, contact_email) is isolated into 'departments' instead of being embedded in 'repair_cases' or 'work_orders'. "
                    "Physical infrastructure specifications (install_year, expected_lifespan, replacement_cost) reside strictly in 'infrastructure_assets'. "
                    "Citizen profile data resides strictly in 'users'. "
                    "This prevents update anomalies, deletion anomalies, and insertion anomalies."
                )
            }
        ],
        "relationships_summary": [
            {"from": "departments", "to": "users", "type": "1-to-Many", "purpose": "Department staff assignment (nullable for citizens)"},
            {"from": "departments", "to": "infrastructure_assets", "type": "1-to-Many", "purpose": "Department asset jurisdiction"},
            {"from": "infrastructure_assets", "to": "repair_cases", "type": "1-to-Many", "purpose": "Physical asset damage and repair lifecycle"},
            {"from": "repair_cases", "to": "citizen_reports", "type": "1-to-Many", "purpose": "Multiple citizen duplicate reports consolidated into 1 case"},
            {"from": "repair_cases", "to": "work_orders", "type": "1-to-Many", "purpose": "Repair execution orders dispatched for a case"},
            {"from": "work_orders", "to": "repair_inspections", "type": "1-to-Many", "purpose": "Quality & photographic proof verification"},
            {"from": "users", "to": "audit_logs", "type": "1-to-Many", "purpose": "Immutable accountability tracking of database mutations"}
        ]
    }

@router.post("/benchmark")
def run_benchmark(payload: BenchmarkRequest):
    """
    Executes real live query performance benchmarking in MySQL.
    Runs indexed vs unindexed query searches and returns real EXPLAIN execution plans and elapsed ms.
    """
    result = run_performance_benchmark(query_type=payload.query_type, limit=payload.limit)
    return result

# ------------------------------------------------------------------------------
# Phase 5: Advanced Demonstrable DBMS Features
# ------------------------------------------------------------------------------

@router.get("/views/case-summary")
def get_view_case_summary():
    """
    ⭐ DBMS VIEW HIGHLIGHT:
    Queries the reporting view `vw_case_summary`.
    Aggregates active records dynamically across status and severity dimensions.
    """
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM vw_case_summary ORDER BY total_cases DESC;")
        rows = cur.fetchall()
    return {"view_name": "vw_case_summary", "count": len(rows), "data": rows}

@router.get("/views/open-cases-staff")
def get_view_open_cases_staff():
    """
    ⭐ DBMS VIEW HIGHLIGHT:
    Queries the operational view `vw_open_cases_staff`.
    Joins open repair cases with department and dispatched work order team leaders.
    """
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM vw_open_cases_staff ORDER BY priority_score DESC;")
        rows = cur.fetchall()
    return {"view_name": "vw_open_cases_staff", "count": len(rows), "data": rows}

@router.get("/queries/case-aggregation")
def get_case_aggregations():
    """
    ⭐ DBMS AGGREGATE QUERY HIGHLIGHT:
    Multi-dimensional aggregate query counting cases by status, department, and severity.
    Matches underlying records accurately.
    """
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT 
                d.name AS department_name,
                c.status,
                c.severity,
                COUNT(*) AS case_count,
                ROUND(AVG(c.priority_score), 2) AS avg_priority_score,
                SUM(c.total_linked_reports) AS total_citizen_reports_represented
            FROM repair_cases c
            JOIN departments d ON c.department_id = d.department_id
            GROUP BY d.name, c.status, c.severity
            ORDER BY d.name, case_count DESC;
        """)
        rows = cur.fetchall()
    return {"query_type": "MULTI_DIMENSIONAL_GROUP_BY", "count": len(rows), "aggregates": rows}

@router.get("/queries/report-case-workorder-join")
def get_report_case_workorder_join(limit: int = 10):
    """
    ⭐ DBMS MULTI-TABLE RELATIONAL JOIN HIGHLIGHT:
    Expressive JOIN query showing a citizen report alongside its parent repair case,
    managing department, and dispatched work order execution details.
    """
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT 
                r.report_id,
                r.tracking_code,
                r.category AS report_category,
                r.severity AS report_severity,
                r.status AS report_status,
                r.address_text,
                r.created_at AS reported_at,
                c.case_id,
                c.case_number,
                c.title AS case_title,
                c.status AS case_status,
                c.priority_score,
                d.name AS department_name,
                w.work_order_id,
                w.work_order_number,
                w.assigned_team_leader,
                w.contractor_name,
                w.estimated_cost,
                w.actual_cost,
                w.cost_variance_pct,
                w.status AS work_order_status
            FROM citizen_reports r
            JOIN repair_cases c ON r.case_id = c.case_id
            JOIN departments d ON c.department_id = d.department_id
            LEFT JOIN work_orders w ON c.case_id = w.case_id
            ORDER BY r.report_id DESC
            LIMIT %s;
        """, (limit,))
        rows = cur.fetchall()
    return {"query_type": "MULTI_TABLE_JOIN", "count": len(rows), "records": rows}

@router.get("/evaluation")
def get_dbms_evaluation_concepts():
    """
    ⭐ DBMS EVALUATION CRITERIA:
    Academic and architectural explanations of core DBMS concepts:
    1. View vs. Stored Table
    2. Automated Trigger Execution Mechanics
    3. Stored Procedure vs. Application-Level Business Logic
    """
    return {
        "view_vs_stored_table": {
            "definition": "A stored table physically persists tuples in data files and index B-trees on disk; a view is a saved, named SELECT query representing a virtual table.",
            "storage_and_memory": "Tables consume disk storage and InnoDB buffer pool pages. Standard views consume zero disk storage for data (only their query definition in information_schema.VIEWS), executing dynamically upon query invocation.",
            "data_freshness": "Views always reflect the latest data modifications instantaneously without synchronization delay, eliminating stale cache inconsistencies.",
            "security_and_abstraction": "Views allow granular column- and row-level access control, exposing aggregated or sanitized projections to specific roles (e.g., exposing open cases without revealing sensitive citizen PII)."
        },
        "why_triggers_execute_automatically": {
            "definition": "Triggers are event-driven procedural database units bound to specific table DML events (BEFORE/AFTER INSERT, UPDATE, DELETE).",
            "execution_kernel": "Triggers execute within the DBMS engine's internal transaction context, immediately before or after row modifications.",
            "acid_boundary": "Because triggers execute inside the calling statement's transaction boundary, any trigger failure automatically rolls back the entire operation, guaranteeing database consistency.",
            "unbypassable_enforcement": "Triggers execute regardless of how data is mutated — whether through API endpoints, manual DB console queries, background workers, or external services — providing centralized, authoritative governance."
        },
        "stored_procedure_vs_application_logic": {
            "execution_location": "Stored procedures execute directly on the database engine tier (in-memory in MySQL), whereas application logic executes in Python/Node.js tiers.",
            "network_round_trips": "Complex multi-step transactions in application logic require multiple network round-trips (SELECT -> Python -> UPDATE -> Python -> INSERT). Stored procedures bundle these into a single database network call, drastically reducing network latency.",
            "precompilation_and_optimization": "The DBMS parses and generates an optimized query execution plan for stored procedures, whereas dynamic application queries may require runtime parsing.",
            "centralized_rule_enforcement": "Stored procedures enforce critical business state machines (e.g., sp_transition_case_status) uniformly across multiple client applications (Web, Mobile, Admin Scripts) without rewriting validation in multiple programming languages."
        }
    }

