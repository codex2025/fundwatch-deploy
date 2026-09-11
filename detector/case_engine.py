"""Live Mode case-generation engine.

Scans the already-computed anomaly panel for agencies whose risk score
indicates High Suspicion or Critical Red Flag (per risk_score.py's own
classification matrix, >= 70) and turns each one into a `Case`: a
tracked accountability record with an auto-drafted, fully-grounded
"explanation required" notice.

This module never sends anything and never accuses anyone of fraud —
it only detects a deviation from the agency's own historical baseline
and drafts the notice text. A human (Admin) must approve before the
case status advances past "notice_drafted".

Pure stdlib — no pandas/numpy dependency, so this can run standalone
against the pre-computed JSON outputs of the detector pipeline.
"""
import json
import shutil
import tempfile
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
PROCESSED = BASE_DIR / "data" / "processed"
ANOMALIES_PATH = PROCESSED / "anomalies.json"
SCORED_PANEL_PATH = PROCESSED / "scored_panel.json"

_active_dir = None


def _processed_dir() -> Path:
    """Writable directory for cases.json. Falls back to a temp directory
    (seeded from the bundled file) when PROCESSED is read-only, e.g. on a
    serverless deployment. Mirrors backend/case_store.py's fallback so both
    modules agree on the same location within a process."""
    global _active_dir
    if _active_dir is not None:
        return _active_dir
    try:
        PROCESSED.mkdir(parents=True, exist_ok=True)
        probe = PROCESSED / ".write_test"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        _active_dir = PROCESSED
    except OSError:
        fallback = Path(tempfile.gettempdir()) / "fundwatch_processed"
        fallback.mkdir(parents=True, exist_ok=True)
        src, dst = PROCESSED / "cases.json", fallback / "cases.json"
        if src.exists() and not dst.exists():
            shutil.copy(src, dst)
        _active_dir = fallback
    return _active_dir


def _cases_path() -> Path:
    return _processed_dir() / "cases.json"

RISK_SCORE_TRIGGER = 70.0  # High Suspicion / Critical Red Flag threshold
RESPONSE_WINDOW_DAYS = 7

BASELINE_LABELS = {
    "modified_z_score": "Historical cost distribution (Modified Z-Score / MAD)",
    "modified_z": "Historical cost distribution (Modified Z-Score / MAD)",
    "iqr_ratio": "Distribution spread relative to this agency's own IQR fence",
    "velocity_ratio": "Historical monthly spending velocity",
    "peer_ratio": "Spending relative to comparable peer agencies",
}

