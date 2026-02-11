"""Unit tests for AuthService."""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.core.config import settings
from app.modules.auth.api.schemas import AuthResponse
from app.modules.auth.domain.errors import AuthError
from app.modules.auth.domain.services import AuthService
from app.modules.users.models import UserRole, UserStatus


@pytest.fixture
def mock_repo():
    """Mock AuthRepository."""
    return MagicMock()


@pytest.fixture
def auth_service():
    """AuthService instance (no DB session needed for unit tests)."""
    mock_db = MagicMock()
    service = AuthService(mock_db)
    return service


def test_request_otp_creates_challenge(auth_service, mock_repo):
    """OTP request should create a new challenge."""
    mock_repo.get_latest_challenge.return_value = None
    mock_repo.create_challenge.return_value = MagicMock(id=uuid.uuid4())
    
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        
        challenge_id, dev_code = auth_service.request_otp("+79991234567")
    
    assert challenge_id is not None
    mock_repo.create_challenge.assert_called_once()


def test_request_otp_returns_dev_code_in_debug(auth_service, mock_repo):
    """OTP request should return dev code in debug mode."""
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.debug_return_otp_code = True
        mock_settings.security_pepper = "pepper"
        
        mock_repo.get_latest_challenge.return_value = None
        mock_repo.create_challenge.return_value = MagicMock(id=uuid.uuid4())
        
        with patch("app.modules.auth.domain.services._generate_otp_code", return_value="123456"):
            challenge_id, dev_code = auth_service.request_otp("+79991234567")
    
    assert dev_code == "123456"


def test_request_otp_blocks_after_rate_limit(auth_service, mock_repo):
    """OTP request should be blocked if user is rate limited."""
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.otp_block_minutes = 15
        
        blocked_time = datetime.now(timezone.utc) + timedelta(minutes=5)
        mock_settings._get_instance.return_value = mock_settings
        
        mock_challenge = MagicMock()
        mock_challenge.blocked_until = blocked_time
        
        with patch("app.modules.auth.domain.services._utcnow", return_value=blocked_time):
            mock_repo.get_latest_challenge.return_value = mock_challenge
        
        with pytest.raises(AuthError, match="temporarily blocked"):
            auth_service.request_otp("+79991234567")


def test_login_success_existing_user(auth_service, mock_repo, active_user):
    """Login should succeed with correct credentials for existing user."""
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        
        with patch("app.modules.auth.domain.services.verify_password", return_value=True):
            mock_repo.get_user_by_login.return_value = active_user
            
            with patch.object(auth_service, "_issue_session_tokens", return_value=AuthResponse(access_token="token", refresh_token="refresh")):
                response = auth_service.login("testuser", "password123")
                
                assert isinstance(response, AuthResponse)
                assert response.access_token is not None
                assert response.refresh_token is not None


def test_login_fails_invalid_login(auth_service, mock_repo):
    """Login should fail with invalid login."""
    with pytest.raises(AuthError, match="Invalid credentials"):
        auth_service.login("ab", "password123")


def test_login_fails_short_password(auth_service, mock_repo):
    """Login should fail with short password."""
    with pytest.raises(AuthError, match="Invalid credentials"):
        auth_service.login("testuser", "short")


def test_login_fails_user_not_found(auth_service, mock_repo):
    """Login should fail if user not found and cannot bootstrap."""
    mock_repo.get_user_by_login.return_value = None
    
    with patch("app.modules.auth.domain.services.AuthService._bootstrap_admin_if_needed", return_value=None):
        with pytest.raises(AuthError, match="Invalid credentials"):
            auth_service.login("testuser", "password123")


def test_login_fails_blocked_user(auth_service, mock_repo):
    """Login should fail for blocked user."""
    user = MagicMock()
    user.status = UserStatus.BLOCKED
    user.role = UserRole.USER
    
    with patch("app.modules.auth.domain.services.verify_password", return_value=True):
        mock_repo.get_user_by_login.return_value = user
        
        with pytest.raises(AuthError, match="Invalid credentials"):
            auth_service.login("testuser", "password123")


def test_login_fails_wrong_password(auth_service, mock_repo, active_user):
    """Login should fail with wrong password."""
    with patch("app.modules.auth.domain.services.verify_password", return_value=False):
        mock_repo.get_user_by_login.return_value = active_user
        
        with pytest.raises(AuthError, match="Invalid credentials"):
            auth_service.login("testuser", "wrongpassword")


def test_verify_otp_success(auth_service, mock_repo):
    """OTP verification should succeed with correct code."""
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.otp_max_attempts = 5
        
        mock_challenge = MagicMock()
        mock_challenge.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        mock_challenge.failed_attempts = 0
        
        mock_repo.get_latest_challenge.return_value = mock_challenge
        
        user = MagicMock()
        user.id = uuid.uuid4()
        user.role = UserRole.USER
        user.status = UserStatus.ACTIVE
        
        with patch("app.modules.auth.domain.services.stable_hash", return_value="code_hash"):
            with patch("app.modules.auth.domain.services.AuthService._resolve_role_for_phone", return_value=UserRole.USER):
                with patch.object(auth_service, "_issue_session_tokens", return_value=AuthResponse(access_token="token", refresh_token="refresh")):
                    with patch.object(auth_service.repo, "get_or_create_user_by_phone", return_value=user):
                        with patch.object(auth_service.db, "commit"):
                            response = auth_service.verify_otp("+79991234567", "123456")
                            
                            assert isinstance(response, AuthResponse)


