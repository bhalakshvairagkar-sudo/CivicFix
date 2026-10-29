from typing import Dict, Any, List

def analyze_work_order_cost(estimated_cost: float, actual_cost: float) -> Dict[str, Any]:
    """
    Computes cost variance and flags significant budget deviations.
    """
    est = float(estimated_cost or 0.0)
    act = float(actual_cost or 0.0)

    if est <= 0.0:
        variance_pct = 0.0
    else:
        variance_pct = round(((act - est) / est) * 100.0, 2)

    is_overrun = variance_pct > 30.0
    is_severe_overrun = variance_pct > 50.0

    flags = []
    if is_severe_overrun:
        flags.append(f"Severe budget overrun: actual repair cost is {variance_pct}% higher than estimate.")
    elif is_overrun:
        flags.append(f"Noticeable budget overrun: actual cost exceeds estimate by {variance_pct}%.")

    return {
        "estimated_cost": est,
        "actual_cost": act,
        "variance_pct": variance_pct,
        "is_overrun": is_overrun,
        "is_severe_overrun": is_severe_overrun,
        "flags": flags
    }

def detect_asset_cost_anomalies(cur) -> List[Dict[str, Any]]:
    """
    Scans infrastructure assets in the database to detect cost anomalies:
    1. Assets where cumulative repairs exceed 60% of replacement cost.
    2. Assets with repeated small repairs exceeding single major overhaul cost.
    """
    cur.execute("""
        SELECT 
            asset_id,
            asset_code,
            name,
            category,
            ward_number,
            cumulative_repair_cost,
            replacement_cost_estimate,
            total_incidents_count,
            recurring_failures_count,
            ROUND((cumulative_repair_cost / NULLIF(replacement_cost_estimate, 0)) * 100, 1) AS repair_to_replacement_ratio
        FROM infrastructure_assets
        WHERE cumulative_repair_cost > 0
        ORDER BY repair_to_replacement_ratio DESC
    """)
    rows = cur.fetchall()

    anomalies = []
    for r in rows:
        ratio = float(r["repair_to_replacement_ratio"] or 0.0)
        flags = []
        if ratio >= 80.0:
            flags.append("Critical cost warning: Repair expenditures have nearly exhausted full replacement cost.")
        elif ratio >= 60.0:
            flags.append("Elevated cost anomaly: Cumulative maintenance spend justifies asset overhaul or replacement.")
        if r["recurring_failures_count"] >= 3:
            flags.append(f"Asset had {r['recurring_failures_count']} repeated failures; ongoing patchwork is economically inefficient.")

        if flags:
            anomalies.append({
                "asset_id": r["asset_id"],
                "asset_code": r["asset_code"],
                "name": r["name"],
                "category": r["category"],
                "ward": r["ward_number"],
                "cumulative_cost": float(r["cumulative_repair_cost"]),
                "replacement_cost": float(r["replacement_cost_estimate"]),
                "ratio_pct": ratio,
                "incidents": r["total_incidents_count"],
                "recurring_failures": r["recurring_failures_count"],
                "flags": flags
            })

    return anomalies
