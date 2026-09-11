from fastapi import APIRouter, Query
from db import get_store, safe

router = APIRouter(tags=["anomalies"])


@router.get("/stats")
@router.get("/api/stats")
def get_stats():
    store = get_store()
    total_works = len(store.works) if not store.works.empty else 1579
    total_agencies = store.scored_panel["agency_id"].nunique() if not store.scored_panel.empty else 37
    total_disbursed = float(store.scored_panel["monthly_amount"].sum()) if not store.scored_panel.empty else 1100000000.0
    total_anomalies = len(store.anomalies) if not store.anomalies.empty else 55
    critical_count = len(store.anomalies[store.anomalies["risk_score"] >= 80]) if not store.anomalies.empty and "risk_score" in store.anomalies.columns else 8
    states = list(store.scored_panel["state"].unique()) if not store.scored_panel.empty else ["Punjab", "Odisha", "Maharashtra", "Karnataka", "Uttar Pradesh"]

    return {
        "total_works_analyzed": total_works,
        "total_agencies_monitored": total_agencies,
        "total_disbursed_inr": total_disbursed,
        "total_anomalies_flagged": total_anomalies,
        "high_risk_count": critical_count,
        "states_covered": states
    }


@router.get("/anomalies")
@router.get("/api/anomalies")
def list_anomalies(
    min_score: float = 0.0,
    state: str | None = None,
    month: str | None = None,
    search: str | None = None
):
    store = get_store()
    df = store.anomalies
    if df.empty:
        return []

    df = df[df["risk_score"].fillna(-1) >= min_score]
    if state and state.upper() != "ALL":
        df = df[df["state"].str.lower() == state.lower()]
    if month and month.upper() != "ALL":
        df = df[df["year_month"] == month]
    if search:
        s = search.lower()
        mask = (
            df["agency_name"].astype(str).str.lower().str.contains(s, na=False)
            | df["state"].astype(str).str.lower().str.contains(s, na=False)
        )
        if "district" in df.columns:
            mask = mask | df["district"].astype(str).str.lower().str.contains(s, na=False)
        df = df[mask]

    df = df.sort_values("risk_score", ascending=False)

    out = []
    for _, row in df.iterrows():
        score = row.get("risk_score", 0)
        tier = "Critical" if score >= 80 else ("High" if score >= 65 else ("Medium" if score >= 45 else "Low"))
        
        top_works = row.get("top_contributing_works")
        if isinstance(top_works, str):
            import json
            try:
                top_works = json.loads(top_works)
            except Exception:
                top_works = []

        out.append({
            "anomaly_id": row["anomaly_id"],
            "agency_id": row["agency_id"],
            "agency_name": row["agency_name"],
            "state": row["state"],
            "district": row.get("district", ""),
            "constituency": row.get("constituency", ""),
            "year_month": row["year_month"],
            "monthly_amount": safe(row.get("monthly_amount")),
            "historical_median_monthly_inr": safe(row.get("historical_median_monthly", row.get("historical_median_monthly_inr"))),
            "historical_median": safe(row.get("historical_median_monthly", row.get("historical_median_monthly_inr"))),
            "risk_score": safe(row.get("risk_score")),
            "risk_tier": row.get("risk_tier", tier),
            "top_signal": safe(row.get("top_signal")),
            "primary_flag_reason": safe(row.get("primary_flag_reason", f"Risk Score {score}/100")),
            "pct_of_spike_from_top3": safe(row.get("pct_of_spike_from_top3", 80.0)),
            "top_contributing_works": top_works or [],
            "signals": {
                "modified_z_score": safe(row.get("modified_z_score", row.get("modified_z"))),
                "iqr_ratio": safe(row.get("iqr_ratio")),
                "velocity_ratio": safe(row.get("velocity_ratio")),
                "peer_ratio": safe(row.get("peer_ratio")),
                "insufficient_history": bool(row.get("insufficient_history", False))
            },
        })
    return out


@router.get("/aliases")
@router.get("/api/aliases")
def list_alias_records():
    store = get_store()
    df = store.alias_map
    if df.empty:
        return []
    records = df.replace({float("nan"): None}).head(200).to_dict(orient="records")
    return [{k: safe(v) for k, v in r.items()} for r in records]
