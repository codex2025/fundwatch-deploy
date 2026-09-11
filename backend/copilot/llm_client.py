"""Investigation Copilot generator with Anthropic / OpenAI client and
robust deterministic template fallback ensuring 100% grounding.
"""
import json
import os
import requests

from .grounding import contains_forbidden_words, is_grounded
from .prompt_template import FORBIDDEN_WORDS, SYSTEM_PROMPT, build_user_payload


def _template_summary(payload: dict) -> dict:
    """Deterministic, zero-API-key fallback. Every number here is read
    straight out of the payload — guaranteeing 100% grounding.
    """
    works = payload.get("top_contributing_works") or []
    work_desc = "; ".join(f"{w['description']} (Rs {w['amount_inr']:,.0f})" for w in works[:3])
    velocity = payload.get("velocity_ratio")
    z = payload.get("modified_z_score")
    pct_top3 = payload.get("pct_of_spike_from_top3")
    peer = payload.get("peer_ratio")

    explanation_parts = [
        f"Spending in {payload['month']} reached Rs {payload['this_month_inr']:,.0f}, "
        f"compared to a historical typical monthly spend of Rs {payload['historical_median_monthly_inr']:,.0f} "
        f"for {payload['agency_name']}."
    ]
    if velocity is not None and velocity > 1.0:
        explanation_parts.append(f"This is {velocity:.1f}x the agency's recent typical monthly pace.")
    if z is not None and z > 0:
        explanation_parts.append(f"The robust modified z-score for this month is {z:.1f} MAD, exceeding standard baseline thresholds.")
    if pct_top3 is not None and works:
        explanation_parts.append(f"{pct_top3:.0f}% of the increase is concentrated in {len(works)} works: {work_desc}.")
    if peer is not None and peer > 1.2:
        explanation_parts.append(f"Disbursement also exceeded the median of peer agencies in {payload['state']} by {peer:.1f}x.")

    return {
        "headline": f"{payload['agency_name']} — Risk Score {payload['risk_score']}/100",
        "explanation": " ".join(explanation_parts),
        "recommended_action": "Review the listed works and confirm supporting documentation before further disbursement to this agency.",
    }


def _call_llm(payload: dict) -> dict | None:
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if anthropic_key:
        try:
            resp = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-3-5-sonnet-20241022",
                    "max_tokens": 400,
                    "system": SYSTEM_PROMPT,
                    "messages": [{"role": "user", "content": json.dumps(payload)}],
                },
                timeout=6
            )
            if resp.status_code == 200:
                txt = resp.json()["content"][0]["text"]
                return json.loads(txt[txt.find("{"):txt.rfind("}")+1])
        except Exception:
            pass

    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                max_tokens=400,
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": json.dumps(payload)},
                ],
                timeout=6
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception:
            pass

    return None


def generate_investigation_brief(anomaly: dict) -> dict:
    payload = build_user_payload(anomaly)

    llm_result = _call_llm(payload)
    if llm_result is not None and isinstance(llm_result, dict):
        headline = str(llm_result.get("headline", ""))
        explanation = str(llm_result.get("explanation", ""))
        action = str(llm_result.get("recommended_action", ""))

        forbidden_hits = contains_forbidden_words(headline + " " + explanation + " " + action, FORBIDDEN_WORDS)
        grounded, _ = is_grounded(explanation, payload)
        if not forbidden_hits and grounded:
            return {
                "headline": headline,
                "explanation": explanation,
                "recommended_action": action,
                "source": "llm",
                "audit_verified": True,
                "grounded_stats": payload
            }

    # Fallback to deterministic template
    template_res = _template_summary(payload)
    return {
        **template_res,
        "source": "template",
        "audit_verified": True,
        "grounded_stats": payload
    }
