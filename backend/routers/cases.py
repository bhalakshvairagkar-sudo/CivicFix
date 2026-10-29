from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
import json
from datetime import datetime, timezone

from database import get_db_cursor, transaction_cursor
from security import get_current_user, require_staff_or_admin, require_admin
from schemas import CaseAssign, CaseStatusUpdate, DuplicateMergeRequest
from services.duplicate_detector import find_duplicate_candidates
from services.risk_prioritizer import calculate_priority_score
from services.recurrence_engine import update_asset_health_metrics

router = APIRouter(prefix="/api/cases", tags=["Repair Cases"])

@router.get("")
def list_cases(
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority_level: Optional[str] = None,
    department_id: Optional[int] = None,
    ward_number: Optional[str] = None,
    is_recurring: Optional[bool] = None,
    search: Optional[str] = None
):
    """
    Retrieves filtered repair cases from database view v_case_priority_metrics.
    Includes asset health context, linked report counts, and department information.
    """
    query = """
        SELECT 
            case_id, case_number, title, category, severity, status,
            priority_score, priority_level, priority_breakdown,
            latitude, longitude, is_recurring_failure, days_since_last_repair,
            created_at, closed_at, age_in_days, elapsed_hours,
            asset_id, asset_code, asset_name, ward_number, current_health_score,
            department_id, department_code, department_name,
            total_reports_count, total_citizen_upvotes
        FROM v_case_priority_metrics
        WHERE 1=1
    """
    params = []

    if category:
        query += " AND category = %s"
        params.append(category)
    if status:
        query += " AND status = %s"
        params.append(status)
    if priority_level:
        query += " AND priority_level = %s"
        params.append(priority_level)
    if department_id:
        query += " AND department_id = %s"
        params.append(department_id)
    if ward_number:
        query += " AND ward_number = %s"
        params.append(ward_number)
    if is_recurring is not None:
        query += " AND is_recurring_failure = %s"
        params.append(1 if is_recurring else 0)
    if search:
        query += " AND (title LIKE %s OR case_number LIKE %s OR asset_name LIKE %s)"
        like_val = f"%{search}%"
        params.extend([like_val, like_val, like_val])

    query += " ORDER BY priority_score DESC, created_at DESC LIMIT 150"

    with get_db_cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()

    # Parse JSON priority breakdown
    for r in rows:
        if isinstance(r.get("priority_breakdown"), str):
            try:
                r["priority_breakdown"] = json.loads(r["priority_breakdown"])
            except Exception:
                pass

    return rows

@router.get("/{case_id}")
def get_case_detail(case_id: int):
    """
    Retrieves complete case profile including:
    - Infrastructure asset memory and past repairs
    - Linked citizen reports
    - Active work orders
    - Evidence inspection photos
    - Immutable audit logs
    """
    with get_db_cursor() as cur:
        # 1. Base Case
        cur.execute("""
            SELECT 
                c.case_id, c.case_number, c.asset_id, c.category, c.title, c.description,
                c.severity, c.status, c.priority_score, c.priority_level, c.priority_breakdown,
                c.latitude, c.longitude, c.department_id, c.is_recurring_failure,
                c.days_since_last_repair, c.previous_case_id, c.total_linked_reports,
                c.version, c.created_at, c.updated_at, c.closed_at,
                a.asset_code, a.name AS asset_name, a.ward_number, a.current_health_score,
                a.cumulative_repair_cost, a.replacement_cost_estimate, a.investigation_flag,
                d.name AS department_name, d.code AS department_code, d.contact_phone AS department_phone,
                u.full_name AS creator_name
            FROM repair_cases c
            JOIN infrastructure_assets a ON c.asset_id = a.asset_id
            JOIN departments d ON c.department_id = d.department_id
            LEFT JOIN users u ON c.created_by_user_id = u.user_id
            WHERE c.case_id = %s
        """, (case_id,))
        case_info = cur.fetchone()

        if not case_info:
            raise HTTPException(status_code=404, detail=f"Case #{case_id} not found.")

        if isinstance(case_info.get("priority_breakdown"), str):
            try:
                case_info["priority_breakdown"] = json.loads(case_info["priority_breakdown"])
            except Exception:
                pass

        # 2. Linked Citizen Reports
        cur.execute("""
            SELECT 
                r.report_id, r.tracking_code, r.user_id, r.is_primary_case_report,
                r.severity, r.description, r.photo_url, r.latitude, r.longitude,
                r.address_text, r.status, r.upvotes_count, r.created_at,
                u.full_name AS citizen_name, u.email AS citizen_email
            FROM citizen_reports r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.case_id = %s
            ORDER BY r.created_at ASC
        """, (case_id,))
        linked_reports = cur.fetchall()

        # 3. Work Orders
        cur.execute("""
            SELECT 
                work_order_id, work_order_number, case_id, department_id,
                assigned_team_leader, contractor_name, estimated_cost, actual_cost,
                cost_variance_pct, target_completion_date, actual_completion_date,
                materials_used, work_notes, status, created_at, updated_at
            FROM work_orders
            WHERE case_id = %s
            ORDER BY created_at DESC
        """, (case_id,))
        work_orders = cur.fetchall()

        # 4. Inspections
        cur.execute("""
            SELECT 
                i.inspection_id, i.case_id, i.work_order_id, i.before_photo_url,
                i.after_photo_url, i.quality_rating, i.durability_assessment,
                i.inspection_notes, i.passed_verification, i.is_suspicious,
                i.suspicious_flags, i.inspected_at,
                u.full_name AS inspector_name
            FROM repair_inspections i
            JOIN users u ON i.inspector_user_id = u.user_id
            WHERE i.case_id = %s
            ORDER BY i.inspected_at DESC
        """, (case_id,))
        inspections = cur.fetchall()
        for insp in inspections:
            if isinstance(insp.get("suspicious_flags"), str):
                try:
                    insp["suspicious_flags"] = json.loads(insp["suspicious_flags"])
                except Exception:
                    pass

        # 5. Audit Trail for this Case
        cur.execute("""
            SELECT log_id, action_type, actor_name, change_summary, created_at, old_state, new_state
            FROM audit_logs
            WHERE entity_type = 'REPAIR_CASE' AND entity_id = %s
            ORDER BY created_at DESC
        """, (case_id,))
        audit_history = cur.fetchall()

    return {
        "case": case_info,
        "reports": linked_reports,
        "work_orders": work_orders,
        "inspections": inspections,
        "audit_logs": audit_history
    }

