from typing import Dict, Any, List
from datetime import datetime, timezone

def audit_inspection_evidence(
    case_data: Dict[str, Any],
    work_order_data: Dict[str, Any],
    before_photo_url: str,
    after_photo_url: str,
    quality_rating: int,
    durability_assessment: str,
    notes: str
) -> Dict[str, Any]:
    """
    Evidence-Based Repair Verification Auditor.
    Validates physical proof and raises non-accusatory flags requiring managerial review.
    """
    flags = []
    is_suspicious = False

    # 1. Photographic Evidence Check
    if not after_photo_url or len(after_photo_url.strip()) < 5:
        flags.append("MISSING_AFTER_PHOTO: Repair inspection lacks verified post-repair photograph.")
        is_suspicious = True

    # 2. Abnormally Fast Resolution Check (< 3 hours for complex infrastructure repairs)
    created_at = case_data.get("created_at")
    if created_at:
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        elapsed_hours = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600.0
        
        # Categories requiring heavy machinery or curing time
        heavy_categories = ["POTHOLE", "FOOTPATH", "DRAINAGE", "WATER_LEAK"]
        if case_data.get("category") in heavy_categories and elapsed_hours < 3.0:
            flags.append(f"ABNORMALLY_FAST_RESOLUTION: Heavy infrastructure issue reported closed in only {elapsed_hours:.1f} hours.")
            is_suspicious = True

    # 3. Quality & Durability Warning
    if quality_rating <= 2:
        flags.append(f"SUBSTANDARD_QUALITY_RATING: Inspector assigned low quality rating ({quality_rating}/5 stars).")
        is_suspicious = True

    if durability_assessment.upper() == "POOR":
        flags.append("POOR_DURABILITY_ASSESSMENT: Inspector noted substandard durability; high risk of premature failure.")
        is_suspicious = True

    # 4. Severe Cost Overrun without justification
    est = float(work_order_data.get("estimated_cost") or 0.0)
    act = float(work_order_data.get("actual_cost") or 0.0)
    if est > 0 and act > (est * 1.5):
        flags.append(f"SIGNIFICANT_COST_OVERRUN: Actual expense (${act:,.2f}) exceeded initial estimate (${est:,.2f}) by >50%.")
        is_suspicious = True

    return {
        "is_suspicious": is_suspicious,
        "suspicious_flags": flags,
        "can_auto_close": (not is_suspicious and quality_rating >= 3 and bool(after_photo_url)),
        "summary": "Evidence verified successfully" if not is_suspicious else f"Flagged for supervisory review ({len(flags)} items requiring sign-off)."
    }
