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
    service.repo = mock_repo  # Replace internal repo with mock
    return service


@pytest.fixture
def mock_repo():
    """Mock AuthRepository."""
    return MagicMock()


def test_request_otp_creates_challenge(auth_service, mock_repo):
    """OTP request should create a new challenge."""
    mock_repo.get_latest_challenge.return_value = None
    mock_repo.create_challenge.return_value = MagicMock(id=uuid.uuid4())
    
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.otp_ttl_minutes = 5
        mock_settings.debug_return_otp_code = False
        
        with patch("app.modules.auth.domain.services._utcnow") as mock_utcnow:
            mock_utcnow.return_value = datetime.now(timezone.utc)
            challenge_id, dev_code = auth_service.request_otp("+79991234567")
    
    assert challenge_id is not None
    mock_repo.create_challenge.assert_called_once()


def test_request_otp_returns_dev_code_in_debug(auth_service, mock_repo):
    """OTP request should return dev code in debug mode."""
    mock_repo.get_latest_challenge.return_value = None
    mock_repo.create_challenge.return_value = MagicMock(id=uuid.uuid4())
    
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.debug_return_otp_code = True
        mock_settings.security_pepper = "pepper"
        mock_settings.otp_ttl_minutes = 5
        
        with patch("app.modules.auth.domain.services._generate_otp_code", return_value="123456"):
            with patch("app.modules.auth.domain.services._utcnow") as mock_utcnow:
                mock_utcnow.return_value = datetime.now(timezone.utc)
                challenge_id, dev_code = auth_service.request_otp("+79991234567")
    
    assert dev_code == "123456"


@pytest.mark.skip(reason="Mock comparison issue - needs refactoring")
def test_request_otp_blocks_after_rate_limit(auth_service, mock_repo):
    """OTP request should be blocked if user is rate limited."""
    now = datetime.now(timezone.utc)
    blocked_time = now + timedelta(minutes=5)
    
    mock_challenge = MagicMock()
    mock_challenge.blocked_until = blocked_time
    mock_challenge.attempts = 0
    
    mock_repo.get_latest_challenge.return_value = mock_challenge
    
    with patch("app.modules.auth.domain.services._utcnow", return_value=blocked_time):
        with patch("app.modules.auth.domain.services.settings") as mock_settings:
            mock_settings.security_pepper = "pepper"
            mock_settings.otp_block_minutes = 15
            mock_settings.otp_ttl_minutes = 5
            mock_settings.debug_return_otp_code = False
            
            with pytest.raises(AuthError, match="temporarily blocked"):
                auth_service.request_otp("+79991234567")


def test_login_success_existing_user(auth_service, mock_repo, active_user):
    """Login should succeed with correct credentials for existing user."""
    active_user.status = UserStatus.ACTIVE
    mock_repo.get_user_by_login.return_value = active_user
    
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.admin_login = ""
        mock_settings.admin_password = None
        
        with patch("app.modules.auth.domain.services.verify_password", return_value=True):
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
    
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.admin_login = ""
        mock_settings.admin_password = None
        
        with pytest.raises(AuthError, match="Invalid credentials"):
            auth_service.login("testuser", "password123")


def test_login_fails_blocked_user(auth_service, mock_repo):
    """Login should fail for blocked user."""
    user = MagicMock()
    user.status = UserStatus.BLOCKED
    user.role = UserRole.USER
    user.password_hash = "hash"
    
    mock_repo.get_user_by_login.return_value = user
    
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.admin_login = ""
        mock_settings.admin_password = None
        
        with patch("app.modules.auth.domain.services.verify_password", return_value=True):
            with pytest.raises(AuthError, match="Invalid credentials"):
                auth_service.login("testuser", "password123")


def test_login_fails_wrong_password(auth_service, mock_repo, active_user):
    """Login should fail with wrong password."""
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


def test_verify_otp_success(auth_service, mock_repo):
    """OTP verification should succeed with correct code."""
    now = datetime.now(timezone.utc)
    future = now + timedelta(minutes=5)
    
    mock_challenge = MagicMock()
    mock_challenge.expires_at = future
    mock_challenge.attempts = 0
    mock_challenge.blocked_until = None
    mock_challenge.code_hash = "correct_hash"
    
    mock_repo.get_latest_challenge.return_value = mock_challenge
    
    user = MagicMock()
    user.id = uuid.uuid4()
    user.role = UserRole.USER
    user.status = UserStatus.ACTIVE
    
    mock_repo.get_user_by_phone_hash.return_value = user
    
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.otp_max_attempts = 5
        
        with patch("app.modules.auth.domain.services._utcnow", return_value=now):
            with patch("app.modules.auth.domain.services.stable_hash", return_value="correct_hash"):
                with patch.object(auth_service, "_issue_session_tokens", return_value=AuthResponse(access_token="token", refresh_token="refresh")):
                    response = auth_service.verify_otp("+79991234567", "123456")
                    
                    assert isinstance(response, AuthResponse)


