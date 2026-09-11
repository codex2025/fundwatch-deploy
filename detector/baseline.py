"""Per-agency baseline statistics, computed only from that agency's own
history (never a global population) — see Section 9.1 of the project plan.
"""
import numpy as np
import pandas as pd

MIN_MONTHS_FOR_BASELINE = 3


def modified_z_scores(values: pd.Series) -> pd.Series:
    """Iglewicz & Hoaglin (1993) robust z-score using the median and MAD:
    M_i = 0.6745 * (x_i - median) / MAD

    Used instead of mean/std because MPLADS spending is heavily
    right-skewed (many small works, occasional large ones) and plain
    std-dev is itself distorted by the very outliers we're trying to find.
    """
    median = values.median()
    mad = (values - median).abs().median()
    if mad == 0 or pd.isna(mad):
        return pd.Series(0.0, index=values.index)
    return 0.6745 * (values - median) / mad


def iqr_upper_fence(values: pd.Series) -> tuple[float, float]:
    """Calculates IQR upper fence: Q3 + 1.5 * IQR."""
    q1, q3 = values.quantile(0.25), values.quantile(0.75)
    iqr = q3 - q1
    return float(q3 + 1.5 * iqr), float(iqr)


def iqr_ratios(values: pd.Series) -> pd.Series:
    """Distance above the upper fence scaled by IQR, floored at 0."""
    upper_fence, iqr = iqr_upper_fence(values)
    if iqr == 0 or pd.isna(iqr):
        return pd.Series(0.0, index=values.index)
    return ((values - upper_fence) / iqr).clip(lower=0)


def velocity_ratios(values: pd.Series, window: int = 6) -> pd.Series:
    """This month's spend vs. the median of the agency's own trailing
    `window` months (Section 9.4) — the behavioural spending-acceleration signal.
    """
    trailing_median = values.shift(1).rolling(window, min_periods=1).median()
    return values / trailing_median.replace(0, np.nan)
