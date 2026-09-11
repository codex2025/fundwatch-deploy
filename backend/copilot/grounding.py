"""Number-grounding guardrail (Section 10.3): verifies that every number
mentioned in an LLM investigation brief is mathematically traceable to the
computed statistics payload before it is displayed to an auditor.
"""
import re

NUMBER_RE = re.compile(r"-?\d[\d,]*\.?\d*")


def extract_numbers(text: str) -> list[float]:
    numbers = []
    for match in NUMBER_RE.findall(text):
        cleaned = match.replace(",", "")
        if cleaned in ("", "-", "."):
            continue
        try:
            numbers.append(float(cleaned))
        except ValueError:
            continue
    return numbers


def _collect_raw_numbers(obj) -> set[float]:
    found = set()
    if isinstance(obj, (int, float)) and not isinstance(obj, bool):
        found.add(float(obj))
    elif isinstance(obj, dict):
        for v in obj.values():
            found |= _collect_raw_numbers(v)
    elif isinstance(obj, list):
        found.add(float(len(obj)))
        for v in obj:
            found |= _collect_raw_numbers(v)
    elif isinstance(obj, str):
        for n in extract_numbers(obj):
            found.add(n)
    return found


def allowed_numbers(payload: dict) -> set[float]:
    raw = _collect_raw_numbers(payload)
    allowed: set[float] = set()
    for n in raw:
        allowed.add(round(n, 2))
        allowed.add(round(n, 1))
        allowed.add(round(n))
        allowed.add(round(n / 100_000, 2))      # Lakhs
        allowed.add(round(n / 100_000, 1))
        allowed.add(round(n / 10_000_000, 2))   # Crores
        allowed.add(round(n / 10_000_000, 1))
    # Standard counts/ordinals
    allowed |= {float(i) for i in range(0, 31)}
    return allowed


def is_grounded(explanation: str, payload: dict, tolerance: float = 0.05) -> tuple[bool, list[float]]:
    """Returns (grounded, ungrounded_numbers)."""
    allowed = allowed_numbers(payload)
    mentioned = extract_numbers(explanation)
    ungrounded = []
    for n in mentioned:
        if any(abs(n - a) <= max(tolerance, abs(a) * tolerance) for a in allowed):
            continue
        ungrounded.append(n)
    return (len(ungrounded) == 0, ungrounded)


def contains_forbidden_words(text: str, forbidden: tuple[str, ...]) -> list[str]:
    lowered = text.lower()
    return [w for w in forbidden if w in lowered]
