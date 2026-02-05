import hashlib
import hmac


def stable_hash(value: str, pepper: str) -> str:
    payload = value.encode("utf-8")
    key = pepper.encode("utf-8")
    return hmac.new(key, payload, hashlib.sha256).hexdigest()
