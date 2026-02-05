import secrets


def generate_token(size: int = 32) -> str:
    return secrets.token_urlsafe(size)
