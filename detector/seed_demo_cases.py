"""One-time demo seeding: walks a few of the auto-generated cases through
different points in the workflow so the Live Mode demo shows the full
range of states (fresh queue item, sent + overdue, full resolved loop,
escalated) instead of everything sitting at "notice_drafted".

Safe to re-run: it only acts on cases still at their initial
"notice_drafted" status, so it won't re-seed a case you've already
touched by hand while clicking through the UI.

Run once, after `case_engine.py` has generated cases.json:
    python detector/seed_demo_cases.py
"""
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
PROCESSED = BASE_DIR / "data" / "processed"
CASES_PATH = PROCESSED / "cases.json"
AUDIT_PATH = PROCESSED / "audit_log.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load(path):
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def audit(entries, actor_role, actor_id, action, case_id, detail):
    entries.append({
        "timestamp": now_iso(),
        "actor_role": actor_role,
        "actor_id": actor_id,
        "action": action,
        "case_id": case_id,
        "detail": detail,
    })


def main():
    cases = load(CASES_PATH)
    entries = load(AUDIT_PATH)
    by_id = {c["case_id"]: c for c in cases}

    def touchable(case_id):
        c = by_id.get(case_id)
        return c is not None and c["status"] == "notice_drafted"

    # 1. Headline case: full loop, end to end, ending Resolved.
    cid = "CL-1001"
    if touchable(cid):
        c = by_id[cid]
        c["notice"]["status"] = "approved"
        c["notice"]["sent_at"] = now_iso()
        c["status"] = "sent"
        audit(entries, "admin", "admin-1", "approved_notice", cid, "Notice approved and sent without edits")

        c["agency_response"]["text"] = (
            "Three drainage and street-lighting works reached financial completion in the same "
            "reporting month, which is why disbursement is concentrated here. Completion "
            "certificates and geo-tagged photographs are attached."
        )
        c["agency_response"]["documents"] = ["completion_certificate.pdf", "geo_tagged_photos.zip", "measurement_book.pdf"]
        c["agency_response"]["submitted_at"] = now_iso()
        c["status"] = "response_received"
        audit(entries, "agency", c["agency_id"], "submitted_explanation", cid,
              "Agency submitted an explanation with 3 supporting document(s).")

        c["mp_verification"]["status"] = "verified"
        c["mp_verification"]["verified_by"] = "mp-1"
        c["mp_verification"]["verified_at"] = now_iso()
        c["mp_verification"]["notes"] = "Site visit confirmed all three works are physically complete."
        c["status"] = "mp_verified"
        audit(entries, "mp", "mp-1", "verified_work", cid, "MP marked underlying work as 'verified' -- Site visit confirmed all three works are physically complete.")

        c["resolution"]["outcome"] = "resolved"
        c["resolution"]["notes"] = "Explanation and MP verification are consistent with the observed spending pattern. Closing case."
        c["resolution"]["resolved_by"] = "admin-1"
        c["resolution"]["resolved_at"] = now_iso()
        c["status"] = "resolved"
        audit(entries, "admin", "admin-1", "case_resolved", cid, c["resolution"]["notes"])

    # 2. Overdue case: notice sent, deadline artificially in the past, no response yet.
    cid = "CL-1002"
    if touchable(cid):
        c = by_id[cid]
        c["notice"]["status"] = "approved"
        c["notice"]["sent_at"] = (datetime.now(timezone.utc) - timedelta(days=10)).replace(microsecond=0).isoformat()
        c["notice"]["deadline"] = (datetime.now(timezone.utc) - timedelta(days=3)).replace(microsecond=0).isoformat()
        c["status"] = "sent"
        audit(entries, "admin", "admin-1", "approved_notice", cid, "Notice approved and sent without edits")

    # 3. Escalated case: agency responded, but admin was not satisfied.
    cid = "CL-1004"
    if touchable(cid):
        c = by_id[cid]
        c["notice"]["status"] = "approved"
        c["notice"]["sent_at"] = now_iso()
        c["status"] = "sent"
        audit(entries, "admin", "admin-1", "approved_notice", cid, "Notice approved and sent without edits")

        c["agency_response"]["text"] = "Spending reflects routine year-end sanctions across multiple ongoing works."
        c["agency_response"]["documents"] = []
        c["agency_response"]["submitted_at"] = now_iso()
        c["status"] = "response_received"
        audit(entries, "agency", c["agency_id"], "submitted_explanation", cid,
              "Agency submitted an explanation with 0 supporting document(s).")

        c["resolution"]["outcome"] = "escalated"
        c["resolution"]["notes"] = "Explanation lacks supporting documentation for a spike of this size. Escalating for a physical audit."
        c["resolution"]["resolved_by"] = "admin-1"
        c["resolution"]["resolved_at"] = now_iso()
        c["status"] = "escalated"
        audit(entries, "admin", "admin-1", "case_escalated", cid, c["resolution"]["notes"])

    # CL-1003, CL-1005, CL-1006, CL-1007 are left untouched at "notice_drafted"
    # so the Admin queue always has fresh cases waiting for approval.

    save(CASES_PATH, cases)
    save(AUDIT_PATH, entries)
    print("Demo seeding complete.")
    for c in cases:
        print(f"  {c['case_id']:8s} {c['agency_name']:35s} status={c['status']}")


if __name__ == "__main__":
    main()
