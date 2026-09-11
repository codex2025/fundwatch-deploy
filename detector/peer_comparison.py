"""Cross-agency peer comparison (Section 9.5, stretch signal).

Compares an agency's monthly_amount against the median of OTHER agencies in
the same state and work_category, bucketed into terciles by historical
average monthly spend so a large municipal corporation is never compared
against a small gram panchayat.
"""
import pandas as pd
import numpy as np


def add_peer_ratio(panel: pd.DataFrame) -> pd.DataFrame:
    panel = panel.copy()

    agency_avg = panel.groupby("agency_id")["monthly_amount"].mean()
    # tercile buckets computed over agencies within each (state, work_category)
    bucket_map: dict[str, str] = {}
    for (state, category), grp in panel.groupby(["state", "work_category"]):
        agency_ids = grp["agency_id"].unique()
        avgs = agency_avg.loc[agency_ids].sort_values()
        n = len(avgs)
        if n < 3:
            for aid in avgs.index:
                bucket_map[aid] = "small"
            continue
        thirds = n // 3
        for i, aid in enumerate(avgs.index):
            if i < thirds:
                bucket_map[aid] = "small"
            elif i < 2 * thirds:
                bucket_map[aid] = "medium"
            else:
                bucket_map[aid] = "large"

    panel["peer_bucket"] = panel["agency_id"].map(bucket_map).fillna("small")

    peer_median_df = (
        panel.groupby(["state", "work_category", "peer_bucket", "year_month"])["monthly_amount"]
        .median()
        .reset_index()
        .rename(columns={"monthly_amount": "peer_median_monthly"})
    )
    
    panel = panel.merge(peer_median_df, on=["state", "work_category", "peer_bucket", "year_month"], how="left")
    panel["peer_ratio"] = (panel["monthly_amount"] / panel["peer_median_monthly"]).replace(
        [float("inf")], float("nan")
    )
    return panel.drop(columns=["peer_median_monthly"])
