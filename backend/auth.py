"""Firebase ID token verification for Live Mode.

Every Live Mode request must carry `Authorization: Bearer <Firebase ID token>`.
Tokens are verified against Google's public certs (no service-account key
needed) and role/scope come straight from the custom claims baked into the
token at account-creation time (see scripts/seed_firebase_users.py) --
nothing here trusts client-supplied identity fields any more.
"""
import os
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "attendance-c7044")
VALID_ROLES = {"admin", "mp", "agency", "public"}

_request = google_requests.Request()


@dataclass
class CurrentUser:
    uid: str
    email: str | None
    role: str
    agency_id: str | None = None
    state: str | None = None


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization: Bearer <token> header")

    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = google_id_token.verify_firebase_token(token, _request, audience=FIREBASE_PROJECT_ID)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {exc}")

    if not claims:
        raise HTTPException(status_code=401, detail="Invalid token")

    role = claims.get("role")
    if role not in VALID_ROLES:
        role = "public"  # self-signed-up citizens carry no custom claims

    return CurrentUser(
        uid=claims.get("user_id") or claims.get("sub"),
        email=claims.get("email"),
        role=role,
        agency_id=claims.get("agency_id"),
        state=claims.get("state"),
    )


def require_roles(*roles: str):
    """Dependency factory: raises 403 unless the caller's role is in `roles`."""

    def _dep(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail=f"This action requires one of roles {sorted(roles)}")
        return user

    return _dep
