"""Unit tests for AuthService."""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.modules.auth.api.schemas import AuthResponse
from app.modules.auth.domain.errors import AuthError
from app.modules.auth.domain.services import AuthService
from app.modules.users.models import UserRole, UserStatus


@pytest.fixture
def auth_service(mock_repo):
    """AuthService instance with mocked repository."""
    mock_db = MagicMock()
    service = AuthService(mock_db)
    service.repo = mock_repo
    return service


@pytest.fixture
def mock_repo():
    """Mock AuthRepository."""
    return MagicMock()


def test_login_success_existing_user(auth_service, mock_repo, active_user):
    active_user.status = UserStatus.ACTIVE
    mock_repo.get_user_by_login.return_value = active_user

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.admin_login = ""
        mock_settings.admin_password = None

        with patch("app.modules.auth.domain.services.verify_password", return_value=True):
            with patch.object(
                auth_service,
                "_issue_session_tokens",
                return_value=AuthResponse(access_token="token", refresh_token="refresh"),
            ):
                response = auth_service.login("testuser", "password123")

    assert isinstance(response, AuthResponse)
    assert response.access_token is not None
    assert response.refresh_token is not None


def test_register_success(auth_service, mock_repo):
    created_user = MagicMock()
    created_user.id = uuid.uuid4()
    created_user.role = UserRole.USER
    mock_repo.get_user_by_login.return_value = None
    mock_repo.create_user.return_value = created_user

    with patch.object(
        auth_service,
        "_issue_session_tokens",
        return_value=AuthResponse(access_token="token", refresh_token="refresh"),
    ):
        response = auth_service.register(
            full_name="Иван Иванов",
            login="newuser",
            password="password123",
        )

    assert isinstance(response, AuthResponse)
    kwargs = mock_repo.create_user.call_args.kwargs
    assert kwargs["role"] == UserRole.USER
    assert kwargs["login"] == "newuser"
    assert kwargs["display_name"] == "Иван Иванов"
    assert isinstance(kwargs["password_hash"], str)
    assert kwargs["password_hash"] != "password123"


def test_register_fails_when_login_taken(auth_service, mock_repo):
    mock_repo.get_user_by_login.return_value = MagicMock()

    with pytest.raises(AuthError, match="Login is already taken"):
        auth_service.register(
            full_name="Иван Иванов",
            login="existing-user",
            password="password123",
        )


def test_request_password_recovery_accepts_login_or_email(auth_service, mock_repo):
    user = MagicMock()
    user.id = uuid.uuid4()
    user.status = UserStatus.ACTIVE
    user.email = "user@example.test"
    mock_repo.get_user_by_login_or_email.return_value = user
    auth_service.email_sender = MagicMock()

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.environment = "production"
        response = auth_service.request_password_recovery("User@Example.Test")

    mock_repo.get_user_by_login_or_email.assert_called_once_with("user@example.test")
    assert response.status == "recovery_requested"
    assert response.debug_reset_token is None
    assert mock_repo.create_password_reset_token.called


def test_request_password_recovery_rejects_unknown_user(auth_service, mock_repo):
    mock_repo.get_user_by_login_or_email.return_value = None

    with pytest.raises(AuthError, match="Recovery user not found or email missing"):
        auth_service.request_password_recovery("missing-user")

    assert not mock_repo.create_password_reset_token.called


def test_request_password_recovery_rejects_user_without_email(auth_service, mock_repo):
    user = MagicMock()
    user.id = uuid.uuid4()
    user.status = UserStatus.ACTIVE
    user.email = None
    mock_repo.get_user_by_login_or_email.return_value = user

    with pytest.raises(AuthError, match="Recovery user not found or email missing"):
        auth_service.request_password_recovery("testuser")

    assert not mock_repo.create_password_reset_token.called


def test_request_password_recovery_sends_email_when_user_has_email(auth_service, mock_repo):
    user = MagicMock()
    user.id = uuid.uuid4()
    user.status = UserStatus.ACTIVE
    user.email = "user@example.test"
    mock_repo.get_user_by_login_or_email.return_value = user
    email_sender = MagicMock()
    auth_service.email_sender = email_sender

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.environment = "production"
        auth_service.request_password_recovery("user@example.test")

    email_sender.send_password_reset.assert_called_once()
    assert email_sender.send_password_reset.call_args.args[0] == "user@example.test"


