from fastapi import APIRouter, Depends

import case_store
from auth import CurrentUser, require_roles

router = APIRouter(tags=["audit"])


@router.get("/audit")
@router.get("/api/audit")
def list_audit(case_id: str | None = None, user: CurrentUser = Depends(require_roles("admin"))):
    entries = case_store.load_audit(case_id)
    return sorted(entries, key=lambda e: e["timestamp"])