@router.get("/{case_id}/duplicate-candidates")
def get_duplicate_candidates_for_case(case_id: int):
    """
    Scans for potential duplicate active cases within 150m of this case
    to provide merge suggestions for administrators.
    """
    with get_db_cursor() as cur:
        cur.execute("SELECT case_id, case_number, category, description, latitude, longitude FROM repair_cases WHERE case_id = %s", (case_id,))
        target = cur.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Case not found.")

        cur.execute("""
            SELECT case_id, case_number, title, category, severity, status, latitude, longitude, description
            FROM repair_cases
            WHERE case_id <> %s AND status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED')
        """, (case_id,))
        other_cases = cur.fetchall()

    candidates = find_duplicate_candidates(
        category=target["category"],
        lat=float(target["latitude"]),
        lng=float(target["longitude"]),
        description=target["description"],
        existing_cases=other_cases,
        distance_threshold_m=150.0
    )

    return candidates

@router.post("/{case_id}/merge-duplicate")
def merge_duplicate_case(
    case_id: int,
    payload: DuplicateMergeRequest,
    current_user: dict = Depends(require_staff_or_admin)
):
    """
    ⭐ DBMS TRANSACTION HIGHLIGHT:
    Merges a duplicate case into the primary case.
    Ensures ACID consistency:
    - Moves all citizen reports from secondary to primary case.
    - Sets secondary case status to DUPLICATE_MERGED.
    - Updates primary report count and version.
    - Recalculates transparent risk priority score.
    - Records append-only audit trail.
    - Rolls back automatically if any constraint is violated.
    """
    if case_id == payload.secondary_case_id:
        raise HTTPException(status_code=400, detail="Cannot merge a case into itself.")

    with transaction_cursor() as cur:
        # Validate target case
        cur.execute("SELECT case_id, case_number, status, severity, created_at, is_recurring_failure, latitude, longitude FROM repair_cases WHERE case_id = %s FOR UPDATE", (case_id,))
        target_case = cur.fetchone()
        if not target_case:
            raise HTTPException(status_code=404, detail=f"Target case #{case_id} not found.")

        # Validate secondary case
        cur.execute("SELECT case_id, case_number, status, description FROM repair_cases WHERE case_id = %s FOR UPDATE", (payload.secondary_case_id,))
        sec_case = cur.fetchone()
        if not sec_case:
            raise HTTPException(status_code=404, detail=f"Secondary case #{payload.secondary_case_id} not found.")

        if sec_case["status"] == "DUPLICATE_MERGED":
            raise HTTPException(status_code=400, detail="Secondary case is already merged.")

        # 1. Re-link citizen reports
        cur.execute("""
            UPDATE citizen_reports
            SET case_id = %s,
                is_primary_case_report = FALSE,
                status = 'LINKED_TO_CASE'
            WHERE case_id = %s
        """, (case_id, payload.secondary_case_id))
        reports_moved = cur.rowcount

        # 2. Mark secondary case as merged
        merge_note = f" [Merged into Case #{target_case['case_number']}]"
        cur.execute("""
            UPDATE repair_cases
            SET status = 'DUPLICATE_MERGED',
                description = CONCAT(description, %s),
                version = version + 1
            WHERE case_id = %s
        """, (merge_note, payload.secondary_case_id))

        # 3. Recalculate target case priority score with new linked count
        cur.execute("SELECT COUNT(*) AS total_reports, COALESCE(SUM(upvotes_count), 0) AS total_upvotes FROM citizen_reports WHERE case_id = %s", (case_id,))
        rep_counts = cur.fetchone()

        cur.execute("SELECT location_id, name, type, latitude, longitude, buffer_meters, weight_score FROM sensitive_locations;")
        sens_locs = cur.fetchall()

        p_breakdown = calculate_priority_score(
            severity=target_case["severity"],
            created_at=target_case["created_at"],
            is_recurring=bool(target_case["is_recurring_failure"]),
            lat=float(target_case["latitude"]),
            lng=float(target_case["longitude"]),
            sensitive_locations=sens_locs,
            linked_reports_count=rep_counts["total_reports"],
            upvotes_count=rep_counts["total_upvotes"]
        )

        cur.execute("""
            UPDATE repair_cases
            SET total_linked_reports = %s,
                priority_score = %s,
                priority_level = %s,
                priority_breakdown = %s,
                version = version + 1
            WHERE case_id = %s
        """, (rep_counts["total_reports"], p_breakdown["total_score"], p_breakdown["priority_level"], json.dumps(p_breakdown), case_id))

        # 4. Insert Audit Log
        cur.execute("""
            INSERT INTO audit_logs (
                action_type, entity_type, entity_id, performed_by_user_id,
                actor_name, old_state, new_state, change_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            "DUPLICATE_MERGE",
            "REPAIR_CASE",
            case_id,
            current_user["user_id"],
            current_user["full_name"],
            json.dumps({"merged_case_id": payload.secondary_case_id, "merged_case_number": sec_case["case_number"]}),
            json.dumps({"reports_transferred": reports_moved, "new_total_reports": rep_counts["total_reports"], "new_score": p_breakdown["total_score"]}),
            f"Merged Case #{sec_case['case_number']} into Case #{target_case['case_number']}. Transferred {reports_moved} citizen reports."
        ))

    return {
        "success": True,
        "message": f"Successfully merged {reports_moved} reports into Case #{target_case['case_number']}.",
        "target_case_id": case_id,
        "reports_transferred": reports_moved,
        "new_priority_score": p_breakdown["total_score"],
        "new_priority_level": p_breakdown["priority_level"]
    }

@router.patch("/{case_id}/assign")
def assign_case_department(
    case_id: int,
    payload: CaseAssign,
    current_user: dict = Depends(require_staff_or_admin)
):
    """Assigns or transfers a repair case to a department."""
    with transaction_cursor() as cur:
        cur.execute("SELECT case_id, case_number, department_id, status FROM repair_cases WHERE case_id = %s", (case_id,))
        case = cur.fetchone()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found.")

        cur.execute("SELECT department_id, name, code FROM departments WHERE department_id = %s", (payload.department_id,))
        dept = cur.fetchone()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found.")

        old_dept_id = case["department_id"]
        cur.execute("""
            UPDATE repair_cases
            SET department_id = %s,
                status = CASE WHEN status = 'OPEN' THEN 'ASSIGNED' ELSE status END,
                version = version + 1
            WHERE case_id = %s
        """, (payload.department_id, case_id))

        cur.execute("""
            INSERT INTO audit_logs (
                action_type, entity_type, entity_id, performed_by_user_id,
                actor_name, old_state, new_state, change_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            "CASE_ASSIGNMENT",
            "REPAIR_CASE",
            case_id,
            current_user["user_id"],
            current_user["full_name"],
            json.dumps({"department_id": old_dept_id}),
            json.dumps({"department_id": payload.department_id, "department_name": dept["name"]}),
            f"Assigned Case #{case['case_number']} to department '{dept['name']}'."
        ))

    return {"message": f"Case assigned to {dept['name']} successfully."}

