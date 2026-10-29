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