def test_request_password_recovery_returns_debug_token_in_development(auth_service, mock_repo):
    user = MagicMock()
    user.id = uuid.uuid4()
    user.status = UserStatus.ACTIVE
    user.email = "user@example.test"
    mock_repo.get_user_by_login_or_email.return_value = user
    auth_service.email_sender = MagicMock()

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.environment = "development"
        response = auth_service.request_password_recovery("testuser")

    assert response.debug_reset_token


def test_request_password_recovery_uses_six_digit_code(auth_service, mock_repo):
    user = MagicMock()
    user.id = uuid.uuid4()
    user.status = UserStatus.ACTIVE
    user.email = "user@example.test"
    mock_repo.get_user_by_login_or_email.return_value = user
    auth_service.email_sender = MagicMock()

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.environment = "development"
        response = auth_service.request_password_recovery("testuser")

    assert response.debug_reset_token is not None
    assert response.debug_reset_token.isdigit()
    assert len(response.debug_reset_token) == 6


def test_confirm_password_recovery_updates_password(auth_service, mock_repo, active_user):
    token = MagicMock()
    token.user_id = active_user.id
    mock_repo.get_active_password_reset_token.return_value = token
    mock_repo.get_user_by_id.return_value = active_user

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        auth_service.confirm_password_recovery("reset-token-123456", "password456")

    assert mock_repo.update_password_hash.called
    assert mock_repo.mark_password_reset_token_used.called


def test_confirm_password_recovery_rejects_invalid_token(auth_service, mock_repo):
    mock_repo.get_active_password_reset_token.return_value = None

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        with pytest.raises(AuthError, match="Reset token is invalid or expired"):
            auth_service.confirm_password_recovery("reset-token-123456", "password456")


def test_bind_email_updates_current_user(auth_service, mock_repo, active_user):
    mock_repo.get_user_by_login_or_email.return_value = None
    mock_repo.bind_email.return_value = active_user

    result = auth_service.bind_email(active_user, "USER@Example.Test")

    assert result is active_user
    mock_repo.bind_email.assert_called_once_with(user=active_user, email="user@example.test")


def test_bind_email_rejects_invalid_email(auth_service, active_user):
    with pytest.raises(AuthError, match="Invalid email"):
        auth_service.bind_email(active_user, "not-an-email")


def test_change_password_updates_hash(auth_service, mock_repo, active_user):
    active_user.password_hash = "old-hash"
    mock_repo.update_password_hash.return_value = active_user

    with patch("app.modules.auth.domain.services.verify_password", side_effect=[True, False]):
        with patch("app.modules.auth.domain.services.hash_password", return_value="new-hash"):
            result = auth_service.change_password(
                active_user,
                current_password="password123",
                new_password="password456",
            )

    assert result is active_user
    mock_repo.update_password_hash.assert_called_once_with(active_user, "new-hash")


def test_change_password_rejects_wrong_current_password(auth_service, mock_repo, active_user):
    active_user.password_hash = "old-hash"

    with patch("app.modules.auth.domain.services.verify_password", return_value=False):
        with pytest.raises(AuthError, match="Current password is incorrect"):
            auth_service.change_password(
                active_user,
                current_password="password123",
                new_password="password456",
            )

    assert not mock_repo.update_password_hash.called


def test_change_password_rejects_same_password(auth_service, mock_repo, active_user):
    active_user.password_hash = "old-hash"

    with patch("app.modules.auth.domain.services.verify_password", side_effect=[True, True]):
        with pytest.raises(AuthError, match="New password must be different"):
            auth_service.change_password(
                active_user,
                current_password="password123",
                new_password="password123",
            )

    assert not mock_repo.update_password_hash.called


def test_update_account_settings_persists_selected_flags(auth_service, mock_repo, active_user):
    mock_repo.update_account_settings.return_value = active_user

    result = auth_service.update_account_settings(
        active_user,
        learning_reminders_enabled=False,
        security_alerts_enabled=True,
        profile_visible=True,
    )

    assert result is active_user
    mock_repo.update_account_settings.assert_called_once_with(
        active_user,
        learning_reminders_enabled=False,
        security_alerts_enabled=True,
        profile_visible=True,
    )