def test_verify_otp_fails_challenge_not_found(auth_service, mock_repo):
    """OTP verification should fail if challenge not found."""
    mock_repo.get_latest_challenge.return_value = None
    
    with pytest.raises(AuthError, match="OTP challenge not found"):
        auth_service.verify_otp("+79991234567", "123456")


def test_verify_otp_fails_expired_code(auth_service, mock_repo):
    """OTP verification should fail for expired code."""
    mock_challenge = MagicMock()
    mock_challenge.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    mock_repo.get_latest_challenge.return_value = mock_challenge
    
    with pytest.raises(AuthError, match="OTP expired"):
        auth_service.verify_otp("+79991234567", "123456")


def test_verify_otp_fails_invalid_code(auth_service, mock_repo):
    """OTP verification should fail with invalid code."""
    mock_challenge = MagicMock()
    mock_challenge.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    mock_challenge.failed_attempts = 0
    
    mock_repo.get_latest_challenge.return_value = mock_challenge
    
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        
        with patch("app.modules.auth.domain.services.stable_hash", return_value="wrong_hash"):
            with pytest.raises(AuthError, match="Invalid OTP code"):
                auth_service.verify_otp("+79991234567", "123456")


def test_activate_qr_success(auth_service, mock_repo):
    """QR token activation should succeed with valid token."""
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        
        mock_token = MagicMock()
        mock_token.expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        mock_token.used_at = None
        mock_token.user_id = uuid.uuid4()
        
        user = MagicMock()
        user.id = mock_token.user_id
        user.role = UserRole.USER
        user.status = UserStatus.ACTIVE
        
        mock_repo.get_qr_token.return_value = mock_token
        mock_repo.get_user.return_value = user
        
        with patch.object(auth_service, "_issue_session_tokens", return_value=AuthResponse(access_token="token", refresh_token="refresh")):
            with patch.object(auth_service.db, "commit"):
                response = auth_service.activate_qr("valid-token")
                
                assert isinstance(response, AuthResponse)
                assert mock_token.used_at is not None


def test_activate_qr_fails_invalid_token(auth_service, mock_repo):
    """QR token activation should fail with invalid token."""
    mock_repo.get_qr_token.return_value = None
    
    with pytest.raises(AuthError, match="QR token is invalid or expired"):
        auth_service.activate_qr("invalid-token")


def test_activate_qr_fails_expired_token(auth_service, mock_repo):
    """QR token activation should fail for expired token."""
    mock_token = MagicMock()
    mock_token.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    mock_repo.get_qr_token.return_value = mock_token
    
    with pytest.raises(AuthError, match="QR token is invalid or expired"):
        auth_service.activate_qr("expired-token")


def test_activate_qr_fails_already_used(auth_service, mock_repo):
    """QR token activation should fail if token already used."""
    mock_token = MagicMock()
    mock_token.expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    mock_token.used_at = datetime.now(timezone.utc)
    mock_repo.get_qr_token.return_value = mock_token
    
    with pytest.raises(AuthError, match="QR token is invalid or expired"):
        auth_service.activate_qr("used-token")


def test_refresh_session_success(auth_service, mock_repo):
    """Session refresh should succeed with valid token."""
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        
        mock_token = MagicMock()
        mock_token.user_id = uuid.uuid4()
        mock_token.user_role = UserRole.USER
        mock_token.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        user = MagicMock()
        user.status = UserStatus.ACTIVE
        
        mock_repo.get_refresh_token.return_value = mock_token
        mock_repo.get_user.return_value = user
        
        with patch.object(auth_service, "_issue_session_tokens", return_value=AuthResponse(access_token="new_token", refresh_token="new_refresh")):
            with patch.object(auth_service.db, "commit"):
                response = auth_service.refresh_session("valid-refresh-token")
                
                assert isinstance(response, AuthResponse)


def test_refresh_session_fails_invalid_token(auth_service, mock_repo):
    """Session refresh should fail with invalid token."""
    mock_repo.get_refresh_token.return_value = None
    
    with pytest.raises(AuthError, match="Refresh token is invalid or expired"):
        auth_service.refresh_session("invalid-token")


def test_refresh_session_rotates_token(auth_service, mock_repo):
    """Session refresh should rotate refresh token."""
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        
        old_token = MagicMock()
        old_token.user_id = uuid.uuid4()
        old_token.user_role = UserRole.USER
        old_token.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        user = MagicMock()
        user.status = UserStatus.ACTIVE
        
        mock_repo.get_refresh_token.return_value = old_token
        mock_repo.get_user.return_value = user
        
        with patch.object(auth_service, "_issue_session_tokens", return_value=AuthResponse(access_token="new_token", refresh_token="new_refresh")):
            with patch.object(auth_service.db, "commit"):
                response = auth_service.refresh_session("old-refresh-token")
                
                mock_repo.delete_refresh_token.assert_called_once()


def test_logout_success(auth_service, mock_repo):
    """Logout should succeed with valid token."""
    mock_token = MagicMock()
    mock_repo.get_refresh_token.return_value = mock_token
    
    with patch.object(auth_service.db, "commit"):
        auth_service.logout("valid-refresh-token")
    
    mock_repo.delete_refresh_token.assert_called_once()


def test_logout_fails_invalid_token(auth_service, mock_repo):
    """Logout should fail with invalid token."""
    mock_repo.get_refresh_token.return_value = None
    
    with pytest.raises(AuthError, match="Refresh token is invalid or expired"):
        auth_service.logout("invalid-token")
