from fastapi import APIRouter
from database import get_db_cursor

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Reporting"])

@router.get("/overview")
def get_analytics_overview():
    """
    Calculates live municipal infrastructure intelligence metrics
    using genuine MySQL aggregate queries and database views.
    """
    with get_db_cursor() as cur:
        # 1. High-Level KPIs
        cur.execute("""
            SELECT 
                COUNT(*) AS total_cases,
                SUM(CASE WHEN status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED') THEN 1 ELSE 0 END) AS active_cases,
                SUM(CASE WHEN status = 'VERIFIED_CLOSED' THEN 1 ELSE 0 END) AS closed_cases,
                SUM(CASE WHEN is_recurring_failure = TRUE THEN 1 ELSE 0 END) AS recurring_failures_count,
                ROUND(AVG(CASE WHEN status = 'VERIFIED_CLOSED' AND closed_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, created_at, closed_at) ELSE NULL END), 1) AS avg_resolution_hours
            FROM repair_cases;
        """)
        kpi_cases = cur.fetchone()

        cur.execute("SELECT COUNT(*) AS total_citizen_reports FROM citizen_reports;")
        total_reports = cur.fetchone()["total_citizen_reports"]

        cur.execute("SELECT COALESCE(SUM(actual_cost), 0.0) AS total_spent FROM work_orders;")
        total_expenditure = float(cur.fetchone()["total_spent"])

        total_cases_count = float(kpi_cases["total_cases"] or 1)
        recurring_failures_count = float(kpi_cases["recurring_failures_count"] or 0)
        recurring_rate = round((recurring_failures_count / total_cases_count) * 100.0, 1)

        # 2. Category-wise Distribution
        cur.execute("""
            SELECT 
                category,
                COUNT(*) AS count,
                SUM(CASE WHEN status = 'VERIFIED_CLOSED' THEN 1 ELSE 0 END) AS closed_count,
                ROUND(AVG(priority_score), 1) AS avg_priority
            FROM repair_cases
            GROUP BY category
            ORDER BY count DESC;
        """)
        category_dist = cur.fetchall()

        # 3. Status Breakdown
        cur.execute("""
            SELECT status, COUNT(*) AS count
            FROM repair_cases
            GROUP BY status;
        """)
        status_dist = cur.fetchall()

        # 4. Severity Breakdown
        cur.execute("""
            SELECT severity, COUNT(*) AS count
            FROM repair_cases
            GROUP BY severity;
        """)
        severity_dist = cur.fetchall()

        # 5. Department Performance from View v_department_performance
        cur.execute("""
            SELECT 
                department_id, code, name, annual_budget, spent_budget,
                budget_utilized_pct, total_cases, active_cases, closed_cases,
                recurring_cases, avg_resolution_hours, total_work_order_expenditure
            FROM v_department_performance;
        """)
        dept_perf = cur.fetchall()

        # 6. Monthly Reporting & Resolution Trends
        cur.execute("""
            SELECT 
                DATE_FORMAT(created_at, '%b %Y') AS month_label,
                DATE_FORMAT(created_at, '%Y-%m') AS sort_key,
                COUNT(*) AS reports_lodged,
                SUM(CASE WHEN closed_at IS NOT NULL THEN 1 ELSE 0 END) AS cases_resolved
            FROM repair_cases
            GROUP BY month_label, sort_key
            ORDER BY sort_key ASC
            LIMIT 12;
        """)
        monthly_trends = cur.fetchall()

        # 7. Hotspot Assets (Top 5 assets with repeated failures)
        cur.execute("""
            SELECT 
                asset_id, asset_code, name, category, ward_number,
                total_incidents_count, recurring_failures_count,
                current_health_score, cumulative_repair_cost,
                replacement_cost_estimate, investigation_flag
            FROM infrastructure_assets
            WHERE total_incidents_count > 0
            ORDER BY recurring_failures_count DESC, current_health_score ASC
            LIMIT 5;
        """)
        hotspots = cur.fetchall()

    return {
        "kpis": {
            "total_citizen_reports": total_reports,
            "total_cases": kpi_cases["total_cases"],
            "active_cases": kpi_cases["active_cases"],
            "closed_cases": kpi_cases["closed_cases"],
            "recurring_failures_count": kpi_cases["recurring_failures_count"],
            "recurring_failure_rate_pct": recurring_rate,
            "avg_resolution_hours": kpi_cases["avg_resolution_hours"] or 0.0,
            "total_repair_expenditure": total_expenditure
        },
        "category_distribution": category_dist,
        "status_distribution": status_dist,
        "severity_distribution": severity_dist,
        "department_performance": dept_perf,
        "monthly_trends": monthly_trends,
        "hotspot_assets": hotspots
    }
