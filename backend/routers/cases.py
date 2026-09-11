import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import case_store
from auth import CurrentUser, require_roles
from db import get_store, safe

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "detector"))
from case_engine import generate_cases  # noqa: E402

router = APIRouter(tags=["cases"])

TERMINAL_STATUSES = {"resolved", "escalated", "monitoring"}


class NoticeAction(BaseModel):
    action: str  # approve | reject | edit
    text: str | None = None


class AgencyResponse(BaseModel):
    text: str
    documents: list[str] = []


class MPVerification(BaseModel):
    status: str  # verified | not_verified | needs_clarification
    notes: str | None = None


class Resolution(BaseModel):
    outcome: str  # resolved | escalated | monitoring
    notes: str | None = None


def _actor_id(user: CurrentUser) -> str:
    return user.email or user.uid


def _assert_case_in_scope(case: dict, user: CurrentUser) -> None:
    """Agencies and MPs may only touch cases inside their own scope."""
    if user.role == "agency" and case["agency_id"] != user.agency_id:
        raise HTTPException(status_code=403, detail="This case does not belong to your agency")
    if user.role == "mp" and case["state"] != user.state:
        raise HTTPException(status_code=403, detail="This case is outside your constituency's state")


def _scope_cases(cases: list[dict], user: CurrentUser) -> list[dict]:
    if user.role == "agency":
        return [c for c in cases if c["agency_id"] == user.agency_id]
    if user.role == "mp":
        return [c for c in cases if c["state"] == user.state]
    return cases


def _is_overdue(case: dict) -> bool:
    if case["status"] in TERMINAL_STATUSES:
        return False
    if case["agency_response"]["submitted_at"]:
        return False
    deadline = case["notice"].get("deadline")
    if not deadline:
        return False
    return datetime.now(timezone.utc) > datetime.fromisoformat(deadline)


def _with_computed(case: dict) -> dict:
    out = dict(case)
    out["is_overdue"] = _is_overdue(case)
    return out


@router.get("/cases")
@router.get("/api/cases")
def list_cases(status: str | None = None, user: CurrentUser = Depends(require_roles("admin", "mp", "agency"))):
    cases = case_store.load_cases()
    if status and status.upper() != "ALL":
        cases = [c for c in cases if c["status"] == status]
    cases = _scope_cases(cases, user)
    cases = sorted(cases, key=lambda c: c["trigger"]["new_risk_score"], reverse=True)
    return [_with_computed(c) for c in cases]


@router.get("/cases/{case_id}")
@router.get("/api/cases/{case_id}")
def get_case(case_id: str, user: CurrentUser = Depends(require_roles("admin", "mp", "agency"))):
    case = case_store.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Unknown case_id '{case_id}'")
    _assert_case_in_scope(case, user)
    return _with_computed(case)


@router.post("/cases/generate")
@router.post("/api/cases/generate")
def trigger_case_generation(user: CurrentUser = Depends(require_roles("admin"))):
    new_cases = generate_cases()
    for c in new_cases:
        case_store.write_audit(
            actor_role="system",
            actor_id="risk-engine",
            action="case_auto_detected",
            case_id=c["case_id"],
            detail=(
                f"Risk score reached {c['trigger']['new_risk_score']:.0f} "
                f"(baseline violated: {c['trigger']['baseline_violated']}). "
                "Clarification notice drafted automatically."
            ),
        )
    return {"created": len(new_cases), "case_ids": [c["case_id"] for c in new_cases]}


