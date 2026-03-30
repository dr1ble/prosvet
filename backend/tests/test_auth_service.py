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


def test_login_fails_invalid_login(auth_service):
    with pytest.raises(AuthError, match="Invalid credentials"):
        auth_service.login("ab", "password123")


def test_login_fails_short_password(auth_service):
    with pytest.raises(AuthError, match="Invalid credentials"):
        auth_service.login("testuser", "short")


def test_login_fails_user_not_found(auth_service, mock_repo):
    mock_repo.get_user_by_login.return_value = None

    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.admin_login = ""
        mock_settings.admin_password = None

        with pytest.raises(AuthError, match="Invalid credentials"):
            auth_service.login("testuser", "password123")


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
