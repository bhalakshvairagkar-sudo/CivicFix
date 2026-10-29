from fastapi import APIRouter, Query, Depends
from typing import Optional
import json

from database import get_db_cursor
from security import require_admin

router = APIRouter(prefix="/api/audit-logs", tags=["Immutable Audit Trail"])

@router.get("")
def list_audit_logs(
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = Query(default=100, ge=10, le=500),
    current_user: dict = Depends(require_admin)
):
    """
    Retrieves immutable audit trail records with actor name, state transition diffs, and timestamps.
    """
    query = """
        SELECT 
            log_id, action_type, entity_type, entity_id,
            performed_by_user_id, actor_name, old_state, new_state,
            change_summary, ip_address, created_at
        FROM audit_logs
        WHERE 1=1
    """
    params = []

    if action_type:
        query += " AND action_type = %s"
        params.append(action_type)
    if entity_type:
        query += " AND entity_type = %s"
        params.append(entity_type)

    query += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)

    with get_db_cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()

    for r in rows:
        if isinstance(r.get("old_state"), str):
            try:
                r["old_state"] = json.loads(r["old_state"])
            except Exception:
                pass
        if isinstance(r.get("new_state"), str):
            try:
                r["new_state"] = json.loads(r["new_state"])
            except Exception:
                pass

    return rows