@router.patch("/cases/{case_id}/notice")
@router.patch("/api/cases/{case_id}/notice")
def act_on_notice(case_id: str, body: NoticeAction, user: CurrentUser = Depends(require_roles("admin"))):
    if body.action not in ("approve", "reject", "edit"):
        raise HTTPException(status_code=400, detail="action must be approve, reject, or edit")

    actor_id = _actor_id(user)

    def mutate(c):
        if body.action == "edit":
            if not body.text:
                raise HTTPException(status_code=400, detail="text is required to edit the notice")
            c["notice"]["draft_text"] = body.text
            c["notice"]["edited_by_admin"] = True
        elif body.action == "approve":
            c["notice"]["status"] = "approved"
            c["notice"]["sent_at"] = case_store.now_iso()
            c["status"] = "sent"
        elif body.action == "reject":
            c["notice"]["status"] = "rejected"
            c["status"] = "resolved"
            c["resolution"]["outcome"] = "dismissed"
            c["resolution"]["resolved_by"] = actor_id
            c["resolution"]["resolved_at"] = case_store.now_iso()
            c["resolution"]["notes"] = "Notice rejected by admin prior to sending -- not pursued."

    case = case_store.update_case(case_id, mutate)
    if not case:
        raise HTTPException(status_code=404, detail=f"Unknown case_id '{case_id}'")

    detail = {
        "edit": "Admin edited the draft notice",
        "approve": "Notice approved and sent" + (" (edited before sending)" if case["notice"]["edited_by_admin"] else ""),
        "reject": "Admin rejected the draft -- case dismissed without contacting agency",
    }[body.action]
    action_name = {"edit": "edited_notice", "approve": "approved_notice", "reject": "rejected_notice"}[body.action]
    case_store.write_audit("admin", actor_id, action_name, case_id, detail)
    return _with_computed(case)


