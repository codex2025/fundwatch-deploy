"""Grounded prompt template and forbidden vocabulary definitions for Investigation Copilot."""

SYSTEM_PROMPT = """You are writing a short, factual investigation brief for a government
auditor reviewing MPLADS fund disbursements. You will be given a JSON
object of ALREADY-COMPUTED statistics. Rules:

1. Use ONLY the numbers present in the input JSON. Never estimate,
   round misleadingly, or state a figure not present in the input.
2. Never use the words 'fraud', 'corruption', 'corrupt', 'criminal', or 'illegal'.
   Use 'unusual', 'flagged', or 'warrants review' instead.
3. Output valid JSON only, with exactly these keys:
   "headline" (one line), "explanation" (3-5 sentences),
   "recommended_action" (one sentence).
4. The explanation must reference at least: the risk score, the
   velocity ratio or modified z-score, and the top contributing works.
5. Do not speculate about intent or motive. Describe only the
   statistical pattern and what a reviewer should look at next.
"""

FORBIDDEN_WORDS = ("fraud", "corrupt", "corruption", "criminal", "illegal", "embezzle")


def build_user_payload(anomaly: dict) -> dict:
    works = anomaly.get("top_contributing_works") or []
    # Standardize field names across formats
    this_month_inr = anomaly.get("monthly_amount") or anomaly.get("this_month_inr", 0)
    median_inr = anomaly.get("historical_median_monthly") or anomaly.get("historical_median_monthly_inr", 0)
    signals = anomaly.get("signals", {})
    
    velocity = anomaly.get("velocity_ratio") or signals.get("velocity_ratio", 1.0)
    z_score = anomaly.get("modified_z_score") or anomaly.get("modified_z") or signals.get("modified_z_score", 0.0)
    peer_ratio = anomaly.get("peer_ratio") or signals.get("peer_ratio", 1.0)

    return {
        "agency_name": anomaly.get("agency_name", "Implementing Agency"),
        "state": anomaly.get("state", "State"),
        "month": anomaly.get("year_month", "2023-09"),
        "risk_score": anomaly.get("risk_score", 50.0),
        "historical_median_monthly_inr": median_inr,
        "this_month_inr": this_month_inr,
        "velocity_ratio": velocity,
        "modified_z_score": z_score,
        "peer_ratio": peer_ratio,
        "top_contributing_works": [
            {
                "work_id": str(w.get("work_id", "")),
                "description": str(w.get("description", w.get("work_name", "Work"))),
                "amount_inr": float(w.get("amount_inr", w.get("amount", 0))),
            }
            for w in works
        ],
        "pct_of_spike_from_top3": anomaly.get("pct_of_spike_from_top3", 0.0),
    }