def test_register_fails_with_invalid_full_name(auth_service):
    with pytest.raises(AuthError, match="Invalid registration data"):
        auth_service.register(
            full_name=" ",
            login="validlogin",
            password="password123",
        )


def test_login_bootstraps_admin_without_phone_data(auth_service, mock_repo):
    mock_repo.get_user_by_login.return_value = None
    created_admin = MagicMock()
    created_admin.id = uuid.uuid4()
    created_admin.role = UserRole.ADMINISTRATOR
    mock_repo.create_user.return_value = created_admin

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.admin_login = "admin"
        mock_settings.admin_password = "admin12345"

        with patch.object(
            auth_service,
            "_issue_session_tokens",
            return_value=AuthResponse(access_token="token", refresh_token="refresh"),
        ):
            auth_service.login("admin", "admin12345")

    kwargs = mock_repo.create_user.call_args.kwargs
    assert kwargs["role"] == UserRole.ADMINISTRATOR
    assert kwargs["login"] == "admin"
    assert isinstance(kwargs["password_hash"], str)
    assert kwargs["password_hash"] != "admin12345"
    assert kwargs.get("display_name") is None


def test_login_fails_invalid_login(auth_service):
    with pytest.raises(AuthError, match="Invalid credentials"):
        auth_service.login("ab", "password123")


def test_login_fails_short_password(auth_service):
    with pytest.raises(AuthError, match="Invalid credentials"):
        auth_service.login("testuser", "short")


def test_login_fails_user_not_found(auth_service, mock_repo):
    mock_repo.get_user_by_login.return_value = None

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.environment = "production"
        mock_settings.admin_login = ""
        mock_settings.admin_password = None

        with pytest.raises(AuthError, match="Invalid credentials"):
            auth_service.login("testuser", "password123")


@pytest.mark.parametrize(
    ("login", "password", "role"),
    [
        ("methodologist", "method12345", UserRole.METHODOLOGIST),
        ("methodist", "method12345", UserRole.METHODOLOGIST),
        ("moderator", "moder12345", UserRole.MODERATOR),
    ],
)
def test_login_bootstraps_demo_user_in_development(
    auth_service, mock_repo, login, password, role
):
    mock_repo.get_user_by_login.return_value = None
    created_user = MagicMock()
    created_user.id = uuid.uuid4()
    created_user.role = role
    mock_repo.create_user.return_value = created_user

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.environment = "development"
        mock_settings.security_pepper = "pepper"
        mock_settings.admin_login = "admin"
        mock_settings.admin_password = "admin12345"

        with patch.object(
            auth_service,
            "_issue_session_tokens",
            return_value=AuthResponse(access_token="token", refresh_token="refresh"),
        ):
            auth_service.login(login, password)

    kwargs = mock_repo.create_user.call_args.kwargs
    assert kwargs["role"] == role
    assert kwargs["login"] == login
    assert isinstance(kwargs["password_hash"], str)
    assert kwargs["password_hash"] != password
    assert kwargs["display_name"]


def test_login_does_not_bootstrap_demo_user_outside_development(auth_service, mock_repo):
    mock_repo.get_user_by_login.return_value = None

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.environment = "production"
        mock_settings.admin_login = ""
        mock_settings.admin_password = None

        with pytest.raises(AuthError, match="Invalid credentials"):
            auth_service.login("methodologist", "method12345")


def test_login_fails_blocked_user(auth_service, mock_repo):
    user = MagicMock()
    user.status = UserStatus.BLOCKED
    user.role = UserRole.USER
    user.password_hash = "hash"
    mock_repo.get_user_by_login.return_value = user

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.admin_login = ""
        mock_settings.admin_password = None

        with pytest.raises(AuthError, match="Invalid credentials"):
            auth_service.login("testuser", "password123")


def test_login_fails_wrong_password(auth_service, mock_repo, active_user):
    active_user.status = UserStatus.ACTIVE
    active_user.password_hash = "hash"
    mock_repo.get_user_by_login.return_value = active_user

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.admin_login = ""
        mock_settings.admin_password = None

        with patch("app.modules.auth.domain.services.verify_password", return_value=False):
            with pytest.raises(AuthError, match="Invalid credentials"):
                auth_service.login("testuser", "wrongpassword")


