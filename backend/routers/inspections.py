from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
import json

from database import get_db_cursor, transaction_cursor
from security import get_current_user, require_staff_or_admin, require_admin
from schemas import InspectionCreate, CaseClosureApproval
from services.verification_auditor import audit_inspection_evidence
from services.recurrence_engine import update_asset_health_metrics

router = APIRouter(prefix="/api/inspections", tags=["Evidence-Based Repair Verification"])

@router.post("", status_code=status.HTTP_201_CREATED)
def submit_inspection(
    payload: InspectionCreate,
    current_user: dict = Depends(require_staff_or_admin)
):
    """
    Submits an on-site repair inspection with before/after photo evidence.
    Runs automated fraud/anomaly heuristics (missing photos, rushed completion, cost blowouts).
    """
    with transaction_cursor() as cur:
        # Fetch case and work order details
        cur.execute("SELECT case_id, case_number, category, created_at, asset_id FROM repair_cases WHERE case_id = %s", (payload.case_id,))
        case = cur.fetchone()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found.")

        cur.execute("SELECT work_order_id, estimated_cost, actual_cost, status FROM work_orders WHERE work_order_id = %s", (payload.work_order_id,))
        wo = cur.fetchone()
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found.")

        # Run Verification Auditor Heuristics
        audit_res = audit_inspection_evidence(
            case_data=case,
            work_order_data=wo,
            before_photo_url=payload.before_photo_url,
            after_photo_url=payload.after_photo_url,
            quality_rating=payload.quality_rating,
            durability_assessment=payload.durability_assessment,
            notes=payload.inspection_notes
        )

        cur.execute("""
            INSERT INTO repair_inspections (
                case_id, work_order_id, inspector_user_id, before_photo_url,
                after_photo_url, quality_rating, durability_assessment,
                inspection_notes, passed_verification, is_suspicious, suspicious_flags
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            payload.case_id,
            payload.work_order_id,
            current_user["user_id"],
            payload.before_photo_url,
            payload.after_photo_url,
            payload.quality_rating,
            payload.durability_assessment,
            payload.inspection_notes,
            payload.passed_verification,
            audit_res["is_suspicious"],
            json.dumps(audit_res["suspicious_flags"])
        ))
        inspection_id = cur.lastrowid

        # Record audit log
        action = "SUSPICIOUS_FLAG_RAISED" if audit_res["is_suspicious"] else "INSPECTION_SUBMITTED"
        cur.execute("""
            INSERT INTO audit_logs (
                action_type, entity_type, entity_id, performed_by_user_id,
                actor_name, new_state, change_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            action,
            "REPAIR_INSPECTION",
            inspection_id,
            current_user["user_id"],
            current_user["full_name"],
            json.dumps({
                "quality_rating": payload.quality_rating,
                "durability": payload.durability_assessment,
                "is_suspicious": audit_res["is_suspicious"],
                "flags": audit_res["suspicious_flags"]
            }),
            f"Inspection filed by {current_user['full_name']} for Case #{case['case_number']}. Status: {audit_res['summary']}."
        ))

    return {
        "inspection_id": inspection_id,
        "is_suspicious": audit_res["is_suspicious"],
        "suspicious_flags": audit_res["suspicious_flags"],
        "can_auto_close": audit_res["can_auto_close"],
        "message": "Inspection successfully logged."
    }

@router.post("/{inspection_id}/closure-decision")
def closure_decision(
    inspection_id: int,
    payload: CaseClosureApproval,
    current_user: dict = Depends(require_staff_or_admin)
):
    """
    ⭐ DBMS TRANSACTION HIGHLIGHT:
    Managerial / Engineering Sign-Off on Repair Closure.
    - If approved: Sets case to VERIFIED_CLOSED, timestamps closed_at, updates citizen reports to RESOLVED.
    - If rejected: Sets case to REOPENED with notes and dispatches for rework.
    """
    with transaction_cursor() as cur:
        cur.execute("""
            SELECT i.inspection_id, i.case_id, i.work_order_id, i.is_suspicious,
                   c.case_number, c.asset_id, c.status AS current_case_status
            FROM repair_inspections i
            JOIN repair_cases c ON i.case_id = c.case_id
            WHERE i.inspection_id = %s
            FOR UPDATE
        """, (inspection_id,))
        insp = cur.fetchone()

        if not insp:
            raise HTTPException(status_code=404, detail="Inspection not found.")

        case_id = insp["case_id"]

        if payload.approved:
            new_status = "VERIFIED_CLOSED"
            cur.execute("""
                UPDATE repair_cases
                SET status = 'VERIFIED_CLOSED',
                    closed_at = NOW(),
                    version = version + 1
                WHERE case_id = %s
            """, (case_id,))

            cur.execute("""
                UPDATE citizen_reports
                SET status = 'RESOLVED'
                WHERE case_id = %s
            """, (case_id,))

            cur.execute("""
                UPDATE repair_inspections
                SET passed_verification = TRUE
                WHERE inspection_id = %s
            """, (inspection_id,))

            update_asset_health_metrics(insp["asset_id"], cur)

            action = "CLOSURE_APPROVED"
            summary = f"Case #{insp['case_number']} approved and verified closed by {current_user['full_name']}."
        else:
            new_status = "REOPENED"
            cur.execute("""
                UPDATE repair_cases
                SET status = 'REOPENED',
                    closed_at = NULL,
                    version = version + 1
                WHERE case_id = %s
            """, (case_id,))

            cur.execute("""
                UPDATE citizen_reports
                SET status = 'INVESTIGATING'
                WHERE case_id = %s
            """, (case_id,))

            action = "CASE_REOPENED"
            summary = f"Case #{insp['case_number']} rejected/reopened by {current_user['full_name']}. Reason: {payload.review_notes}"

        # Audit log
        cur.execute("""
            INSERT INTO audit_logs (
                action_type, entity_type, entity_id, performed_by_user_id,
                actor_name, new_state, change_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            action,
            "REPAIR_CASE",
            case_id,
            current_user["user_id"],
            current_user["full_name"],
            json.dumps({"decision": "APPROVED" if payload.approved else "REJECTED", "notes": payload.review_notes}),
            summary
        ))

    return {
        "success": True,
        "case_id": case_id,
        "new_status": new_status,
        "message": summary
    }

@router.get("/suspicious")
def list_suspicious_inspections():
    """Returns inspections flagged by evidence auditor for supervisory review."""
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT 
                i.inspection_id, i.case_id, i.work_order_id, i.quality_rating,
                i.durability_assessment, i.inspection_notes, i.suspicious_flags,
                i.before_photo_url, i.after_photo_url, i.inspected_at,
                c.case_number, c.category, c.status AS case_status,
                u.full_name AS inspector_name,
                w.estimated_cost, w.actual_cost, w.contractor_name
            FROM repair_inspections i
            JOIN repair_cases c ON i.case_id = c.case_id
            JOIN users u ON i.inspector_user_id = u.user_id
            JOIN work_orders w ON i.work_order_id = w.work_order_id
            WHERE i.is_suspicious = TRUE
            ORDER BY i.inspected_at DESC
        """)
        rows = cur.fetchall()

    for r in rows:
        if isinstance(r.get("suspicious_flags"), str):
            try:
                r["suspicious_flags"] = json.loads(r["suspicious_flags"])
            except Exception:
                pass

    return rows
