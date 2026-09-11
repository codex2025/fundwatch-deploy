from fastapi import APIRouter, HTTPException, Query
from db import get_store, safe
import pandas as pd

router = APIRouter(tags=["agencies"])


@router.get("/agencies")
@router.get("/api/agencies")
def list_agencies(state: str | None = None, min_score: float = 0.0):
    store = get_store()
    panel = store.scored_panel
    if panel.empty:
        return []

    latest_idx = panel.sort_values("year_month").groupby("agency_id").tail(1)
    if state and state.upper() != "ALL":
        latest_idx = latest_idx[latest_idx["state"].str.lower() == state.lower()]

    scored = latest_idx[latest_idx["risk_score"].fillna(-1) >= min_score]

    out = []
    for _, row in scored.iterrows():
        total_spend = panel[panel["agency_id"] == row["agency_id"]]["monthly_amount"].sum()
        active_mos = len(panel[panel["agency_id"] == row["agency_id"]])
        out.append({
            "agency_id": row["agency_id"],
            "agency_name": row["agency_name"],
            "state": row["state"],
            "district": row.get("district", ""),
            "constituency": row.get("constituency", ""),
            "total_spend": safe(total_spend),
            "active_months": active_mos,
            "latest_risk_score": safe(row["risk_score"]),
            "latest_month": row["year_month"],
            "insufficient_history": bool(row.get("insufficient_history", False)),
            "has_anomalies": bool(row.get("risk_score", 0) >= 40.0)
        })
    out.sort(key=lambda r: (r["latest_risk_score"] is None, -(r["latest_risk_score"] or 0)))
    return out


@router.get("/agencies/{agency_id}")
@router.get("/api/agencies/{agency_id}")
def get_agency(agency_id: str):
    store = get_store()
    panel = store.scored_panel
    if panel.empty:
        raise HTTPException(status_code=404, detail="Store is empty")

    rows = panel[panel["agency_id"] == agency_id].sort_values("year_month")
    if rows.empty:
        raise HTTPException(status_code=404, detail=f"Unknown agency_id '{agency_id}'")

    first = rows.iloc[0]
    months = []
    for _, row in rows.iterrows():
        is_flg = bool(row.get("risk_score", 0) >= 40.0 or row.get("modified_z", 0) >= 3.5 or row.get("velocity_ratio", 1.0) >= 3.0)
        months.append({
            "year_month": row["year_month"],
            "monthly_amount": safe(row.get("monthly_amount")),
            "cumulative_amount": safe(row.get("cumulative_amount")),
            "risk_score": safe(row.get("risk_score")),
            "insufficient_history": bool(row.get("insufficient_history", False)),
            "historical_median": safe(row.get("historical_median_monthly")),
            "historical_median_monthly": safe(row.get("historical_median_monthly")),
            "iqr_upper_fence": safe(row.get("iqr_upper_fence")),
            "modified_z_score": safe(row.get("modified_z")),
            "velocity_ratio": safe(row.get("velocity_ratio")),
            "work_count": safe(row.get("work_count", 1)),
            "is_flagged": is_flg
        })

    last_median = rows["historical_median_monthly"].iloc[-1] if "historical_median_monthly" in rows.columns else 0.0
    last_upper = rows["iqr_upper_fence"].iloc[-1] if "iqr_upper_fence" in rows.columns else 0.0

    return {
        "agency_id": agency_id,
        "agency_name": first["agency_name"],
        "state": first["state"],
        "district": first.get("district", ""),
        "constituency": first.get("constituency", ""),
        "historical_median": safe(last_median),
        "iqr_upper_fence": safe(last_upper),
        "total_spend": safe(rows["monthly_amount"].sum()),
        "months": months,
    }


@router.get("/agencies/{agency_id}/works")
@router.get("/api/agencies/{agency_id}/works")
def get_agency_works(agency_id: str, month: str = Query(None, description="YYYY-MM")):
    store = get_store()
    works = store.works
    if works.empty:
        return []

    date_col = "date" if "date" in works.columns else "sanction_date"
    amt_col = "amount_inr" if "amount_inr" in works.columns else "sanction_amount"
    desc_col = "work_description" if "work_description" in works.columns else "work_name"

    cond = (works["agency_id"] == agency_id)
    if month:
        cond = cond & (works[date_col].astype(str).str.startswith(month))

    filtered = works[cond].sort_values(amt_col, ascending=False)
    if filtered.empty and agency_id not in set(store.scored_panel.get("agency_id", [])):
        raise HTTPException(status_code=404, detail=f"Unknown agency_id '{agency_id}'")

    out = []
    for _, w in filtered.head(100).iterrows():
        out.append({
            "work_id": str(w["work_id"]),
            "work_name": str(w.get("work_name", w.get(desc_col, "Work"))),
            "description": str(w.get(desc_col, w.get("work_name", "Work"))),
            "work_category": str(w.get("work_category", "General")),
            "category": str(w.get("work_category", "General")),
            "amount": safe(w[amt_col]),
            "sanction_amount": safe(w[amt_col]),
            "amount_inr": safe(w[amt_col]),
            "sanction_date": str(w.get(date_col, "")),
            "date": str(w.get(date_col, "")),
            "status": str(w.get("status", "Sanctioned")),
            # clean_pipeline.py computes has_image_proof but drops it before
            # writing clean_works.csv, so the old `default=True` meant every
            # work in the product claimed photographic proof that does not
            # exist. Report None when the column is genuinely absent.
            "has_image_proof": (
                bool(w["has_image_proof"]) if "has_image_proof" in w.index else None
            ),
        })
    return out
