from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
import uuid
import json
from datetime import datetime

from database import get_db_cursor, transaction_cursor
from security import get_current_user, require_staff_or_admin
from schemas import WorkOrderCreate, WorkOrderUpdate
from services.cost_intelligence import analyze_work_order_cost
from services.recurrence_engine import update_asset_health_metrics

router = APIRouter(prefix="/api/work-orders", tags=["Work Orders & Dispatch"])

@router.get("")
def list_work_orders(
    department_id: Optional[int] = None,
    status: Optional[str] = None
):
    """Retrieves work orders with linked repair case and department info."""
    query = """
        SELECT 
            w.work_order_id, w.work_order_number, w.case_id, w.department_id,
            w.assigned_team_leader, w.contractor_name, w.estimated_cost, w.actual_cost,
            w.cost_variance_pct, w.target_completion_date, w.actual_completion_date,
            w.materials_used, w.work_notes, w.status, w.created_at, w.updated_at,
            c.case_number, c.title AS case_title, c.category, c.severity, c.priority_score,
            c.latitude, c.longitude,
            d.name AS department_name, d.code AS department_code
        FROM work_orders w
        JOIN repair_cases c ON w.case_id = c.case_id
        JOIN departments d ON w.department_id = d.department_id
        WHERE 1=1
    """
    params = []

    if department_id:
        query += " AND w.department_id = %s"
        params.append(department_id)
    if status:
        query += " AND w.status = %s"
        params.append(status)

    query += " ORDER BY w.created_at DESC LIMIT 100"

    with get_db_cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()

    return rows

@router.post("", status_code=status.HTTP_201_CREATED)
def create_work_order(
    payload: WorkOrderCreate,
    current_user: dict = Depends(require_staff_or_admin)
):
    """
    Dispatches a repair work order for a case.
    Executes in a transaction:
    - Inserts work order.
    - Transitions case status to 'IN_PROGRESS' if currently 'OPEN' or 'ASSIGNED'.
    - Logs audit trail.
    """
    wo_number = f"WO-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"

    with transaction_cursor() as cur:
        # Validate and row-lock case
        cur.execute("SELECT case_id, case_number, status, department_id FROM repair_cases WHERE case_id = %s FOR UPDATE", (payload.case_id,))
        case = cur.fetchone()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found.")

        cur.execute("""
            INSERT INTO work_orders (
                work_order_number, case_id, department_id, assigned_team_leader,
                contractor_name, estimated_cost, actual_cost, target_completion_date,
                materials_used, work_notes, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            wo_number,
            payload.case_id,
            payload.department_id,
            payload.assigned_team_leader,
            payload.contractor_name,
            payload.estimated_cost,
            0.00,
            payload.target_completion_date,
            payload.materials_used,
            payload.work_notes,
            "SCHEDULED"
        ))
        wo_id = cur.lastrowid

        # Update case status to IN_PROGRESS
        cur.execute("""
            UPDATE repair_cases
            SET status = 'IN_PROGRESS',
                version = version + 1
            WHERE case_id = %s
        """, (payload.case_id,))

        # Update citizen reports status to WORK_UNDERWAY
        cur.execute("""
            UPDATE citizen_reports
            SET status = 'WORK_UNDERWAY'
            WHERE case_id = %s
        """, (payload.case_id,))

        # Audit log
        cur.execute("""
            INSERT INTO audit_logs (
                action_type, entity_type, entity_id, performed_by_user_id,
                actor_name, new_state, change_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            "WORK_ORDER_CREATED",
            "WORK_ORDER",
            wo_id,
            current_user["user_id"],
            current_user["full_name"],
            json.dumps({"work_order_number": wo_number, "case_id": payload.case_id, "estimated_cost": payload.estimated_cost}),
            f"Created Work Order #{wo_number} assigned to {payload.assigned_team_leader} (Est: ${payload.estimated_cost:,.2f})."
        ))

    return {
        "work_order_id": wo_id,
        "work_order_number": wo_number,
        "message": "Work order created and case transitioned to IN_PROGRESS."
    }

@router.patch("/{work_order_id}")
def update_work_order(
    work_order_id: int,
    payload: WorkOrderUpdate,
    current_user: dict = Depends(require_staff_or_admin)
):
    """
    Updates work order execution status, recorded actual costs, materials, and notes.
    Recalculates cost variance and updates department budget usage and asset cumulative repair cost.
    """
    with transaction_cursor() as cur:
        cur.execute("""
            SELECT w.work_order_id, w.work_order_number, w.case_id, w.department_id,
                   w.estimated_cost, w.actual_cost, w.status, c.asset_id
            FROM work_orders w
            JOIN repair_cases c ON w.case_id = c.case_id
            WHERE w.work_order_id = %s
            FOR UPDATE
        """, (work_order_id,))
        wo = cur.fetchone()

        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found.")

        old_actual = float(wo["actual_cost"])
        new_actual = float(payload.actual_cost) if payload.actual_cost is not None else old_actual
        cost_analysis = analyze_work_order_cost(float(wo["estimated_cost"]), new_actual)

        # Build update clauses
        fields = []
        vals = []

        if payload.status:
            fields.append("status = %s")
            vals.append(payload.status)
            if payload.status == "WORK_COMPLETED":
                fields.append("actual_completion_date = NOW()")
        if payload.actual_cost is not None:
            fields.append("actual_cost = %s")
            vals.append(new_actual)
        if payload.materials_used is not None:
            fields.append("materials_used = %s")
            vals.append(payload.materials_used)
        if payload.work_notes is not None:
            fields.append("work_notes = %s")
            vals.append(payload.work_notes)

        if fields:
            sql = f"UPDATE work_orders SET {', '.join(fields)}, updated_at = NOW() WHERE work_order_id = %s"
            vals.append(work_order_id)
            cur.execute(sql, tuple(vals))

        # If actual cost changed, adjust department spent_budget and asset cumulative_repair_cost
        diff_cost = new_actual - old_actual
        if diff_cost != 0:
            cur.execute("""
                UPDATE departments
                SET spent_budget = spent_budget + %s
                WHERE department_id = %s
            """, (diff_cost, wo["department_id"]))

            update_asset_health_metrics(wo["asset_id"], cur)

        # If marked completed, update repair case to REPAIR_COMPLETED
        if payload.status == "WORK_COMPLETED":
            cur.execute("""
                UPDATE repair_cases
                SET status = 'REPAIR_COMPLETED',
                    version = version + 1
                WHERE case_id = %s
            """, (wo["case_id"],))

        # Audit log
        cur.execute("""
            INSERT INTO audit_logs (
                action_type, entity_type, entity_id, performed_by_user_id,
                actor_name, new_state, change_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            "COST_UPDATED" if payload.actual_cost is not None else "STATUS_CHANGE",
            "WORK_ORDER",
            work_order_id,
            current_user["user_id"],
            current_user["full_name"],
            json.dumps({"status": payload.status, "actual_cost": new_actual, "variance_pct": cost_analysis["variance_pct"]}),
            f"Updated Work Order #{wo['work_order_number']}: Status='{payload.status or wo['status']}', Cost=${new_actual:,.2f} ({cost_analysis['variance_pct']}% variance)."
        ))

    return {"message": "Work order successfully updated.", "cost_analysis": cost_analysis}
