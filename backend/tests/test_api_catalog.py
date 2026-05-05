"""Integration tests for catalog API endpoints."""

from app.core.config import settings
from app.modules.users.models import UserRole
from app.shared.auth.deps import get_current_actor


def test_list_courses_public(api_client, dependency_overrider, actor_factory) -> None:
    with dependency_overrider({get_current_actor: lambda: actor_factory(UserRole.ADMINISTRATOR)}):
        response = api_client.get("/api/v1/catalog/courses")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    if payload:
        sample = payload[0]
        assert "id" in sample
        assert "slug" in sample
        assert "title" in sample
        assert "status" in sample


def test_list_courses_with_flags(api_client, dependency_overrider, actor_factory) -> None:
    with dependency_overrider({get_current_actor: lambda: actor_factory(UserRole.ADMINISTRATOR)}):
        response = api_client.get(
            "/api/v1/catalog/courses",
            params={"include_drafts": "true", "include_archived": "false"},
        )
    assert response.status_code == 200


def test_get_course_cover_file_returns_png(api_client, tmp_path, monkeypatch) -> None:
    storage_root = tmp_path / "storage"
    simulation_media_dir = storage_root / "simulation_media"
    simulation_media_dir.mkdir(parents=True)
    covers_dir = storage_root / "catalog_covers"
    covers_dir.mkdir(parents=True)
    expected = b"mock-png-data"
    (covers_dir / "gosuslugi-basic.png").write_bytes(expected)

    monkeypatch.setattr(settings, "simulation_media_dir", str(simulation_media_dir))

    response = api_client.get("/api/v1/catalog/courses/gosuslugi-basic/cover")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content == expected


def test_get_course_cover_file_returns_404_when_missing(api_client, tmp_path, monkeypatch) -> None:
    storage_root = tmp_path / "storage"
    simulation_media_dir = storage_root / "simulation_media"
    simulation_media_dir.mkdir(parents=True)

    monkeypatch.setattr(settings, "simulation_media_dir", str(simulation_media_dir))

    response = api_client.get("/api/v1/catalog/courses/missing-course/cover")
    assert response.status_code == 404
    assert response.json()["detail"] == "Обложка курса не найдена."


def test_get_latest_release_not_found(api_client) -> None:
    response = api_client.get("/api/v1/catalog/courses/non-existent/releases/latest")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_create_course_requires_auth(api_client) -> None:
    response = api_client.post(
        "/api/v1/catalog/courses",
        json={
            "slug": "test-course",
            "title": "Test Course",
            "description": "desc",
            "status": "draft",
        },
    )
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_list_releases_requires_auth(api_client) -> None:
    response = api_client.get(
        "/api/v1/catalog/courses/00000000-0000-0000-0000-000000000000/releases"
    )
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_create_release_requires_auth(api_client) -> None:
    response = api_client.post(
        "/api/v1/catalog/courses/00000000-0000-0000-0000-000000000000/releases",
        json={
            "version": "1.0.0",
            "status": "draft",
            "screens": [
                {
                    "screen_key": "intro",
                    "title": "Intro",
                    "order_index": 1,
                    "payload": {"k": "v"},
                }
            ],
        },
    )
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_create_release_invalid_payload_without_auth(api_client) -> None:
    response = api_client.post(
        "/api/v1/catalog/courses/00000000-0000-0000-0000-000000000000/releases",
        json={"version": "bad"},
    )
    assert response.status_code in (401, 403, 422)
