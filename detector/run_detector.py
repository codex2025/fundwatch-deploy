"""Detector entrypoint (Section 9 of the project plan).

Reads data/processed/clean_agency_month.csv and writes:
  data/processed/scored_panel.json   — every agency-month row, all signals
  data/processed/anomalies.json      — ranked list of rows with sufficient history,
                                        including drill-down work evidence
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from baseline import MIN_MONTHS_FOR_BASELINE, iqr_ratios, iqr_upper_fence, modified_z_scores, velocity_ratios
from peer_comparison import add_peer_ratio
from risk_score import compute_risk_score, top_signal

BASE_DIR = Path(__file__).resolve().parents[1]
PROCESSED = BASE_DIR / "data" / "processed"
TOP_N_WORKS = 3


def score_agency(df_agency: pd.DataFrame) -> pd.DataFrame:
    df = df_agency.sort_values("year_month").reset_index(drop=True)
    values = df["monthly_amount"]

    df["modified_z"] = modified_z_scores(values)
    df["iqr_ratio"] = iqr_ratios(values)
    upper_fence, _ = iqr_upper_fence(values)
    df["iqr_upper_fence"] = upper_fence
    df["velocity_ratio"] = velocity_ratios(values)
    df["historical_median_monthly"] = values.median()

    month_rank = pd.Series(range(1, len(df) + 1), index=df.index)
    df["insufficient_history"] = month_rank < MIN_MONTHS_FOR_BASELINE
    return df


def attach_work_evidence(anomalies: pd.DataFrame, works: pd.DataFrame) -> pd.DataFrame:
    records = []
    # Identify date and amount columns flexibly
    date_col = "date" if "date" in works.columns else "sanction_date"
    amt_col = "amount_inr" if "amount_inr" in works.columns else "sanction_amount"
    desc_col = "work_description" if "work_description" in works.columns else "work_name"

    for _, row in anomalies.iterrows():
        month_works = works[
            (works["agency_id"] == row["agency_id"]) & (works[date_col].astype(str).str.startswith(row["year_month"]))
        ].sort_values(amt_col, ascending=False)

        top = month_works.head(TOP_N_WORKS)
        top_amount = top[amt_col].sum() if len(top) > 0 else 0.0
        monthly_amt = row["monthly_amount"]
        pct_of_spike = round(100 * top_amount / monthly_amt, 1) if monthly_amt and monthly_amt > 0 else 0.0

        records.append({
            "top_contributing_works": [
                {
                    "work_id": str(w["work_id"]),
                    "description": str(w.get(desc_col, w.get("work_name", "Work"))),
                    "amount_inr": float(w[amt_col]),
                }
                for _, w in top.iterrows()
            ],
            "pct_of_spike_from_top3": pct_of_spike,
        })
    evidence = pd.DataFrame(records, index=anomalies.index)
    return pd.concat([anomalies, evidence], axis=1)


def run_detection(
    panel_df: pd.DataFrame | None = None,
    works_df: pd.DataFrame | None = None,
    save_outputs: bool = True
) -> tuple[pd.DataFrame, pd.DataFrame]:
    if panel_df is None:
        panel_df = pd.read_csv(PROCESSED / "clean_agency_month.csv")
    if works_df is None:
        works_df = pd.read_csv(PROCESSED / "clean_works.csv", dtype={"work_id": str})

    scored_groups = [score_agency(g) for _, g in panel_df.groupby("agency_id")]
    full = pd.concat(scored_groups, ignore_index=True)
    full = add_peer_ratio(full)

    full["risk_score"] = full.apply(compute_risk_score, axis=1)
    full["top_signal"] = full.apply(top_signal, axis=1)

    anomalies = full[full["insufficient_history"] == False].copy()
    anomalies["anomaly_id"] = anomalies["agency_id"] + "__" + anomalies["year_month"]
    anomalies = attach_work_evidence(anomalies, works_df)
    anomalies = anomalies.sort_values("risk_score", ascending=False)

    anomaly_cols = [
        "anomaly_id", "agency_id", "agency_name", "state", "year_month",
        "monthly_amount", "historical_median_monthly", "modified_z", "iqr_ratio",
        "velocity_ratio", "peer_ratio", "risk_score", "top_signal",
        "insufficient_history", "top_contributing_works", "pct_of_spike_from_top3",
    ]
    available_cols = [c for c in anomaly_cols if c in anomalies.columns]
    anomalies_out = anomalies[available_cols].rename(columns={"modified_z": "modified_z_score"})

    if save_outputs:
        PROCESSED.mkdir(parents=True, exist_ok=True)
        scored_panel_records = full.replace({np.nan: None}).to_dict(orient="records")
        with open(PROCESSED / "scored_panel.json", "w", encoding="utf-8") as f:
            json.dump(scored_panel_records, f, indent=2, default=str)

        anomalies_records = anomalies_out.replace({np.nan: None}).to_dict(orient="records")
        with open(PROCESSED / "anomalies.json", "w", encoding="utf-8") as f:
            json.dump(anomalies_records, f, indent=2, default=str)

    return full, anomalies_out


def main() -> None:
    full, anomalies_out = run_detection()
    n_flagged = int((anomalies_out["risk_score"] >= 50).sum())
    print(f"Scored panel: {len(full)} agency-month rows across {full['agency_id'].nunique()} agencies")
    print(f"Anomalies (sufficient history): {len(anomalies_out)}  (risk_score >= 50: {n_flagged})")
    print("Top 5 by risk_score:")
    print(anomalies_out.head(5)[["agency_name", "state", "year_month", "risk_score", "top_signal"]])


if __name__ == "__main__":
    main()
