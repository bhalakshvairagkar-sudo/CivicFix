import math
from typing import Dict, Any, List
from datetime import datetime, timezone
from services.duplicate_detector import haversine_distance

SEVERITY_WEIGHTS = {
    "CRITICAL": 40.0,
    "HIGH": 25.0,
    "MEDIUM": 15.0,
    "LOW": 5.0
}

def calculate_priority_score(
    severity: str,
    created_at: datetime,
    is_recurring: bool,
    lat: float,
    lng: float,
    sensitive_locations: List[Dict[str, Any]],
    linked_reports_count: int = 1,
    upvotes_count: int = 0
) -> Dict[str, Any]:
    """
    Transparent, explainable multi-factor risk prioritization algorithm.
    Score = BaseSeverity + AgePenalty + RecurrencePenalty + SensitiveLocationProximity + CitizenBonus
    """
    # 1. Base Severity Points
    base_severity = SEVERITY_WEIGHTS.get(severity.upper(), 15.0)

    # 2. Age Waiting Penalty (1.5 points per elapsed day, capped at 25)
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_days = max(0.0, (now - created_at).total_seconds() / 86400.0)
    age_penalty = min(25.0, round(age_days * 1.5, 2))

    # 3. Recurrence Penalty (20 points if problem recurring on physical asset)
    recurrence_penalty = 20.0 if is_recurring else 0.0

    # 4. Proximity to Sensitive Locations (Hospitals, Schools, Transit Hubs)
    sensitive_penalty = 0.0
    sensitive_matches = []
    for loc in sensitive_locations:
        loc_lat = float(loc["latitude"])
        loc_lng = float(loc["longitude"])
        dist = haversine_distance(lat, lng, loc_lat, loc_lng)
        buffer_dist = float(loc.get("buffer_meters", 350))

        if dist <= buffer_dist:
            loc_weight = float(loc.get("weight_score", 20))
            # Proximity boost factor based on how close inside the buffer
            closeness_ratio = max(0.5, 1.0 - (dist / buffer_dist))
            boost = round(loc_weight * closeness_ratio, 1)
            if boost > sensitive_penalty:
                sensitive_penalty = boost
            sensitive_matches.append(f"{loc['name']} ({loc['type']}, {int(dist)}m away)")

    # 5. Citizen Reports & Upvotes Confirmation Bonus (capped at 15)
    # Linked duplicates represent real multiple citizens confirming the hazard
    citizen_bonus = min(15.0, round(((linked_reports_count - 1) * 3.0) + (upvotes_count * 0.5), 1))

    # Total Score
    total_score = round(base_severity + age_penalty + recurrence_penalty + sensitive_penalty + citizen_bonus, 1)

    # Priority Classification
    if total_score >= 70.0:
        priority_level = "CRITICAL"
    elif total_score >= 45.0:
        priority_level = "HIGH"
    elif total_score >= 25.0:
        priority_level = "MEDIUM"
    else:
        priority_level = "LOW"

    # Human-readable explainable rationale
    explanation_parts = [f"Base severity '{severity}' ({base_severity} pts)"]
    if age_days >= 1.0:
        explanation_parts.append(f"Waiting {int(age_days)} days (+{age_penalty} pts)")
    if is_recurring:
        explanation_parts.append(f"Recurring failure on same asset (+{recurrence_penalty} pts)")
    if sensitive_matches:
        explanation_parts.append(f"Near {', '.join(sensitive_matches[:2])} (+{sensitive_penalty} pts)")
    if linked_reports_count > 1 or upvotes_count > 0:
        explanation_parts.append(f"{linked_reports_count} citizen confirmations (+{citizen_bonus} pts)")

    explanation = "; ".join(explanation_parts) + f". Total Score: {total_score}."

    breakdown = {
        "base_severity": base_severity,
        "age_days": round(age_days, 1),
        "age_penalty": age_penalty,
        "is_recurring": is_recurring,
        "recurrence_penalty": recurrence_penalty,
        "sensitive_proximity_penalty": sensitive_penalty,
        "sensitive_locations_nearby": sensitive_matches,
        "linked_reports_count": linked_reports_count,
        "citizen_bonus": citizen_bonus,
        "total_score": total_score,
        "priority_level": priority_level,
        "formula": "Score = BaseSeverity + AgePenalty + RecurrencePenalty + SensitiveProximity + CitizenBonus",
        "explanation": explanation
    }

    return breakdown
