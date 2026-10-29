from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
import uuid
import json
from datetime import datetime, timezone

from database import get_db_cursor, transaction_cursor
from security import get_current_user, require_citizen_or_above
from schemas import ReportCreate
from services.duplicate_detector import find_duplicate_candidates, haversine_distance
from services.risk_prioritizer import calculate_priority_score
from services.recurrence_engine import evaluate_asset_recurrence, update_asset_health_metrics

router = APIRouter(prefix="/api/reports", tags=["Infrastructure Reports"])

@router.post("", status_code=status.HTTP_201_CREATED)
def submit_report(payload: ReportCreate, current_user: dict = Depends(get_current_user)):
    """
    Submits a new infrastructure issue report.
    Executes within an ACID transaction:
    - Identifies physical asset and checks recurrence.
    - Determines whether to spawn a new repair case or link to an existing active case.
    - Computes transparent risk priority score and logs immutable audit trail.
    """
    tracking_code = f"REP-{uuid.uuid4().hex[:7].upper()}"

    with transaction_cursor() as cur:
        # 1. Fetch Department associated with this category
        category_dept_map = {
            "POTHOLE": "ROADS",
            "FOOTPATH": "ROADS",
            "STREETLIGHT": "LIGHTING",
            "DRAINAGE": "DRAINAGE",
            "WATER_LEAK": "DRAINAGE",
            "TRAFFIC_SIGNAL": "TRAFFIC"
        }
        dept_code = category_dept_map.get(payload.category.upper(), "ROADS")
        cur.execute("SELECT department_id FROM departments WHERE code = %s", (dept_code,))
        dept_row = cur.fetchone()
        dept_id = dept_row["department_id"] if dept_row else 1

        # 2. Identify physical asset (either provided or closest within 150m)
        asset_id = payload.asset_id
        if not asset_id:
            cur.execute("""
                SELECT asset_id, latitude, longitude
                FROM infrastructure_assets
                WHERE category = %s
            """, (payload.category,))
            assets = cur.fetchall()
            
            closest_asset = None
            min_dist = float("inf")
            for a in assets:
                d = haversine_distance(payload.latitude, payload.longitude, float(a["latitude"]), float(a["longitude"]))
                if d < min_dist:
                    min_dist = d
                    closest_asset = a["asset_id"]
            
            if min_dist <= 250.0 and closest_asset:
                asset_id = closest_asset
            else:
                # Create a persistent physical asset record for this new location
                asset_code = f"AST-{dept_code[:3]}-{uuid.uuid4().hex[:5].upper()}"
                cur.execute("""
                    INSERT INTO infrastructure_assets (
                        asset_code, name, category, ward_number, address_landmark,
                        latitude, longitude, department_id, install_year
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    asset_code,
                    f"{payload.category.capitalize()} Asset at {payload.address_text[:30]}",
                    payload.category,
                    "Ward 4",
                    payload.address_text,
                    payload.latitude,
                    payload.longitude,
                    dept_id,
                    2021
                ))
                asset_id = cur.lastrowid

        # 3. Check for Duplicate Reports / Active Existing Cases within 120m
        cur.execute("""
            SELECT case_id, case_number, title, category, severity, status, latitude, longitude, description
            FROM repair_cases
            WHERE category = %s AND status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED')
        """, (payload.category,))
        active_cases = cur.fetchall()

        candidates = find_duplicate_candidates(
            category=payload.category,
            lat=payload.latitude,
            lng=payload.longitude,
            description=payload.description,
            existing_cases=active_cases,
            distance_threshold_m=100.0
        )

        # 4. Fetch sensitive locations for priority scoring
        cur.execute("SELECT location_id, name, type, latitude, longitude, buffer_meters, weight_score FROM sensitive_locations;")
        sens_locs = cur.fetchall()

        # Check asset recurrence intelligence
        rec_info = evaluate_asset_recurrence(asset_id, cur)

        target_case_id = None
        is_primary = False

        if candidates and candidates[0]["duplicate_confidence_pct"] >= 80.0:
            # High confidence duplicate -> Link into existing case
            target_case_id = candidates[0]["case_id"]
            is_primary = False

            # Update existing case's linked count and recalculate priority
            cur.execute("SELECT total_linked_reports, created_at, severity, is_recurring_failure FROM repair_cases WHERE case_id = %s", (target_case_id,))
            target_case = cur.fetchone()
            new_linked_count = (target_case["total_linked_reports"] or 1) + 1

            p_breakdown = calculate_priority_score(
                severity=target_case["severity"],
                created_at=target_case["created_at"],
                is_recurring=bool(target_case["is_recurring_failure"]),
                lat=payload.latitude,
                lng=payload.longitude,
                sensitive_locations=sens_locs,
                linked_reports_count=new_linked_count
            )

            cur.execute("""
                UPDATE repair_cases
                SET total_linked_reports = %s,
                    priority_score = %s,
                    priority_level = %s,
                    priority_breakdown = %s,
                    version = version + 1
                WHERE case_id = %s
            """, (new_linked_count, p_breakdown["total_score"], p_breakdown["priority_level"], json.dumps(p_breakdown), target_case_id))

        else:
            # Spawn a brand new Consolidated Repair Case
            is_primary = True
            case_number = f"CAS-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
            title = f"{payload.category.replace('_', ' ').title()} reported at {payload.address_text[:35]}"
            
            p_breakdown = calculate_priority_score(
                severity=payload.severity,
                created_at=datetime.now(timezone.utc),
                is_recurring=rec_info["is_recurring_failure"],
                lat=payload.latitude,
                lng=payload.longitude,
                sensitive_locations=sens_locs,
                linked_reports_count=1
            )

            cur.execute("""
                INSERT INTO repair_cases (
                    case_number, asset_id, category, title, description, severity, status,
                    priority_score, priority_level, priority_breakdown, latitude, longitude,
                    department_id, is_recurring_failure, days_since_last_repair, previous_case_id,
                    total_linked_reports, created_by_user_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                case_number,
                asset_id,
                payload.category,
                title,
                payload.description,
                payload.severity,
                "OPEN",
                p_breakdown["total_score"],
                p_breakdown["priority_level"],
                json.dumps(p_breakdown),
                payload.latitude,
                payload.longitude,
                dept_id,
                rec_info["is_recurring_failure"],
                rec_info["days_since_last_repair"],
                rec_info["previous_case_id"],
                1,
                current_user["user_id"]
            ))
            target_case_id = cur.lastrowid

        # 5. Insert the citizen report record
        cur.execute("""
            INSERT INTO citizen_reports (
                tracking_code, user_id, case_id, is_primary_case_report,
                category, severity, description, photo_url, latitude, longitude,
                address_text, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tracking_code,
            current_user["user_id"],
            target_case_id,
            is_primary,
            payload.category,
            payload.severity,
            payload.description,
            payload.photo_url or "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
            payload.latitude,
            payload.longitude,
            payload.address_text,
            "LINKED_TO_CASE" if not is_primary else "SUBMITTED"
        ))
        report_id = cur.lastrowid

        # 6. Update physical asset metrics
        update_asset_health_metrics(asset_id, cur)

        # 7. Record append-only audit trail
        cur.execute("""
            INSERT INTO audit_logs (
                action_type, entity_type, entity_id, performed_by_user_id,
                actor_name, new_state, change_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            "REPORT_CREATED",
            "CITIZEN_REPORT",
            report_id,
            current_user["user_id"],
            current_user["full_name"],
            json.dumps({"tracking_code": tracking_code, "case_id": target_case_id, "category": payload.category}),
            f"Citizen {current_user['full_name']} filed report {tracking_code} (linked to Case #{target_case_id})."
        ))

    return {
        "report_id": report_id,
        "tracking_code": tracking_code,
        "case_id": target_case_id,
        "is_primary": is_primary,
        "duplicate_linked": not is_primary,
        "message": "Report successfully lodged and linked to civic repair case."
    }