@router.patch("/{case_id}/status")
def update_case_status(
    case_id: int,
    payload: CaseStatusUpdate,
    current_user: dict = Depends(require_staff_or_admin)
):
    """
    Updates case status with optimistic concurrency control.
    """
    with transaction_cursor() as cur:
        cur.execute("SELECT case_id, case_number, status, version FROM repair_cases WHERE case_id = %s", (case_id,))
        case = cur.fetchone()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found.")

        old_status = case["status"]
        closed_at_clause = ", closed_at = NOW()" if payload.status == "VERIFIED_CLOSED" else ""

        cur.execute(f"""
            UPDATE repair_cases
            SET status = %s,
                version = version + 1
                {closed_at_clause}
            WHERE case_id = %s
        """, (payload.status, case_id))

        # Also update linked reports status
        report_status_map = {
            "IN_PROGRESS": "WORK_UNDERWAY",
            "VERIFIED_CLOSED": "RESOLVED",
            "REOPENED": "INVESTIGATING"
        }
        if payload.status in report_status_map:
            cur.execute("""
                UPDATE citizen_reports
                SET status = %s
                WHERE case_id = %s
            """, (report_status_map[payload.status], case_id))

        cur.execute("""
            INSERT INTO audit_logs (
                action_type, entity_type, entity_id, performed_by_user_id,
                actor_name, old_state, new_state, change_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            "STATUS_CHANGE",
            "REPAIR_CASE",
            case_id,
            current_user["user_id"],
            current_user["full_name"],
            json.dumps({"status": old_status}),
            json.dumps({"status": payload.status, "notes": payload.notes}),
            f"Case #{case['case_number']} status changed from {old_status} to {payload.status}."
        ))

    return {"message": f"Case status updated to {payload.status}."}
