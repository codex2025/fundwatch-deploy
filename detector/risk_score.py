"""4-Dimension Mathematical Risk Scoring Engine (S1, S2, S3, S4).

Dimensions:
- S1 (Cost Anomaly): Boris Iglewicz & David Hoaglin Modified Z-Score using MAD
- S2 (Distribution Spread): IQR Fencing (Upper Fence & Extreme Fence)
- S3 (Peer-to-Peer Deviation): Cost ratio vs State/Category peer median
- S4 (Spending Velocity & Ghost Completion): Impossibly fast completion (<= 3 days) or pre-election dumping (> 3x)

Composite Risk Score (CRS):
CRS = 0.30 * S1 + 0.25 * S2 + 0.25 * S3 + 0.20 * S4
"""
import numpy as np
import pandas as pd


def compute_s1_modified_z_score(cost: float, median: float, mad: float) -> tuple[float, float]:
    """
    S1: Modified Z-Score using Median Absolute Deviation (MAD).
    M_i = 0.6745 * |X_i - median| / MAD
    Returns: (M_i, S1_score_0_to_100)
    """
    if mad <= 0 or pd.isna(mad):
        if median > 0 and cost > median * 1.5:
            m_i = min(10.0, (cost - median) / (median * 0.2))
        else:
            return 0.0, 0.0
    else:
        m_i = 0.6745 * abs(cost - median) / mad

    if m_i <= 2.0:
        s1 = 0.0
    elif 2.0 < m_i < 3.5:
        s1 = ((m_i - 2.0) / 1.5) * 60.0
    else:  # m_i >= 3.5
        s1 = 60.0 + min(40.0, ((m_i - 3.5) / 3.5) * 40.0)

    return round(float(m_i), 2), round(float(np.clip(s1, 0.0, 100.0)), 1)


def compute_s2_iqr_score(cost: float, q1: float, q3: float) -> tuple[float, float, float, float]:
    """
    S2: Distribution Spread & Thresholding using IQR Fencing.
    Upper Fence = Q3 + 1.5 * IQR
    Extreme Fence = Q3 + 3.0 * IQR
    Returns: (upper_fence, extreme_fence, iqr_ratio, S2_score_0_to_100)
    """
    iqr = q3 - q1
    if iqr <= 0 or pd.isna(iqr):
        return q3, q3, 0.0, 0.0

    upper_fence = q3 + 1.5 * iqr
    extreme_fence = q3 + 3.0 * iqr

    if cost <= upper_fence:
        s2 = 0.0
        iqr_ratio = 0.0
    elif upper_fence < cost <= extreme_fence:
        s2 = 50.0
        iqr_ratio = (cost - upper_fence) / iqr
    else:  # cost > extreme_fence
        s2 = 100.0
        iqr_ratio = (cost - upper_fence) / iqr

    return round(float(upper_fence), 1), round(float(extreme_fence), 1), round(float(iqr_ratio), 2), float(s2)


def compute_s3_peer_score(cost: float, peer_median: float) -> tuple[float, float]:
    """
    S3: Peer-to-Peer Deviation against state/category peer median.
    Ratio_i = cost / peer_median
    Returns: (peer_ratio, S3_score_0_to_100)
    """
    if peer_median <= 0 or pd.isna(peer_median):
        return 1.0, 0.0

    ratio = cost / peer_median
    if ratio <= 1.25:
        s3 = 0.0
    elif 1.25 < ratio <= 2.5:
        s3 = ((ratio - 1.25) / 1.25) * 70.0
    else:  # ratio > 2.5
        s3 = 100.0

    return round(float(ratio), 2), round(float(np.clip(s3, 0.0, 100.0)), 1)


def compute_s4_velocity_ghost_score(
    cost: float,
    delta_days: float | None = None,
    velocity_ratio: float = 1.0,
    is_year_end: bool = False
) -> tuple[float, str]:
    """
    S4: Spending Velocity & Ghost Completion Scoring.
    - Ghost Completion: delta_days <= 3 for works > Rs 2,00,000 -> S4 = 100
    - Fiscal year-end or pre-election dumping (>3x acceleration) -> S4 = 85
    - Normal cadence -> S4 = 0 (or scaled moderate)
    Returns: (S4_score_0_to_100, flag_description)
    """
    # 1. Ghost bill check
    if delta_days is not None and not pd.isna(delta_days) and delta_days <= 3 and cost > 200000:
        return 100.0, "Ghost Completion (<=3 days for major capital works)"

    # 2. Velocity spike / dumping check
    if velocity_ratio >= 3.0:
        s4 = 85.0 if is_year_end else min(100.0, 60.0 + (velocity_ratio - 3.0) * 10.0)
        return round(float(s4), 1), f"High Spending Velocity Surge ({velocity_ratio:.1f}x baseline)"

    if velocity_ratio >= 2.0:
        return 40.0, f"Moderate Velocity Elevation ({velocity_ratio:.1f}x)"

    return 0.0, "Normal Procurement Cadence"


def compute_composite_risk_score(
    s1: float,
    s2: float,
    s3: float,
    s4: float,
    insufficient_history: bool = False
) -> tuple[float, str]:
    """
    Computes Composite Risk Score (CRS):
    CRS = (0.30 * S1) + (0.25 * S2) + (0.25 * S3) + (0.20 * S4)

    Classification Matrix:
    - 0 – 39: Low Risk / Normal
    - 40 – 69: Moderate Risk
    - 70 – 85: High Suspicion
    - 86 – 100: Critical Red Flag
    """
    if insufficient_history:
        return 0.0, "Insufficient History (<3 months)"

    raw_crs = (0.30 * s1) + (0.25 * s2) + (0.25 * s3) + (0.20 * s4)
    crs = round(float(np.clip(raw_crs, 0.0, 100.0)), 1)

    if crs >= 86.0:
        tier = "Critical Red Flag"
    elif crs >= 70.0:
        tier = "High Suspicion"
    elif crs >= 40.0:
        tier = "Moderate Risk"
    else:
        tier = "Low Risk / Normal"

    return crs, tier
