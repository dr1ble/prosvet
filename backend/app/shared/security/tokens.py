import base64
import hashlib
import hmac
import json
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any


TOKEN_VERSION = "at1"


class TokenError(Exception):
    pass


@dataclass(frozen=True)
class AccessTokenClaims:
    user_id: uuid.UUID
    role: str
    expires_at: datetime


def _b64url_encode(payload: bytes) -> str:
    return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")


def _b64url_decode(payload: str) -> bytes:
    padding = "=" * (-len(payload) % 4)
    return base64.urlsafe_b64decode((payload + padding).encode("ascii"))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_token(size: int = 32) -> str:
    return secrets.token_urlsafe(size)


def issue_access_token(
    user_id: uuid.UUID,
    role: str,
    secret: str,
    ttl_minutes: int,
    now: datetime | None = None,
) -> str:
    issued_at = now or _utcnow()
    expires_at = issued_at + timedelta(minutes=ttl_minutes)
    payload_dict: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "exp": int(expires_at.timestamp()),
    }
    payload_json = json.dumps(payload_dict, separators=(",", ":"), sort_keys=True, ensure_ascii=True).encode("utf-8")
    payload_b64 = _b64url_encode(payload_json)

    signing_input = f"{TOKEN_VERSION}.{payload_b64}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_b64 = _b64url_encode(signature)
    return f"{TOKEN_VERSION}.{payload_b64}.{signature_b64}"


def parse_access_token(token: str, secret: str, now: datetime | None = None) -> AccessTokenClaims:
    parts = token.split(".")
    if len(parts) != 3 or parts[0] != TOKEN_VERSION:
        raise TokenError("Malformed token.")

    version, payload_b64, signature_b64 = parts
    signing_input = f"{version}.{payload_b64}".encode("ascii")
    expected_signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    expected_signature_b64 = _b64url_encode(expected_signature)
    if not hmac.compare_digest(signature_b64, expected_signature_b64):
        raise TokenError("Invalid token signature.")

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        raise TokenError("Token payload decode failed.") from exc

    sub = payload.get("sub")
    role = payload.get("role")
    exp = payload.get("exp")
    if not isinstance(sub, str) or not isinstance(role, str) or not isinstance(exp, int):
        raise TokenError("Token payload schema is invalid.")

    try:
        user_id = uuid.UUID(sub)
    except ValueError as exc:
        raise TokenError("Token subject is invalid.") from exc

    expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
    current_time = now or _utcnow()
    if expires_at <= current_time:
        raise TokenError("Token expired.")

    return AccessTokenClaims(user_id=user_id, role=role, expires_at=expires_at)
