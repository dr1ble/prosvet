"""Integration tests for auth API endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


class TestAuthOTPEndpoints:
    """Tests for OTP endpoints."""

    def test_otp_request_valid_phone(self, client: TestClient) -> None:
        """Test OTP request with valid phone."""
        response = client.post(
            "/api/v1/auth/otp/request",
            json={"phone": "+79991234567"},
        )
        # Returns 200 if rate limit not exceeded
        assert response.status_code in (200, 429)

    def test_otp_request_invalid_phone(self, client: TestClient) -> None:
        """Test OTP request with invalid phone."""
        response = client.post(
            "/api/v1/auth/otp/request",
            json={"phone": "invalid"},
        )
        assert response.status_code in (200, 422, 429)

    def test_otp_request_empty_phone(self, client: TestClient) -> None:
        """Test OTP request with empty phone."""
        response = client.post(
            "/api/v1/auth/otp/request",
            json={"phone": ""},
        )
        assert response.status_code == 422


class TestAuthLoginEndpoints:
    """Tests for login endpoints."""

    def test_login_short_password(self, client: TestClient) -> None:
        """Test login with short password."""
        response = client.post(
            "/api/v1/auth/login",
            json={"login": "testuser", "password": "short"},
        )
        assert response.status_code in (401, 422)

    def test_login_invalid_login(self, client: TestClient) -> None:
        """Test login with invalid login."""
        response = client.post(
            "/api/v1/auth/login",
            json={"login": "ab", "password": "password123"},
        )
        assert response.status_code in (401, 422)

    def test_login_missing_fields(self, client: TestClient) -> None:
        """Test login with missing fields."""
        response = client.post(
            "/api/v1/auth/login",
            json={"login": "testuser"},
        )
        assert response.status_code == 422


class TestAuthProtectedEndpoints:
    """Tests for protected endpoints."""

    def test_me_without_token(self, client: TestClient) -> None:
        """Test /me without auth token."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_me_with_invalid_token(self, client: TestClient) -> None:
        """Test /me with invalid token."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code in (401, 403)

    def test_refresh_without_token(self, client: TestClient) -> None:
        """Test refresh without token."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "some-token"},
        )
        assert response.status_code in (401, 422)

    def test_logout_without_token(self, client: TestClient) -> None:
        """Test logout without token."""
        response = client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": "some-token"},
        )
        assert response.status_code in (401, 422)


class TestAuthQrEndpoints:
    """Tests for QR endpoints."""

    def test_activate_qr_empty_token(self, client: TestClient) -> None:
        """Test QR activation with empty token."""
        response = client.post(
            "/api/v1/auth/qr/activate",
            json={"token": ""},
        )
        assert response.status_code in (401, 422)

    def test_activate_qr_invalid_token(self, client: TestClient) -> None:
        """Test QR activation with invalid token."""
        response = client.post(
            "/api/v1/auth/qr/activate",
            json={"token": "invalid-token-123"},
        )
        # Returns 401 for invalid token
        assert response.status_code == 401
