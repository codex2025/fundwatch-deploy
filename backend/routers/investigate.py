from fastapi import APIRouter, HTTPException
from copilot.llm_client import generate_investigation_brief
from db import get_store, safe

router = APIRouter(tags=["investigate"])

_cache: dict[str, dict] = {}


@router.post("/investigate/{anomaly_id}")
@router.post("/api/investigate/{anomaly_id}")
def investigate(anomaly_id: str):
    if anomaly_id in _cache:
        return _cache[anomaly_id]

    store = get_store()
    matches = store.anomalies[store.anomalies["anomaly_id"] == anomaly_id]
    if matches.empty:
        # Check if agency_id match
        matches = store.anomalies[store.anomalies["agency_id"] == anomaly_id]

    if matches.empty:
        raise HTTPException(status_code=404, detail=f"Unknown anomaly_id '{anomaly_id}'")

    anomaly = {k: safe(v) for k, v in matches.iloc[0].to_dict().items()}
    brief = generate_investigation_brief(anomaly)
    result = {"anomaly_id": anomaly_id, **brief}

    _cache[anomaly_id] = result
    return result
