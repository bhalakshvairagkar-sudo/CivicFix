import math
from typing import List, Dict, Any

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes the great-circle distance between two GPS points in meters
    using the Haversine formula.
    """
    R = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(R * c, 2)

def text_similarity(text1: str, text2: str) -> float:
    """
    Computes token-based Jaccard similarity between two report descriptions.
    """
    def tokenize(s: str) -> set:
        stopwords = {"the", "a", "an", "in", "on", "at", "of", "and", "is", "near", "front", "road", "street"}
        words = s.lower().replace(",", " ").replace(".", " ").replace("-", " ").split()
        return {w for w in words if len(w) > 2 and w not in stopwords}

    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)

    if not tokens1 or not tokens2:
        return 0.0

    intersection = len(tokens1.intersection(tokens2))
    union = len(tokens1.union(tokens2))
    return round(intersection / union, 3)

def find_duplicate_candidates(
    category: str,
    lat: float,
    lng: float,
    description: str,
    existing_cases: List[Dict[str, Any]],
    distance_threshold_m: float = 120.0
) -> List[Dict[str, Any]]:
    """
    Identifies existing active repair cases that likely represent the same physical issue.
    Returns sorted candidate list with confidence score and explainable reasons.
    """
    candidates = []

    for case in existing_cases:
        # Only check cases in non-closed states
        if case.get("status") in ("VERIFIED_CLOSED", "DUPLICATE_MERGED"):
            continue

        case_lat = float(case["latitude"])
        case_lng = float(case["longitude"])
        dist_m = haversine_distance(lat, lng, case_lat, case_lng)

        if dist_m > distance_threshold_m:
            continue

        category_match = (case["category"].upper() == category.upper())
        sim_score = text_similarity(description, case.get("description", ""))

        # Calculate duplicate probability
        # 1. Distance score (100% at 0m, 0% at threshold)
        dist_score = max(0.0, (1.0 - (dist_m / distance_threshold_m))) * 50.0

        # 2. Category matching score
        cat_score = 30.0 if category_match else 0.0

        # 3. Description similarity score
        desc_score = sim_score * 20.0

        total_confidence = round(dist_score + cat_score + desc_score, 1)

        reasons = []
        reasons.append(f"Located {dist_m} meters away (within {distance_threshold_m}m proximity threshold)")
        if category_match:
            reasons.append(f"Identical issue category '{category}'")
        else:
            reasons.append(f"Different category '{case['category']}' vs '{category}'")
        if sim_score >= 0.25:
            reasons.append(f"High description similarity ({int(sim_score * 100)}% token overlap)")

        if total_confidence >= 45.0:
            candidates.append({
                "case_id": case["case_id"],
                "case_number": case["case_number"],
                "title": case["title"],
                "category": case["category"],
                "severity": case["severity"],
                "status": case["status"],
                "latitude": case_lat,
                "longitude": case_lng,
                "distance_meters": dist_m,
                "text_similarity_score": sim_score,
                "duplicate_confidence_pct": min(99.0, total_confidence),
                "reasons": reasons
            })

    # Sort descending by duplicate confidence
    candidates.sort(key=lambda x: x["duplicate_confidence_pct"], reverse=True)
    return candidates
