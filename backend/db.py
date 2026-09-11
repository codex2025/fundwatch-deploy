"""In-memory store for high-performance retrieval of pre-computed
statistical models, anomalies, works, and alias audit records.
"""
import json
import os
from functools import lru_cache
from pathlib import Path

import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parents[1]
PROCESSED = BASE_DIR / "data" / "processed"


def safe(value):
    """Sanitizes NaN and Infinity to None for strict JSON serialization."""
    try:
        if pd.isna(value) or value is None:
            return None
        if isinstance(value, float) and (np.isinf(value) or np.isnan(value)):
            return None
    except (TypeError, ValueError):
        pass
    return value


class Store:
    def __init__(self) -> None:
        self.reload()

    def reload(self) -> None:
        self.scored_panel = self._load_json_df("scored_panel.json")
        self.anomalies = self._load_json_df("anomalies.json")
        works_path = PROCESSED / "clean_works.csv"
        if works_path.exists():
            self.works = pd.read_csv(works_path, dtype={"work_id": str})
        else:
            self.works = pd.DataFrame()

        alias_path = PROCESSED / "agency_alias_map.csv"
        if alias_path.exists():
            self.alias_map = pd.read_csv(alias_path)
        else:
            self.alias_map = pd.DataFrame()

    @staticmethod
    def _load_json_df(name: str) -> pd.DataFrame:
        path = PROCESSED / name
        if not path.exists():
            # Trigger run_detector if files don't exist yet
            try:
                import sys
                sys.path.insert(0, str(BASE_DIR / "detector"))
                from run_detector import run_detection
                full, anomalies = run_detection()
                if name == "scored_panel.json":
                    return full
                return anomalies
            except Exception as e:
                print(f"[!] Could not auto-generate {name}: {e}")
                return pd.DataFrame()

        with open(path, "r", encoding="utf-8") as f:
            records = json.load(f)
        return pd.DataFrame(records)


@lru_cache(maxsize=1)
def get_store() -> Store:
    return Store()
