from typing import Dict, Any, Optional
from datetime import datetime, timezone

def evaluate_asset_recurrence(
    asset_id: int,
    cur,
    current_timestamp: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Examines previous cases for the given infrastructure asset to detect
    recurring failures and calculate recurrence interval.
    """
    if current_timestamp is None:
        current_timestamp = datetime.now(timezone.utc)

    # Fetch last closed or completed case on this asset
    cur.execute("""
        SELECT case_id, case_number, status, closed_at, created_at
        FROM repair_cases
        WHERE asset_id = %s AND status = 'VERIFIED_CLOSED'
        ORDER BY closed_at DESC
        LIMIT 1
    """, (asset_id,))
    last_closed = cur.fetchone()

    # Also count total past recurring failures on this asset
    cur.execute("""
        SELECT COUNT(*) AS past_cases_count,
               SUM(CASE WHEN is_recurring_failure = TRUE THEN 1 ELSE 0 END) AS past_recurring_count
        FROM repair_cases
        WHERE asset_id = %s
    """, (asset_id,))
    stats = cur.fetchone()

    is_recurring = False
    days_since_last_repair = None
    previous_case_id = None
    investigation_needed = False
    investigation_reason = None

    if last_closed and last_closed.get("closed_at"):
        closed_dt = last_closed["closed_at"]
        if closed_dt.tzinfo is None:
            closed_dt = closed_dt.replace(tzinfo=timezone.utc)
        if current_timestamp.tzinfo is None:
            current_timestamp = current_timestamp.replace(tzinfo=timezone.utc)
        
        diff = (current_timestamp - closed_dt).total_seconds() / 86400.0
        days_since_last_repair = max(0, int(diff))
        previous_case_id = last_closed["case_id"]

        # Recurrence threshold: Reappears within 90 days of verified closure
        if days_since_last_repair <= 90:
            is_recurring = True

    past_recurring = (stats["past_recurring_count"] or 0) + (1 if is_recurring else 0)
    if past_recurring >= 2:
        investigation_needed = True
        investigation_reason = f"Repeated premature failure: Asset failed {past_recurring} times within warranty/durability window."

    return {
        "is_recurring_failure": is_recurring,
        "days_since_last_repair": days_since_last_repair,
        "previous_case_id": previous_case_id,
        "investigation_needed": investigation_needed,
        "investigation_reason": investigation_reason,
        "past_recurring_count": past_recurring
    }

def update_asset_health_metrics(asset_id: int, cur):
    """
    Recalculates current_health_score, total_incidents_count, and cumulative_repair_cost
    for an infrastructure asset based on real records in the database.
    """
    cur.execute("""
        SELECT 
            COUNT(c.case_id) AS total_incidents,
            SUM(CASE WHEN c.is_recurring_failure = TRUE THEN 1 ELSE 0 END) AS recurring_count,
            COALESCE(SUM(w.actual_cost), 0.0) AS total_spent
        FROM repair_cases c
        LEFT JOIN work_orders w ON c.case_id = w.case_id
        WHERE c.asset_id = %s
    """, (asset_id,))
    data = cur.fetchone()

    total_incidents = int(data["total_incidents"] or 0)
    recurring_count = int(data["recurring_count"] or 0)
    total_spent = float(data["total_spent"] or 0.0)

    # Health formula: 100 base - (7 per incident) - (12 per recurring failure)
    # Capped between 15% and 100%
    health_score = max(15.0, min(100.0, 100.0 - (total_incidents * 7.0) - (recurring_count * 12.0)))

    # Check if cumulative repair cost exceeds 65% of replacement cost
    cur.execute("SELECT replacement_cost_estimate FROM infrastructure_assets WHERE asset_id = %s", (asset_id,))
    asset_row = cur.fetchone()
    rep_cost = float(asset_row["replacement_cost_estimate"]) if asset_row else 30000.0

    investigation_flag = False
    investigation_reason = None
    if recurring_count >= 2:
        investigation_flag = True
        investigation_reason = f"Frequent recurring failures ({recurring_count} recurrences recorded)."
    elif total_spent >= (rep_cost * 0.65):
        investigation_flag = True
        investigation_reason = f"Repair spend (${total_spent:,.2f}) exceeded 65% of full asset replacement cost."

    cur.execute("""
        UPDATE infrastructure_assets
        SET current_health_score = %s,
            total_incidents_count = %s,
            recurring_failures_count = %s,
            cumulative_repair_cost = %s,
            investigation_flag = %s,
            investigation_reason = %s,
            updated_at = NOW()
        WHERE asset_id = %s
    """, (health_score, total_incidents, recurring_count, total_spent, investigation_flag, investigation_reason, asset_id))