@router.get("")
def list_reports(
    category: Optional[str] = None,
    status: Optional[str] = None,
    user_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Retrieves filtered list of citizen reports with creator and case metadata."""
    query = """
        SELECT 
            r.report_id, r.tracking_code, r.user_id, r.case_id, r.is_primary_case_report,
            r.category, r.severity, r.description, r.photo_url, r.latitude, r.longitude,
            r.address_text, r.status, r.upvotes_count, r.created_at,
            u.full_name AS citizen_name, u.email AS citizen_email,
            c.case_number, c.status AS case_status, c.priority_score, c.priority_level
        FROM citizen_reports r
        JOIN users u ON r.user_id = u.user_id
        JOIN repair_cases c ON r.case_id = c.case_id
        WHERE 1=1
    """
    params = []

    if category:
        query += " AND r.category = %s"
        params.append(category)
    if status:
        query += " AND r.status = %s"
        params.append(status)
    if user_only or current_user["role"] == "CITIZEN":
        query += " AND r.user_id = %s"
        params.append(current_user["user_id"])

    query += " ORDER BY r.created_at DESC LIMIT 100"

    with get_db_cursor() as cur:
        cur.execute(query, tuple(params))
        results = cur.fetchall()

    return results

@router.get("/track/{tracking_code}")
def track_report_status(tracking_code: str):
    """
    Public lookup enabling citizens to track report status, linked case,
    and work order progress without requiring login.
    """
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT 
                r.report_id, r.tracking_code, r.category, r.severity, r.description,
                r.address_text, r.status AS report_status, r.created_at AS report_date,
                r.photo_url, r.upvotes_count,
                c.case_id, c.case_number, c.status AS case_status, c.priority_level,
                c.is_recurring_failure, c.closed_at,
                d.name AS department_name, d.contact_phone AS department_phone,
                w.work_order_number, w.status AS work_order_status,
                w.target_completion_date, w.assigned_team_leader
            FROM citizen_reports r
            JOIN repair_cases c ON r.case_id = c.case_id
            JOIN departments d ON c.department_id = d.department_id
            LEFT JOIN work_orders w ON c.case_id = w.case_id
            WHERE r.tracking_code = %s
        """, (tracking_code,))
        record = cur.fetchone()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No infrastructure report found with tracking code '{tracking_code}'."
        )

    return record

