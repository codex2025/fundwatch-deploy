"""JSON-file backed persistence for Live Mode cases and the audit log.

Deliberately not pandas-based: cases.json and audit_log.json are small,
mutated frequently (one write per user action), and read back on every
request, so plain json.load/json.dump round-trips are simpler and safer
than trying to keep a pandas DataFrame in sync with partial updates.
"""
import json
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

BASE_DIR = Path(__file__).resolve().parents[1]
PROCESSED = BASE_DIR / "data" / "processed"

_lock = Lock()
_active_dir = None


def _processed_dir() -> Path:
    """Writable directory for cases.json/audit_log.json. Falls back to a
    temp directory (seeded from the bundled files) when PROCESSED is
    read-only, e.g. on a serverless deployment."""
    global _active_dir
    if _active_dir is not None:
        return _active_dir
    try:
        PROCESSED.mkdir(parents=True, exist_ok=True)
        probe = PROCESSED / ".write_test"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        _active_dir = PROCESSED
    except OSError:
        fallback = Path(tempfile.gettempdir()) / "fundwatch_processed"
        fallback.mkdir(parents=True, exist_ok=True)
        for name in ("cases.json", "audit_log.json"):
            src, dst = PROCESSED / name, fallback / name
            if src.exists() and not dst.exists():
                shutil.copy(src, dst)
        _active_dir = fallback
    return _active_dir


def _cases_path() -> Path:
    return _processed_dir() / "cases.json"


def _audit_path() -> Path:
    return _processed_dir() / "audit_log.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _read(path: Path):
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_cases():
    return _read(_cases_path())


def get_case(case_id):
    for c in load_cases():
        if c["case_id"] == case_id:
            return c
    return None


def update_case(case_id, mutate_fn):
    """mutate_fn(case_dict) mutates in place. Returns the updated case, or
    None if no case with that id exists."""
    with _lock:
        path = _cases_path()
        cases = _read(path)
        for c in cases:
            if c["case_id"] == case_id:
                mutate_fn(c)
                c["updated_at"] = now_iso()
                _write(path, cases)
                return c
        return None


def load_audit(case_id: str | None = None):
    entries = _read(_audit_path())
    if case_id:
        entries = [e for e in entries if e.get("case_id") == case_id]
    return entries


def write_audit(actor_role: str, actor_id: str, action: str, case_id: str | None = None, detail: str = ""):
    with _lock:
        path = _audit_path()
        entries = _read(path)
        entries.append({
            "timestamp": now_iso(),
            "actor_role": actor_role,
            "actor_id": actor_id,
            "action": action,
            "case_id": case_id,
            "detail": detail,
        })
        _write(path, entries)
