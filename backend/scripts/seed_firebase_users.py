"""One-time / re-runnable seeder for FundWatch Live Mode demo accounts.

Creates the fixed roster of demo users (Admin, MP x2, Agency x7, Public) directly
in Firebase Authentication via `firebase auth:import`, with role/scope info
embedded as custom claims so the backend and frontend can trust the ID token
alone -- no separate user/role database needed.

Usage:
    python backend/scripts/seed_firebase_users.py [--project attendance-c7044] [--password "Some#Pass1"]

Safe to re-run: `firebase auth:import` upserts by localId, so re-seeding just
resets these demo accounts to the same state.
"""
import argparse
import base64
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import bcrypt

DEFAULT_PROJECT = "attendance-c7044"
DEFAULT_PASSWORD = "FundWatch#2026"

# (localId, email, custom claims)
DEMO_USERS = [
    ("fw-admin-1", "admin@fundwatch.demo", {"role": "admin"}),
    ("fw-mp-odisha", "mp.odisha@fundwatch.demo", {"role": "mp", "state": "Odisha"}),
    ("fw-mp-kerala", "mp.kerala@fundwatch.demo", {"role": "mp", "state": "Kerala"}),
    ("fw-agy-0053", "agency.kalahandipwd@fundwatch.demo", {"role": "agency", "agency_id": "agy_0053", "agency_name": "Kalahandi Public Works Department"}),
    ("fw-agy-0038", "agency.bargarhgp@fundwatch.demo", {"role": "agency", "agency_id": "agy_0038", "agency_name": "Bargarh Gram Panchayat"}),
    ("fw-agy-0014", "agency.kottayamps@fundwatch.demo", {"role": "agency", "agency_id": "agy_0014", "agency_name": "Kottayam Panchayat Samiti"}),
    ("fw-agy-0052", "agency.kalahandida@fundwatch.demo", {"role": "agency", "agency_id": "agy_0052", "agency_name": "Kalahandi District Authority"}),
    ("fw-agy-0024", "agency.palakkadpwd@fundwatch.demo", {"role": "agency", "agency_id": "agy_0024", "agency_name": "Palakkad Public Works Department"}),
    ("fw-agy-0016", "agency.kozhikodeda@fundwatch.demo", {"role": "agency", "agency_id": "agy_0016", "agency_name": "Kozhikode District Authority"}),
    ("fw-agy-0059", "agency.keonjhar@fundwatch.demo", {"role": "agency", "agency_id": "agy_0059", "agency_name": "Keonjhar(St) Nagar Panchayat"}),
    ("fw-public-1", "public@fundwatch.demo", {"role": "public"}),
]


def build_import_payload(password: str) -> dict:
    password_bytes = password.encode("utf-8")
    users = []
    for local_id, email, claims in DEMO_USERS:
        hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
        users.append({
            "localId": local_id,
            "email": email,
            "emailVerified": True,
            "passwordHash": base64.b64encode(hashed).decode("ascii"),
            "customAttributes": json.dumps(claims),
        })
    return {"users": users}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", default=DEFAULT_PROJECT)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    args = parser.parse_args()

    payload = build_import_payload(args.password)

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(payload, f)
        tmp_path = Path(f.name)

    try:
        result = subprocess.run(
            [
                "firebase", "auth:import", str(tmp_path),
                "--hash-algo=BCRYPT",
                "--project", args.project,
            ],
            capture_output=True, text=True, shell=True,
        )
        print(result.stdout)
        if result.returncode != 0:
            print(result.stderr, file=sys.stderr)
            sys.exit(result.returncode)
    finally:
        tmp_path.unlink(missing_ok=True)

    print(f"\nSeeded {len(DEMO_USERS)} demo accounts in project '{args.project}'.")
    print(f"Shared demo password: {args.password}")
    for _, email, claims in DEMO_USERS:
        print(f"  - {email}  {claims}")


if __name__ == "__main__":
    main()