@router.post("/{report_id}/upvote")
def upvote_report(report_id: int, current_user: dict = Depends(get_current_user)):
    """
    Increments citizen upvotes confirming an issue, increasing its priority score.
    """
    with transaction_cursor() as cur:
        cur.execute("SELECT report_id, case_id, upvotes_count FROM citizen_reports WHERE report_id = %s", (report_id,))
        rep = cur.fetchone()
        if not rep:
            raise HTTPException(status_code=404, detail="Report not found.")

        cur.execute("UPDATE citizen_reports SET upvotes_count = upvotes_count + 1 WHERE report_id = %s", (report_id,))
        
        # Recalculate case priority
        case_id = rep["case_id"]
        cur.execute("""
            SELECT c.case_id, c.severity, c.created_at, c.is_recurring_failure, c.latitude, c.longitude,
                   c.total_linked_reports, COALESCE(SUM(r.upvotes_count), 0) AS total_upvotes
            FROM repair_cases c
            LEFT JOIN citizen_reports r ON c.case_id = r.case_id
            WHERE c.case_id = %s
            GROUP BY c.case_id
        """, (case_id,))
        case_info = cur.fetchone()

        cur.execute("SELECT location_id, name, type, latitude, longitude, buffer_meters, weight_score FROM sensitive_locations;")
        sens_locs = cur.fetchall()

        p_breakdown = calculate_priority_score(
            severity=case_info["severity"],
            created_at=case_info["created_at"],
            is_recurring=bool(case_info["is_recurring_failure"]),
            lat=float(case_info["latitude"]),
            lng=float(case_info["longitude"]),
            sensitive_locations=sens_locs,
            linked_reports_count=case_info["total_linked_reports"],
            upvotes_count=case_info["total_upvotes"]
        )

        cur.execute("""
            UPDATE repair_cases
            SET priority_score = %s,
                priority_level = %s,
                priority_breakdown = %s,
                version = version + 1
            WHERE case_id = %s
        """, (p_breakdown["total_score"], p_breakdown["priority_level"], json.dumps(p_breakdown), case_id))

    return {"message": "Upvote recorded. Case priority updated.", "new_priority_score": p_breakdown["total_score"]}
