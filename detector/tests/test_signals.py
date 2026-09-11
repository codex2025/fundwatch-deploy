import unittest
import sys
from pathlib import Path
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from baseline import iqr_ratios, iqr_upper_fence, modified_z_scores, velocity_ratios
from peer_comparison import add_peer_ratio
from risk_score import compute_risk_score, top_signal


class TestSignals(unittest.TestCase):
    def test_modified_z_scores_zero_variance(self):
        s = pd.Series([100.0, 100.0, 100.0])
        z = modified_z_scores(s)
        self.assertTrue((z == 0.0).all())

    def test_modified_z_scores_with_outlier(self):
        # Spike of 1000 against baseline of 100
        s = pd.Series([100.0, 105.0, 95.0, 100.0, 1000.0])
        z = modified_z_scores(s)
        self.assertGreater(z.iloc[-1], 3.5)

    def test_iqr_upper_fence(self):
        s = pd.Series([10.0, 20.0, 30.0, 40.0, 50.0])
        fence, iqr = iqr_upper_fence(s)
        self.assertEqual(iqr, 20.0)
        self.assertEqual(fence, 70.0)

    def test_iqr_ratios(self):
        s = pd.Series([10.0, 20.0, 30.0, 40.0, 110.0])
        r = iqr_ratios(s)
        self.assertEqual(r.iloc[0], 0.0)
        self.assertGreater(r.iloc[-1], 0.0)

    def test_velocity_ratios(self):
        s = pd.Series([100.0, 100.0, 100.0, 500.0])
        v = velocity_ratios(s, window=3)
        self.assertAlmostEqual(v.iloc[-1], 5.0, places=2)

    def test_risk_score_cold_start(self):
        row = pd.Series({"insufficient_history": True, "modified_z": 5.0, "iqr_ratio": 3.0, "velocity_ratio": 5.0})
        self.assertIsNone(compute_risk_score(row))

    def test_risk_score_critical(self):
        row = pd.Series({
            "insufficient_history": False,
            "modified_z": 5.0,
            "iqr_ratio": 3.0,
            "velocity_ratio": 5.0,
            "peer_ratio": 5.0
        })
        score = compute_risk_score(row)
        self.assertEqual(score, 100.0)

    def test_peer_comparison_calculation(self):
        df = pd.DataFrame([
            {"agency_id": "A1", "agency_name": "Agency 1", "state": "Odisha", "work_category": "Roads", "year_month": "2023-01", "monthly_amount": 100000},
            {"agency_id": "A2", "agency_name": "Agency 2", "state": "Odisha", "work_category": "Roads", "year_month": "2023-01", "monthly_amount": 110000},
            {"agency_id": "A3", "agency_name": "Agency 3", "state": "Odisha", "work_category": "Roads", "year_month": "2023-01", "monthly_amount": 300000},
            {"agency_id": "A1", "agency_name": "Agency 1", "state": "Odisha", "work_category": "Roads", "year_month": "2023-02", "monthly_amount": 100000},
            {"agency_id": "A2", "agency_name": "Agency 2", "state": "Odisha", "work_category": "Roads", "year_month": "2023-02", "monthly_amount": 110000},
            {"agency_id": "A3", "agency_name": "Agency 3", "state": "Odisha", "work_category": "Roads", "year_month": "2023-02", "monthly_amount": 500000},
            {"agency_id": "A4", "agency_name": "Agency 4", "state": "Odisha", "work_category": "Roads", "year_month": "2023-02", "monthly_amount": 100000},
            {"agency_id": "A5", "agency_name": "Agency 5", "state": "Odisha", "work_category": "Roads", "year_month": "2023-02", "monthly_amount": 110000},
            {"agency_id": "A6", "agency_name": "Agency 6", "state": "Odisha", "work_category": "Roads", "year_month": "2023-02", "monthly_amount": 120000},
        ])
        res = add_peer_ratio(df)
        self.assertIn("peer_ratio", res.columns)
        self.assertTrue(pd.notna(res["peer_ratio"]).all())


if __name__ == "__main__":
    unittest.main()
