import pandas as pd
import numpy as np

def compute_modified_z_score(val: float, median: float, mad: float) -> float:
    """
    Robust modified Z-score (Iglewicz & Hoaglin, 1993):
    M_i = 0.6745 * (x_i - median) / MAD
    Flags when M_i > 3.5
    """
    if mad <= 0.0001:
        # If historical MAD is zero (flat baseline), measure relative jump if any
        if val > median * 1.5 and median > 0:
            return min(10.0, (val - median) / (median * 0.2))
        return 0.0
    return max(0.0, 0.6745 * (val - median) / mad)

def compute_iqr_ratio(val: float, upper_fence: float, iqr: float) -> float:
    """
    IQR Fencing signal:
    ratio = (val - upper_fence) / IQR, floored at 0
    """
    if iqr <= 0.0001:
        return 0.0
    if val > upper_fence:
        return max(0.0, (val - upper_fence) / iqr)
    return 0.0

def compute_velocity_ratio(val: float, trailing_median_6m: float) -> float:
    """
    Velocity signal:
    velocity_ratio = monthly_amount / trailing_median (past 6 months)
    Flags when > 3.0
    """
    if trailing_median_6m <= 0.0001:
        return 1.0
    return max(0.0, val / trailing_median_6m)