@router.patch("/cases/{case_id}/response")
@router.patch("/api/cases/{case_id}/response")
def submit_agency_response(case_id: str, body: AgencyResponse, user: CurrentUser = Depends(require_roles("agency"))):
    existing = case_store.get_case(case_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Unknown case_id '{case_id}'")
    _assert_case_in_scope(existing, user)

    def mutate(c):
        c["agency_response"]["text"] = body.text
        c["agency_response"]["documents"] = body.documents
        c["agency_response"]["submitted_at"] = case_store.now_iso()
        if c["status"] == "sent":
            c["status"] = "response_received"

    case = case_store.update_case(case_id, mutate)

    case_store.write_audit(
        "agency", _actor_id(user), "submitted_explanation", case_id,
        f"Agency submitted an explanation with {len(body.documents)} supporting document(s)."
    )
    return _with_computed(case)


@router.patch("/cases/{case_id}/verify")
@router.patch("/api/cases/{case_id}/verify")
def submit_mp_verification(case_id: str, body: MPVerification, user: CurrentUser = Depends(require_roles("mp"))):
    if body.status not in ("verified", "not_verified", "needs_clarification"):
        raise HTTPException(status_code=400, detail="status must be verified, not_verified, or needs_clarification")

    existing = case_store.get_case(case_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Unknown case_id '{case_id}'")
    _assert_case_in_scope(existing, user)

    actor_id = _actor_id(user)

    def mutate(c):
        c["mp_verification"]["status"] = body.status
        c["mp_verification"]["verified_by"] = actor_id
        c["mp_verification"]["verified_at"] = case_store.now_iso()
        c["mp_verification"]["notes"] = body.notes
        if c["status"] not in TERMINAL_STATUSES:
            c["status"] = "mp_verified"

    case = case_store.update_case(case_id, mutate)

    case_store.write_audit(
        "mp", actor_id, "verified_work", case_id,
        f"MP marked underlying work as '{body.status}'" + (f" -- {body.notes}" if body.notes else "")
    )
    return _with_computed(case)


@router.patch("/cases/{case_id}/resolve")
@router.patch("/api/cases/{case_id}/resolve")
def resolve_case(case_id: str, body: Resolution, user: CurrentUser = Depends(require_roles("admin"))):
    if body.outcome not in ("resolved", "escalated", "monitoring"):
        raise HTTPException(status_code=400, detail="outcome must be resolved, escalated, or monitoring")

    actor_id = _actor_id(user)

    def mutate(c):
        c["resolution"]["outcome"] = body.outcome
        c["resolution"]["notes"] = body.notes
        c["resolution"]["resolved_by"] = actor_id
        c["resolution"]["resolved_at"] = case_store.now_iso()
        c["status"] = body.outcome

    case = case_store.update_case(case_id, mutate)
    if not case:
        raise HTTPException(status_code=404, detail=f"Unknown case_id '{case_id}'")

    case_store.write_audit(
        "admin", actor_id, f"case_{body.outcome}", case_id,
        body.notes or f"Admin marked case as {body.outcome}."
    )
    return _with_computed(case)


@router.get("/compliance")
@router.get("/api/compliance")
def get_compliance(user: CurrentUser = Depends(require_roles("admin"))):
    store = get_store()
    cases = case_store.load_cases()
    cases_by_agency = defaultdict(list)
    for c in cases:
        cases_by_agency[c["agency_id"]].append(c)

    if not store.scored_panel.empty:
        agency_rows = (
            store.scored_panel.sort_values("year_month")
            .groupby("agency_id")
            .tail(1)[["agency_id", "agency_name", "state"]]
            .to_dict(orient="records")
        )
    else:
        agency_rows = [{"agency_id": aid, "agency_name": cs[0]["agency_name"], "state": cs[0].get("state")}
                       for aid, cs in cases_by_agency.items()]

    known_ids = {r["agency_id"] for r in agency_rows}
    for aid, cs in cases_by_agency.items():
        if aid not in known_ids:
            agency_rows.append({"agency_id": aid, "agency_name": cs[0]["agency_name"], "state": cs[0].get("state")})

    out = []
    for row in agency_rows:
        aid = row["agency_id"]
        agency_cases = cases_by_agency.get(aid, [])
        if not agency_cases:
            out.append({
                "agency_id": aid,
                "agency_name": row["agency_name"],
                "state": safe(row.get("state")),
                "compliance_score": 100,
                "open_cases": 0,
                "overdue": False,
                "mp_verified": None,
                "documents_submitted": None,
                "escalated": False,
            })
            continue

        latest = max(agency_cases, key=lambda c: c["created_at"])
        overdue = _is_overdue(latest)
        mp_verified = latest["mp_verification"]["status"] == "verified"
        docs_present = bool(latest["agency_response"]["documents"])
        escalated = latest["status"] == "escalated"

        score = (0 if overdue else 40) + (30 if mp_verified else 0) + (15 if docs_present else 0) + (0 if escalated else 15)

        out.append({
            "agency_id": aid,
            "agency_name": row["agency_name"],
            "state": safe(row.get("state")),
            "compliance_score": score,
            "open_cases": sum(1 for c in agency_cases if c["status"] not in TERMINAL_STATUSES),
            "overdue": overdue,
            "mp_verified": mp_verified,
            "documents_submitted": docs_present,
            "escalated": escalated,
        })

    out.sort(key=lambda r: r["compliance_score"])
    return out


@router.get("/governance")
@router.get("/api/governance")
def get_governance(user: CurrentUser = Depends(require_roles("admin"))):
    store = get_store()
    cases = case_store.load_cases()

    total_agencies = int(store.scored_panel["agency_id"].nunique()) if not store.scored_panel.empty else 0
    total_disbursed = float(store.scored_panel["monthly_amount"].sum()) if not store.scored_panel.empty else 0.0
    total_works = len(store.works) if not store.works.empty else 0

    total_cases = len(cases)
    resolved = [c for c in cases if c["status"] == "resolved"]
    escalated = [c for c in cases if c["status"] == "escalated"]
    monitoring = [c for c in cases if c["status"] == "monitoring"]
    active = [c for c in cases if c["status"] not in TERMINAL_STATUSES]
    overdue = [c for c in cases if _is_overdue(c)]
    mp_verified = [c for c in cases if c["mp_verification"]["status"] == "verified"]

    resolution_days = []
    for c in resolved:
        try:
            created = datetime.fromisoformat(c["created_at"])
            done = datetime.fromisoformat(c["resolution"]["resolved_at"])
            resolution_days.append((done - created).total_seconds() / 86400)
        except (TypeError, ValueError):
            continue
    avg_resolution_days = round(sum(resolution_days) / len(resolution_days), 1) if resolution_days else None

    return {
        "total_disbursed_inr": safe(total_disbursed),
        "total_works_monitored": total_works,
        "total_agencies_monitored": total_agencies,
        "total_cases": total_cases,
        "active_investigations": len(active),
        "resolved_count": len(resolved),
        "escalated_count": len(escalated),
        "monitoring_count": len(monitoring),
        "overdue_count": len(overdue),
        "mp_verification_rate": round(100 * len(mp_verified) / total_cases, 1) if total_cases else None,
        "resolution_rate": round(100 * len(resolved) / total_cases, 1) if total_cases else None,
        "avg_resolution_days": avg_resolution_days,
    }