def test_activate_qr_success(auth_service, mock_repo):
    now = datetime.now(timezone.utc)
    mock_token = MagicMock()
    mock_token.issued_by_user_id = uuid.uuid4()
    mock_repo.get_active_qr_token.return_value = mock_token

    user = MagicMock()
    user.id = mock_token.issued_by_user_id
    user.role = UserRole.USER
    user.status = UserStatus.ACTIVE
    mock_repo.get_user_by_id.return_value = user

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"

        with patch("app.modules.auth.domain.services._utcnow", return_value=now):
            with patch.object(
                auth_service,
                "_issue_session_tokens",
                return_value=AuthResponse(access_token="token", refresh_token="refresh"),
            ):
                response = auth_service.activate_qr("valid-token")

    assert isinstance(response, AuthResponse)


def test_activate_qr_creates_user_when_unbound(auth_service, mock_repo):
    now = datetime.now(timezone.utc)
    mock_token = MagicMock()
    mock_token.issued_by_user_id = None
    mock_token.id = uuid.uuid4()
    mock_repo.get_active_qr_token.return_value = mock_token

    created_user = MagicMock()
    created_user.id = uuid.uuid4()
    created_user.role = UserRole.USER
    mock_repo.create_user.return_value = created_user

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"

        with patch("app.modules.auth.domain.services._utcnow", return_value=now):
            with patch.object(
                auth_service,
                "_issue_session_tokens",
                return_value=AuthResponse(access_token="token", refresh_token="refresh"),
            ):
                auth_service.activate_qr("valid-token")

    mock_repo.create_user.assert_called_once_with()


def test_activate_qr_fails_invalid_token(auth_service, mock_repo):
    mock_repo.get_active_qr_token.return_value = None

    with pytest.raises(AuthError, match="QR token is invalid or expired"):
        auth_service.activate_qr("invalid-token")


def test_refresh_session_success(auth_service, mock_repo):
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=30)

    user_id = uuid.uuid4()
    mock_session = MagicMock()
    mock_session.user_id = user_id
    mock_session.device_id_hash = None
    mock_session.expires_at = future
    mock_repo.get_active_session_by_refresh_hash.return_value = mock_session

    user = MagicMock()
    user.id = user_id
    user.status = UserStatus.ACTIVE
    user.role = UserRole.USER
    mock_repo.get_user_by_id.return_value = user

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.refresh_session_days = 30

        with patch("app.modules.auth.domain.services._utcnow", return_value=now):
            with patch.object(
                auth_service,
                "_issue_session_tokens",
                return_value=AuthResponse(access_token="new_token", refresh_token="new_refresh"),
            ):
                response = auth_service.refresh_session("valid-refresh-token")

    assert isinstance(response, AuthResponse)


def test_refresh_session_fails_invalid_token(auth_service, mock_repo):
    mock_repo.get_active_session_by_refresh_hash.return_value = None

    with pytest.raises(AuthError, match="Refresh token is invalid or expired"):
        auth_service.refresh_session("invalid-token")


def test_refresh_session_rotates_token(auth_service, mock_repo):
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=30)

    user_id = uuid.uuid4()
    old_session = MagicMock()
    old_session.user_id = user_id
    old_session.device_id_hash = None
    old_session.expires_at = future
    mock_repo.get_active_session_by_refresh_hash.return_value = old_session

    user = MagicMock()
    user.id = user_id
    user.status = UserStatus.ACTIVE
    user.role = UserRole.USER
    mock_repo.get_user_by_id.return_value = user

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.refresh_session_days = 30

        with patch("app.modules.auth.domain.services._utcnow", return_value=now):
            with patch.object(
                auth_service,
                "_issue_session_tokens",
                return_value=AuthResponse(access_token="new_token", refresh_token="new_refresh"),
            ):
                auth_service.refresh_session("old-refresh-token")

    mock_repo.revoke_session.assert_called_once()


def test_logout_success(auth_service, mock_repo):
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=30)

    mock_session = MagicMock()
    mock_session.expires_at = future
    mock_repo.get_active_session_by_refresh_hash.return_value = mock_session

    with patch("app.modules.auth.domain.services._utcnow", return_value=now):
        auth_service.logout("valid-refresh-token")

    mock_repo.revoke_session.assert_called_once()


def test_logout_noop_for_invalid_token(auth_service, mock_repo):
    mock_repo.get_active_session_by_refresh_hash.return_value = None

    result = auth_service.logout("invalid-token")
    assert result is None
