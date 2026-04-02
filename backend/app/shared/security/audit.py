import logging
from datetime import datetime, timezone
from typing import Any

audit_logger = logging.getLogger("audit")


def log_auth_event(
    event_type: str,
    user_id: str | None,
    success: bool,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    """Log authentication events for audit trail."""
    message = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "user_id": str(user_id) if user_id else None,
        "success": success,
        "ip_address": ip_address,
        "details": details or {},
    }

    level = logging.INFO if success else logging.WARNING
    audit_logger.log(level, message)


def log_login_attempt(
    login: str,
    success: bool,
    user_id: str | None = None,
    ip_address: str | None = None,
) -> None:
    """Log login attempt."""
    log_auth_event(
        event_type="login_attempt",
        user_id=user_id,
        success=success,
        details={"login": login},
        ip_address=ip_address,
    )


def log_logout(
    user_id: str,
    ip_address: str | None = None,
) -> None:
    """Log logout event."""
    log_auth_event(
        event_type="logout",
        user_id=user_id,
        success=True,
        ip_address=ip_address,
    )


def log_token_refresh(
    user_id: str,
    success: bool,
    ip_address: str | None = None,
) -> None:
    """Log token refresh."""
    log_auth_event(
        event_type="token_refresh",
        user_id=user_id,
        success=success,
        ip_address=ip_address,
    )


def log_role_change(
    admin_id: str,
    target_user_id: str,
    old_role: str,
    new_role: str,
) -> None:
    """Log role change event."""
    log_auth_event(
        event_type="role_change",
        user_id=admin_id,
        success=True,
        details={
            "target_user_id": target_user_id,
            "old_role": old_role,
            "new_role": new_role,
        },
    )
