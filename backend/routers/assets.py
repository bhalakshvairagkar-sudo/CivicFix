from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
import json

from database import get_db_cursor, transaction_cursor
from security import get_current_user, require_staff_or_admin
from services.cost_intelligence import detect_asset_cost_anomalies

router = APIRouter(prefix="/api/assets", tags=["Infrastructure Memory & Assets"])

@router.get("")
def list_assets(
    category: Optional[str] = None,
    ward_number: Optional[str] = None,
    flagged_only: bool = False,
    min_health: Optional[float] = None,
    max_health: Optional[float] = None
):
    """
    Retrieves infrastructure assets from view v_asset_health_summary.
    Maintains persistent memory of physical assets, health score, and repair spend.
    """
    query = """
        SELECT 
            asset_id, asset_code, asset_name, category, ward_number,
            address_landmark, latitude, longitude, install_year, asset_age_years,
            expected_lifespan_years, current_health_score, total_incidents_count,
            recurring_failures_count, cumulative_repair_cost, replacement_cost_estimate,
            repair_vs_replacement_pct, investigation_flag, investigation_reason,
            department_code, department_name, recorded_cases_count,
            avg_case_resolution_hours, last_failure_date
        FROM v_asset_health_summary
        WHERE 1=1
    """
    params = []

    if category:
        query += " AND category = %s"
        params.append(category)
    if ward_number:
        query += " AND ward_number = %s"
        params.append(ward_number)
    if flagged_only:
        query += " AND investigation_flag = TRUE"
    if min_health is not None:
        query += " AND current_health_score >= %s"
        params.append(min_health)
    if max_health is not None:
        query += " AND current_health_score <= %s"
        params.append(max_health)

    query += " ORDER BY current_health_score ASC, recurring_failures_count DESC LIMIT 150"

    with get_db_cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()

    return rows

@router.get("/cost-anomalies")
def get_asset_cost_anomalies():
    """
    Returns assets where cumulative repair expenditure warrants
    municipal investigation or capital replacement.
    """
    with get_db_cursor() as cur:
        anomalies = detect_asset_cost_anomalies(cur)
    return anomalies

@router.get("/{asset_id}")
def get_asset_detail(asset_id: int):
    """
    Retrieves complete persistent infrastructure memory for a physical asset,
    including chronological damage incidents, work orders, contractor history, and costs.
    """
    with get_db_cursor() as cur:
        # Base Asset
        cur.execute("""
            SELECT 
                a.asset_id, a.asset_code, a.name AS asset_name, a.category, a.ward_number,
                a.address_landmark, a.latitude, a.longitude, a.install_year,
                a.expected_lifespan_years, a.current_health_score, a.total_incidents_count,
                a.recurring_failures_count, a.cumulative_repair_cost, a.replacement_cost_estimate,
                a.investigation_flag, a.investigation_reason, a.created_at, a.updated_at,
                d.name AS department_name, d.code AS department_code
            FROM infrastructure_assets a
            JOIN departments d ON a.department_id = d.department_id
            WHERE a.asset_id = %s
        """, (asset_id,))
        asset = cur.fetchone()

        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found.")

        # Chronological Failure & Repair Timeline
        cur.execute("""
            SELECT 
                c.case_id, c.case_number, c.title, c.severity, c.status,
                c.priority_score, c.priority_level, c.is_recurring_failure,
                c.days_since_last_repair, c.created_at, c.closed_at,
                w.work_order_id, w.work_order_number, w.assigned_team_leader,
                w.contractor_name, w.actual_cost, w.target_completion_date
            FROM repair_cases c
            LEFT JOIN work_orders w ON c.case_id = w.case_id
            WHERE c.asset_id = %s
            ORDER BY c.created_at DESC
        """, (asset_id,))
        timeline = cur.fetchall()

    return {
        "asset": asset,
        "timeline": timeline
    }

@router.patch("/{asset_id}/investigation")
def update_investigation_flag(
    asset_id: int,
    flag: bool,
    reason: Optional[str] = None,
    current_user: dict = Depends(require_staff_or_admin)
):
    """Toggles or updates engineering investigation status on an asset."""
    with transaction_cursor() as cur:
        cur.execute("""
            UPDATE infrastructure_assets
            SET investigation_flag = %s,
                investigation_reason = %s,
                updated_at = NOW()
            WHERE asset_id = %s
        """, (flag, reason, asset_id))

        cur.execute("""
            INSERT INTO audit_logs (
                action_type, entity_type, entity_id, performed_by_user_id,
                actor_name, new_state, change_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            "SUSPICIOUS_FLAG_RAISED" if flag else "STATUS_CHANGE",
            "INFRASTRUCTURE_ASSET",
            asset_id,
            current_user["user_id"],
            current_user["full_name"],
            json.dumps({"investigation_flag": flag, "reason": reason}),
            f"Asset #{asset_id} investigation flag set to {flag}. Reason: {reason or 'N/A'}"
        ))

    return {"message": "Asset investigation status updated."}
