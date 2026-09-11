"""Public Transparency Layer.

Deliberately the narrowest surface in the whole API: totals, and a
plain-language status per flagged agency. No risk scores, no notice
text, no evidence, no agency responses -- a citizen sees that spending
is "Under Review", never a number or an accusation.
"""
from fastapi import APIRouter, Depends

import case_store
from auth import CurrentUser, get_current_user
from db import get_store, safe

router = APIRouter(tags=["public"])

STATUS_LABELS = {
    "notice_drafted": "Under Review",
    "sent": "Under Review",
    "response_received": "Under Review",
    "mp_verified": "Under Review",
    "monitoring": "Under Review",
    "escalated": "Under Further Investigation",
    "resolved": "Reviewed -- No Further Action",
}


@router.get("/public/summary")
@router.get("/api/public/summary")
def public_summary(user: CurrentUser = Depends(get_current_user)):
    store = get_store()
    cases = case_store.load_cases()

    total_agencies = int(store.scored_panel["agency_id"].nunique()) if not store.scored_panel.empty else 0
    total_disbursed = float(store.scored_panel["monthly_amount"].sum()) if not store.scored_panel.empty else 0.0
    total_works = len(store.works) if not store.works.empty else 0
    states = list(store.scored_panel["state"].unique()) if not store.scored_panel.empty else []

    flagged = []
    for c in cases:
        outcome = c["resolution"].get("outcome")
        if outcome == "dismissed":
            label = "Reviewed -- No Further Action"
        else:
            label = STATUS_LABELS.get(c["status"], "Under Review")
        flagged.append({
            "agency_name": c["agency_name"],
            "state": c.get("state"),
            "status": label,
        })

    return {
        "total_disbursed_inr": safe(total_disbursed),
        "total_works": total_works,
        "total_agencies": total_agencies,
        "states_covered": states,
        "flagged_agencies": flagged,
    }