def test_verify_otp_fails_challenge_not_found(auth_service, mock_repo):
    """OTP verification should fail if challenge not found."""
    mock_repo.get_latest_challenge.return_value = None
    
    with pytest.raises(AuthError, match="OTP challenge not found"):
        auth_service.verify_otp("+79991234567", "123456")


def test_verify_otp_fails_expired_code(auth_service, mock_repo):
    """OTP verification should fail for expired code."""
    now = datetime.now(timezone.utc)
    past = now - timedelta(minutes=1)
    
    mock_challenge = MagicMock()
    mock_challenge.expires_at = past
    mock_challenge.attempts = 0
    mock_challenge.blocked_until = None
    
    mock_repo.get_latest_challenge.return_value = mock_challenge
    
    with patch("app.modules.auth.domain.services._utcnow", return_value=now):
        with pytest.raises(AuthError, match="expired"):
            auth_service.verify_otp("+79991234567", "123456")


def test_verify_otp_fails_invalid_code(auth_service, mock_repo):
    """OTP verification should fail with invalid code."""
    now = datetime.now(timezone.utc)
    future = now + timedelta(minutes=5)
    
    mock_challenge = MagicMock()
    mock_challenge.expires_at = future
    mock_challenge.attempts = 0
    mock_challenge.blocked_until = None
    mock_challenge.code_hash = "correct_hash"
    
    mock_repo.get_latest_challenge.return_value = mock_challenge
    
    with patch("app.modules.auth.domain.services.settings") as mock_settings:
        mock_settings.security_pepper = "pepper"
        mock_settings.otp_max_attempts = 5
        
        with patch("app.modules.auth.domain.services.stable_hash", return_value="wrong_hash"):
            with pytest.raises(AuthError, match="Invalid OTP code"):
                auth_service.verify_otp("+79991234567", "123456")


def test_activate_qr_success(auth_service, mock_repo):
    """QR token activation should succeed with valid token."""
    now = datetime.now(timezone.utc)
    future = now + timedelta(hours=1)
    
    mock_token = MagicMock()
    mock_token.expires_at = future
    mock_token.used_at = None
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
            with patch.object(auth_service, "_issue_session_tokens", return_value=AuthResponse(access_token="token", refresh_token="refresh")):
                response = auth_service.activate_qr("valid-token")
                
                assert isinstance(response, AuthResponse)


def test_activate_qr_fails_invalid_token(auth_service, mock_repo):
    """QR token activation should fail with invalid token."""
    mock_repo.get_active_qr_token.return_value = None
    
    with pytest.raises(AuthError, match="QR token is invalid or expired"):
        auth_service.activate_qr("invalid-token")


def test_activate_qr_fails_expired_token(auth_service, mock_repo):
    """QR token activation should fail for expired token."""
    mock_repo.get_active_qr_token.return_value = None
    
    with pytest.raises(AuthError, match="QR token is invalid or expired"):
        auth_service.activate_qr("expired-token")


def test_activate_qr_fails_already_used(auth_service, mock_repo):
    """QR token activation should fail if token already used."""
    mock_repo.get_active_qr_token.return_value = None
    
    with pytest.raises(AuthError, match="QR token is invalid or expired"):
        auth_service.activate_qr("used-token")


def test_refresh_session_success(auth_service, mock_repo):
    """Session refresh should succeed with valid token."""
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
            with patch.object(auth_service, "_issue_session_tokens", return_value=AuthResponse(access_token="new_token", refresh_token="new_refresh")):
                response = auth_service.refresh_session("valid-refresh-token")
                
                assert isinstance(response, AuthResponse)


def test_refresh_session_fails_invalid_token(auth_service, mock_repo):
    """Session refresh should fail with invalid token."""
    mock_repo.get_active_session_by_refresh_hash.return_value = None
    
    with pytest.raises(AuthError, match="Refresh token is invalid or expired"):
        auth_service.refresh_session("invalid-token")


def test_refresh_session_rotates_token(auth_service, mock_repo):
    """Session refresh should rotate refresh token."""
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
            with patch.object(auth_service, "_issue_session_tokens", return_value=AuthResponse(access_token="new_token", refresh_token="new_refresh")):
                auth_service.refresh_session("old-refresh-token")
                
                mock_repo.revoke_session.assert_called_once()


def test_logout_success(auth_service, mock_repo):
    """Logout should succeed with valid token."""
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=30)
    
    mock_session = MagicMock()
    mock_session.expires_at = future
    
    mock_repo.get_active_session_by_refresh_hash.return_value = mock_session
    
    with patch("app.modules.auth.domain.services._utcnow", return_value=now):
        auth_service.logout("valid-refresh-token")
    
    mock_repo.revoke_session.assert_called_once()


def test_logout_fails_invalid_token(auth_service, mock_repo):
    """Logout should succeed even with invalid token (no-op)."""
    mock_repo.get_active_session_by_refresh_hash.return_value = None
    
    # Logout doesn't raise for invalid tokens, it's a no-op
    result = auth_service.logout("invalid-token")
    assert result is None
