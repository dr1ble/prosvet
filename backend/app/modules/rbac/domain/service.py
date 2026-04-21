from app.modules.users.models import UserRole

VALID_ROLES: set[str] = {r.value for r in UserRole}


def validate_role(role: str) -> None:
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role '{role}'. Must be one of: {', '.join(sorted(VALID_ROLES))}")
