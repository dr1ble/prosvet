"""Integration tests for simulation API endpoints."""


def test_get_current_draft_requires_auth(api_client) -> None:
    response = api_client.get("/api/v1/simulation/drafts/current")
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_upsert_current_draft_requires_auth(api_client) -> None:
    response = api_client.post(
        "/api/v1/simulation/drafts/current",
        json={"title": "Draft", "payload_json": {}},
    )
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_list_media_requires_auth(api_client) -> None:
    response = api_client.get(
        "/api/v1/simulation/media",
        params={
            "app_package_name": "com.example.app",
            "min_supported_version": "1.0",
            "max_supported_version": "2.0",
        },
    )
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_list_media_apps_requires_auth(api_client) -> None:
    response = api_client.get("/api/v1/simulation/media/apps")
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_upload_media_requires_auth(api_client) -> None:
    response = api_client.post(
        "/api/v1/simulation/media/upload",
        params={
            "app_package_name": "com.example.app",
            "min_supported_version": "1.0",
            "max_supported_version": "2.0",
        },
        files={"file": ("x.txt", b"hello", "text/plain")},
    )
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_get_media_file_requires_auth(api_client) -> None:
    response = api_client.get("/api/v1/simulation/media/00000000-0000-0000-0000-000000000000/file")
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_library_requires_auth(api_client) -> None:
    response = api_client.get("/api/v1/simulation/library")
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_create_library_item_requires_auth(api_client) -> None:
    response = api_client.post(
        "/api/v1/simulation/library",
        json={"title": "Item", "payload_json": {}},
    )
    assert response.status_code in (401, 403)
    assert "detail" in response.json()


def test_update_library_item_requires_auth(api_client) -> None:
    response = api_client.patch(
        "/api/v1/simulation/library/00000000-0000-0000-0000-000000000000",
        json={"title": "Item", "payload_json": {}},
    )
    assert response.status_code in (401, 403)
    assert "detail" in response.json()