TRIGGER_REASONS = {
    "modified_z_score": "cost_outlier",
    "modified_z": "cost_outlier",
    "iqr_ratio": "distribution_outlier",
    "velocity_ratio": "velocity_spike",
    "peer_ratio": "peer_deviation",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _load_json(path: Path):
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _risk_band(score: float) -> str:
    if score >= 86:
        return "Critical Red Flag"
    if score >= 70:
        return "High Suspicion"
    if score >= 40:
        return "Moderate Risk"
    return "Low Risk / Normal"


def render_notice(agency_name, agency_id, new_risk_score, trigger_reason_label,
                   velocity_ratio, historical_median, monthly_amount,
                   anomaly_count, top_category, deadline_iso, detected_date):
    velocity_line = ""
    if velocity_ratio:
        pct = round((velocity_ratio - 1) * 100)
        velocity_line = f"- Spending velocity changed by {pct:+d}% relative to this agency's own baseline\n"

    return (
        "FUNDWATCH -- EXPLANATION REQUEST\n\n"
        f"To: {agency_name}\n"
        f"Agency ID: {agency_id}\n"
        f"Risk Score: {new_risk_score:.0f} -- {_risk_band(new_risk_score)}\n"
        f"Date: {detected_date}\n\n"
        "Subject: Request for explanation regarding unusual expenditure pattern\n\n"
        "FundWatch has identified a deviation from this agency's established spending baseline.\n\n"
        "Detected observations:\n"
        f"{velocity_line}"
        f"- Historical monthly baseline: Rs {historical_median:,.0f}\n"
        f"- Current monthly expenditure: Rs {monthly_amount:,.0f}\n"
        f"- {anomaly_count} work(s) contributed to this month's disbursement\n"
        f"- Category most affected: {top_category}\n"
        f"- Baseline violated: {trigger_reason_label}\n\n"
        "Clarification requested: Please provide an explanation and supporting "
        "documentation for the above expenditure pattern.\n\n"
        f"Response deadline: {deadline_iso[:10]}\n\n"
        "This notice reflects a statistical deviation only. It is not a finding "
        "of wrongdoing."
    )


def _next_case_id(existing_cases):
    max_n = 1000
    for c in existing_cases:
        try:
            n = int(str(c["case_id"]).split("-")[-1])
            max_n = max(max_n, n)
        except (ValueError, KeyError):
            continue
    return f"CL-{max_n + 1}"


def build_case(agency_rows, prior_risk_score, existing_cases, work_category=None):
    """agency_rows: this agency's anomalies.json rows, sorted by year_month asc."""
    peak = max(agency_rows, key=lambda r: r.get("risk_score") or 0)
    new_risk = float(peak.get("risk_score") or 0)
    top_signal = peak.get("top_signal") or "modified_z_score"
    baseline_label = BASELINE_LABELS.get(top_signal, "Historical spending baseline")
    reason = TRIGGER_REASONS.get(top_signal, "cost_outlier")

    detected_at = _now_iso()
    deadline = (datetime.now(timezone.utc) + timedelta(days=RESPONSE_WINDOW_DAYS)).replace(microsecond=0).isoformat()
    works = peak.get("top_contributing_works") or []
    top_category = work_category or peak.get("work_category") or "General"

    notice_text = render_notice(
        agency_name=peak["agency_name"],
        agency_id=peak["agency_id"],
        new_risk_score=new_risk,
        trigger_reason_label=baseline_label,
        velocity_ratio=peak.get("velocity_ratio"),
        historical_median=float(peak.get("historical_median_monthly") or 0),
        monthly_amount=float(peak.get("monthly_amount") or 0),
        anomaly_count=max(len(works), 1),
        top_category=top_category,
        deadline_iso=deadline,
        detected_date=detected_at[:10],
    )

    return {
        "case_id": _next_case_id(existing_cases),
        "agency_id": peak["agency_id"],
        "agency_name": peak["agency_name"],
        "state": peak.get("state"),
        "status": "notice_drafted",
        "created_at": detected_at,
        "updated_at": detected_at,
        "trigger": {
            "reason": reason,
            "top_signal": top_signal,
            "previous_risk_score": prior_risk_score,
            "new_risk_score": new_risk,
            "risk_delta": round(new_risk - (prior_risk_score or 0), 1),
            "baseline_violated": baseline_label,
            "year_month": peak.get("year_month"),
            "detected_at": detected_at,
        },
        "notice": {
            "draft_text": notice_text,
            "status": "draft",
            "edited_by_admin": False,
            "sent_at": None,
            "deadline": deadline,
        },
        "agency_response": {"text": None, "documents": [], "submitted_at": None},
        "mp_verification": {"status": "pending", "verified_by": None, "verified_at": None, "notes": None},
        "resolution": {"outcome": None, "resolved_by": None, "resolved_at": None, "notes": None},
    }


def generate_cases(save: bool = True):
    """Scan anomalies.json for agencies at/above the High Suspicion threshold
    and create a Case for any that don't already have one. Idempotent."""
    anomalies = _load_json(ANOMALIES_PATH)
    panel = _load_json(SCORED_PANEL_PATH)
    existing_cases = _load_json(_cases_path())
    existing_agency_ids = {c["agency_id"] for c in existing_cases}

    by_agency = defaultdict(list)
    for row in anomalies:
        if row.get("insufficient_history"):
            continue
        by_agency[row["agency_id"]].append(row)

    panel_by_agency = defaultdict(list)
    for row in panel:
        panel_by_agency[row["agency_id"]].append(row)

    new_cases = []
    for agency_id, rows in by_agency.items():
        if agency_id in existing_agency_ids:
            continue
        rows_sorted = sorted(rows, key=lambda r: r["year_month"])
        peak = max(rows_sorted, key=lambda r: r.get("risk_score") or 0)
        if (peak.get("risk_score") or 0) < RISK_SCORE_TRIGGER:
            continue

        # Find the risk_score of the month immediately before the peak month
        # (searching the full panel, which includes cold-start rows) so the
        # notice can narrate a "jumped from X to Y" delta when one exists.
        all_months = sorted(panel_by_agency.get(agency_id, []), key=lambda r: r["year_month"])
        prior_risk_score = 0.0
        peak_work_category = None
        for i, m in enumerate(all_months):
            if m["year_month"] == peak["year_month"]:
                peak_work_category = m.get("work_category")
                if i > 0:
                    prior_risk_score = float(all_months[i - 1].get("risk_score") or 0)
                break

        case = build_case(rows_sorted, prior_risk_score, existing_cases + new_cases, peak_work_category)
        new_cases.append(case)

    if save and new_cases:
        all_cases = existing_cases + new_cases
        path = _cases_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(all_cases, f, indent=2)

    return new_cases


if __name__ == "__main__":
    created = generate_cases()
    print(f"Generated {len(created)} new case(s).")
    for c in created:
        print(f"  {c['case_id']}  {c['agency_name']}  risk={c['trigger']['new_risk_score']}")
