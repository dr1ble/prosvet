"""End-to-end tests for the course builder flow.

Covers the full lifecycle:
  1. Create course (POST /courses)
  2. Get course structure (GET /courses/{id}/structure)
  3. Bulk update structure (POST /courses/{id}/structure/bulk)
  4. Validate course (POST /courses/{id}/validate)
  5. Publish course (POST /courses/{id}/publish)
  6. List releases (GET /courses/{id}/releases)
"""

import uuid
from uuid import uuid4

import pytest

from app.main import app
from app.modules.users.models import UserRole
from app.shared.auth.deps import get_current_actor, require_policy
from app.shared.auth.schemas import CurrentActor
from app.shared.db.deps import get_db
from app.shared.di.services import _create_catalog_service

# ---------------------------------------------------------------------------
# Real-DB catalog service stub that uses the actual database
# ---------------------------------------------------------------------------


class _RealCatalogServiceStub:
    """Stub that delegates to real DB via SQLAlchemy session injected by FastAPI."""

    def __init__(self, db_session):
        from app.modules.catalog.domain.services import CatalogService

        self._service = CatalogService(db_session)

    def list_courses(self, query):
        return self._service.list_courses(query)

    def create_course(self, payload):
        return self._service.create_course(payload)

    def update_course(self, course_id, payload):
        return self._service.update_course(course_id, payload)

    def create_release(self, course_id, payload):
        return self._service.create_release(course_id, payload)

    def list_course_releases(self, course_id, query):
        return self._service.list_course_releases(course_id, query)

    def get_latest_course_bundle(self, course_slug):
        return self._service.get_latest_course_bundle(course_slug)

    def list_course_lessons(self, course_id, include_archived=False):
        return self._service.list_course_lessons(course_id, include_archived)

    def create_course_lesson(self, course_id, title, description, status="draft"):
        return self._service.create_course_lesson(course_id, title, description, status)

    def update_course_lesson(self, lesson_id, title=None, description=None, status=None):
        return self._service.update_course_lesson(lesson_id, title, description, status)

    def archive_course_lesson(self, lesson_id):
        return self._service.archive_course_lesson(lesson_id)

    def restore_course_lesson(self, lesson_id):
        return self._service.restore_course_lesson(lesson_id)

    def reorder_course_lesson(self, course_id, lesson_id, new_index):
        return self._service.reorder_course_lesson(course_id, lesson_id, new_index)

    def create_lesson_task(self, lesson_id, task_type, title, required, payload):
        return self._service.create_lesson_task(lesson_id, task_type, title, required, payload)

    def update_lesson_task(self, task_id, title=None, required=None, payload=None):
        return self._service.update_lesson_task(task_id, title, required, payload)

    def archive_lesson_task(self, task_id):
        return self._service.archive_lesson_task(task_id)

    def reorder_lesson_task(self, lesson_id, task_id, new_index):
        return self._service.reorder_lesson_task(lesson_id, task_id, new_index)

    def duplicate_lesson_task(self, task_id):
        return self._service.duplicate_lesson_task(task_id)

    def list_lesson_tasks(self, lesson_id):
        return self._service.list_lesson_tasks(lesson_id)

    def get_course_structure(self, course_id):
        return self._service.get_course_structure(course_id)

    def validate_course(self, course_id):
        return self._service.validate_course(course_id)

    def publish_course(self, course_id, version, changelog=None):
        return self._service.publish_course(course_id, version, changelog)

    def update_course_structure_bulk(self, course_id, payload):
        return self._service.update_course_structure_bulk(course_id, payload)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def admin_actor():
    """Return an admin CurrentActor."""
    return CurrentActor(user_id=uuid4(), role=UserRole.ADMINISTRATOR)


@pytest.fixture()
def builder_client(db_session, admin_actor):
    """TestClient with real DB service and admin auth override.
    
    Overrides get_db to use the test's session WITHOUT auto-commit,
    so all DB operations within a test share the same session and
    can be rolled back together at test end.
    """
    from collections.abc import Generator

    from fastapi.testclient import TestClient
    from sqlalchemy.orm import Session

    stub = _RealCatalogServiceStub(db_session)

    def _test_db() -> Generator[Session, None, None]:
        """Yield the test session without auto-commit."""
        yield db_session

    original_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_actor] = lambda: admin_actor
    app.dependency_overrides[_create_catalog_service] = lambda: stub
    app.dependency_overrides[get_db] = _test_db

    # Override all policy checks for admin
    for policy_key in (
        "catalog.read",
        "catalog.write",
        "catalog.releases.read",
        "simulation.builder",
    ):
        app.dependency_overrides[require_policy(policy_key)] = lambda: admin_actor

    client = TestClient(app, raise_server_exceptions=False)
    try:
        yield client
    finally:
        app.dependency_overrides = original_overrides


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _create_course_json(slug: str) -> dict:
    return {
        "slug": f"{slug}-{uuid4().hex[:8]}",
        "title": slug.replace("-", " ").title(),
        "status": "draft",
    }


# ---------------------------------------------------------------------------
# 1. Create course
# ---------------------------------------------------------------------------


class TestCreateCourse:
    def test_create_course_success(self, builder_client):
        resp = builder_client.post(
            "/api/v1/catalog/courses",
            json={
                "slug": "test-course-builder-1",
                "title": "Test Course Builder 1",
                "description": "A test course",
                "status": "draft",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Test Course Builder 1"
        assert data["slug"] == "test-course-builder-1"
        assert data["status"] == "draft"
        assert "id" in data

    def test_create_course_missing_slug_422(self, builder_client):
        resp = builder_client.post(
            "/api/v1/catalog/courses",
            json={"title": "No Slug", "status": "draft"},
        )
        assert resp.status_code == 422

    def test_create_course_duplicate_slug_409(self, builder_client):
        slug = "test-course-dup"
        resp1 = builder_client.post(
            "/api/v1/catalog/courses",
            json={"slug": slug, "title": "First", "status": "draft"},
        )
        assert resp1.status_code == 201

        resp2 = builder_client.post(
            "/api/v1/catalog/courses",
            json={"slug": slug, "title": "Second", "status": "draft"},
        )
        assert resp2.status_code == 409

    def test_create_course_short_title_422(self, builder_client):
        resp = builder_client.post(
            "/api/v1/catalog/courses",
            json={"slug": "short-title", "title": "AB", "status": "draft"},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 2. Course structure (read)
# ---------------------------------------------------------------------------


class TestCourseStructure:
    def test_empty_course_structure(self, builder_client):
        course = self._create(builder_client, "struct-empty")
        resp = builder_client.get(f"/api/v1/catalog/courses/{course['id']}/structure")
        assert resp.status_code == 200
        data = resp.json()
        assert data["course_id"] == course["id"]
        assert data["course_title"] == "Struct Empty"
        assert data["lessons"] == []

    def test_structure_with_lessons_and_tasks(self, builder_client):
        course = self._create(builder_client, "struct-full")
        course_id = course["id"]

        resp = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Lesson 1",
                        "description": "First lesson",
                        "order_index": 0,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "theory_text",
                                "title": "Theory",
                                "order_index": 0,
                                "required": True,
                                "payload": {"content": "<p>Hello world</p>"},
                            },
                            {
                                "id": None,
                                "task_type": "quiz",
                                "title": "Quiz",
                                "order_index": 1,
                                "required": True,
                                "payload": {
                                    "questions": [
                                        {
                                            "question": "What is 2+2?",
                                            "type": "single_choice",
                                            "options": [
                                                {"text": "3", "correct": False},
                                                {"text": "4", "correct": True},
                                            ],
                                        }
                                    ]
                                },
                            },
                        ],
                    },
                    {
                        "id": None,
                        "title": "Lesson 2",
                        "description": None,
                        "order_index": 1,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "theory_video",
                                "title": "Video",
                                "order_index": 0,
                                "required": False,
                                "payload": {
                                    "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                },
                            }
                        ],
                    },
                ]
            },
        )
        assert resp.status_code == 200
        bulk = resp.json()
        assert len(bulk["lessons"]) == 2

        # Verify structure returns all data including payloads
        resp = builder_client.get(f"/api/v1/catalog/courses/{course_id}/structure")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["lessons"]) == 2

        l1 = data["lessons"][0]
        assert l1["title"] == "Lesson 1"
        assert len(l1["tasks"]) == 2
        assert l1["tasks"][0]["task_type"] == "theory_text"
        assert l1["tasks"][0]["payload"] == {"content": "<p>Hello world</p>"}
        assert l1["tasks"][1]["task_type"] == "quiz"
        assert l1["tasks"][1]["payload"]["questions"][0]["question"] == "What is 2+2?"

        l2 = data["lessons"][1]
        assert l2["title"] == "Lesson 2"
        assert len(l2["tasks"]) == 1
        assert l2["tasks"][0]["task_type"] == "theory_video"
        assert (
            l2["tasks"][0]["payload"]["video_url"]
            == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        )

    def test_structure_nonexistent_course_404(self, builder_client):
        fake_id = str(uuid.uuid4())
        resp = builder_client.get(f"/api/v1/catalog/courses/{fake_id}/structure")
        assert resp.status_code == 404

    @staticmethod
    def _create(client, slug: str) -> dict:
        resp = client.post("/api/v1/catalog/courses", json=_create_course_json(slug))
        assert resp.status_code == 201
        return resp.json()


# ---------------------------------------------------------------------------
# 3. Bulk update structure
# ---------------------------------------------------------------------------


class TestBulkUpdateStructure:
    def test_bulk_create_lessons_and_tasks(self, builder_client):
        course = self._create(builder_client, "bulk-create")
        course_id = course["id"]

        resp = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "New Lesson",
                        "description": "desc",
                        "order_index": 0,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "cheat_sheet",
                                "title": "Cheat Sheet",
                                "order_index": 0,
                                "required": True,
                                "payload": {"content": "<p>Important info</p>"},
                            }
                        ],
                    }
                ]
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["lessons"]) == 1
        assert len(data["lessons"][0]["tasks"]) == 1
        assert data["lessons"][0]["tasks"][0]["task_type"] == "cheat_sheet"

    def test_bulk_update_existing_lesson(self, builder_client):
        course = self._create(builder_client, "bulk-update")
        course_id = course["id"]

        resp1 = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Original",
                        "description": None,
                        "order_index": 0,
                        "tasks": [],
                    }
                ]
            },
        )
        lesson_id = resp1.json()["lessons"][0]["id"]

        resp2 = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": lesson_id,
                        "title": "Updated Title",
                        "description": "New description",
                        "order_index": 0,
                        "tasks": [],
                    }
                ]
            },
        )
        assert resp2.status_code == 200
        assert resp2.json()["lessons"][0]["title"] == "Updated Title"
        assert resp2.json()["lessons"][0]["description"] == "New description"

    def test_bulk_archive_removed_lesson(self, builder_client):
        course = self._create(builder_client, "bulk-archive")
        course_id = course["id"]

        resp1 = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Keep Me",
                        "description": None,
                        "order_index": 0,
                        "tasks": [],
                    },
                    {
                        "id": None,
                        "title": "Remove Me",
                        "description": None,
                        "order_index": 1,
                        "tasks": [],
                    },
                ]
            },
        )
        keep_id = resp1.json()["lessons"][0]["id"]

        resp2 = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": keep_id,
                        "title": "Keep Me",
                        "description": None,
                        "order_index": 0,
                        "tasks": [],
                    }
                ]
            },
        )
        assert resp2.status_code == 200
        assert len(resp2.json()["lessons"]) == 1

    def test_bulk_update_nonexistent_course_404(self, builder_client):
        fake_id = str(uuid.uuid4())
        resp = builder_client.post(
            f"/api/v1/catalog/courses/{fake_id}/structure/bulk",
            json={"lessons": []},
        )
        assert resp.status_code == 404

    @staticmethod
    def _create(client, slug: str) -> dict:
        resp = client.post("/api/v1/catalog/courses", json=_create_course_json(slug))
        assert resp.status_code == 201
        return resp.json()


# ---------------------------------------------------------------------------
# 4. Validate course
# ---------------------------------------------------------------------------


class TestValidateCourse:
    def test_valid_course_passes(self, builder_client):
        course = self._create(builder_client, "valid-course")
        course_id = course["id"]

        builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Lesson",
                        "description": None,
                        "order_index": 0,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "theory_text",
                                "title": "Theory",
                                "order_index": 0,
                                "required": True,
                                "payload": {"content": "<p>This is a long enough content for validation</p>"},
                            }
                        ],
                    }
                ]
            },
        )

        resp = builder_client.post(f"/api/v1/catalog/courses/{course_id}/validate")
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert len(data["errors"]) == 0

    def test_empty_course_fails(self, builder_client):
        course = self._create(builder_client, "empty-course")
        resp = builder_client.post(f"/api/v1/catalog/courses/{course['id']}/validate")
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is False
        assert any(e["type"] == "empty_course" for e in data["errors"])

    def test_empty_lesson_fails(self, builder_client):
        course = self._create(builder_client, "empty-lesson")
        builder_client.post(
            f"/api/v1/catalog/courses/{course['id']}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Empty Lesson",
                        "description": None,
                        "order_index": 0,
                        "tasks": [],
                    }
                ]
            },
        )
        resp = builder_client.post(f"/api/v1/catalog/courses/{course['id']}/validate")
        data = resp.json()
        assert data["valid"] is False
        assert any(e["type"] == "empty_lesson" for e in data["errors"])

    def test_empty_quiz_fails(self, builder_client):
        course = self._create(builder_client, "empty-quiz")
        builder_client.post(
            f"/api/v1/catalog/courses/{course['id']}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Quiz Lesson",
                        "description": None,
                        "order_index": 0,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "quiz",
                                "title": "Empty Quiz",
                                "order_index": 0,
                                "required": True,
                                "payload": {"questions": []},
                            }
                        ],
                    }
                ]
            },
        )
        resp = builder_client.post(f"/api/v1/catalog/courses/{course['id']}/validate")
        data = resp.json()
        assert data["valid"] is False
        assert any(e["type"] == "invalid_quiz" for e in data["errors"])

    def test_missing_video_url_fails(self, builder_client):
        course = self._create(builder_client, "missing-video")
        builder_client.post(
            f"/api/v1/catalog/courses/{course['id']}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Video Lesson",
                        "description": None,
                        "order_index": 0,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "theory_video",
                                "title": "No URL",
                                "order_index": 0,
                                "required": True,
                                "payload": {"video_url": ""},
                            }
                        ],
                    }
                ]
            },
        )
        resp = builder_client.post(f"/api/v1/catalog/courses/{course['id']}/validate")
        data = resp.json()
        assert data["valid"] is False
        assert any(e["type"] == "invalid_video" for e in data["errors"])

    @staticmethod
    def _create(client, slug: str) -> dict:
        resp = client.post("/api/v1/catalog/courses", json=_create_course_json(slug))
        assert resp.status_code == 201
        return resp.json()


# ---------------------------------------------------------------------------
# 5. Publish course
# ---------------------------------------------------------------------------


class TestPublishCourse:
    def test_publish_valid_course(self, builder_client):
        course = self._create(builder_client, "publish-valid")
        course_id = course["id"]

        builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Lesson",
                        "description": None,
                        "order_index": 0,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "theory_text",
                                "title": "Theory",
                                "order_index": 0,
                                "required": True,
                                "payload": {"content": "<p>Long enough content for publishing</p>"},
                            }
                        ],
                    }
                ]
            },
        )

        resp = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/publish",
            json={"version": "1.0.0", "changelog": "Initial release"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["version"] == "1.0.0"
        assert data["status"] == "published"

    def test_publish_invalid_course_422(self, builder_client):
        course = self._create(builder_client, "publish-invalid")
        resp = builder_client.post(
            f"/api/v1/catalog/courses/{course['id']}/publish",
            json={"version": "1.0.0"},
        )
        assert resp.status_code == 422

    def test_publish_duplicate_version_409(self, builder_client):
        course = self._create(builder_client, "publish-dup")
        course_id = course["id"]

        builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Lesson",
                        "description": None,
                        "order_index": 0,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "theory_text",
                                "title": "Theory",
                                "order_index": 0,
                                "required": True,
                                "payload": {"content": "<p>Enough content here for sure</p>"},
                            }
                        ],
                    }
                ]
            },
        )

        resp1 = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/publish",
            json={"version": "2.0.0", "changelog": "First"},
        )
        assert resp1.status_code == 201

        resp2 = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/publish",
            json={"version": "2.0.0", "changelog": "Second"},
        )
        assert resp2.status_code == 409

    def test_publish_nonexistent_course_404(self, builder_client):
        fake_id = str(uuid.uuid4())
        resp = builder_client.post(
            f"/api/v1/catalog/courses/{fake_id}/publish",
            json={"version": "1.0.0"},
        )
        assert resp.status_code == 404

    @staticmethod
    def _create(client, slug: str) -> dict:
        resp = client.post("/api/v1/catalog/courses", json=_create_course_json(slug))
        assert resp.status_code == 201
        return resp.json()


# ---------------------------------------------------------------------------
# 6. List releases
# ---------------------------------------------------------------------------


class TestListReleases:
    def test_list_releases_after_publish(self, builder_client):
        course = self._create(builder_client, "list-releases")
        course_id = course["id"]

        builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Lesson",
                        "description": None,
                        "order_index": 0,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "theory_text",
                                "title": "Theory",
                                "order_index": 0,
                                "required": True,
                                "payload": {"content": "<p>Content for release listing test</p>"},
                            }
                        ],
                    }
                ]
            },
        )

        builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/publish",
            json={"version": "1.0.0"},
        )
        builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/publish",
            json={"version": "1.1.0", "changelog": "Update"},
        )

        resp = builder_client.get(f"/api/v1/catalog/courses/{course_id}/releases")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        versions = [r["version"] for r in data]
        assert "1.0.0" in versions
        assert "1.1.0" in versions

    def test_list_releases_empty(self, builder_client):
        course = self._create(builder_client, "no-releases")
        resp = builder_client.get(f"/api/v1/catalog/courses/{course['id']}/releases")
        assert resp.status_code == 200
        assert resp.json() == []

    @staticmethod
    def _create(client, slug: str) -> dict:
        resp = client.post("/api/v1/catalog/courses", json=_create_course_json(slug))
        assert resp.status_code == 201
        return resp.json()


# ---------------------------------------------------------------------------
# 7. Full end-to-end flow
# ---------------------------------------------------------------------------


class TestFullCourseBuilderFlow:
    """Complete lifecycle: create -> edit -> validate -> publish."""

    def test_full_flow(self, builder_client):
        # Step 1: Create course
        resp = builder_client.post(
            "/api/v1/catalog/courses",
            json={
                "slug": "full-flow-course",
                "title": "Full Flow Test Course",
                "description": "Testing the complete builder flow",
                "status": "draft",
            },
        )
        assert resp.status_code == 201
        course = resp.json()
        course_id = course["id"]

        # Step 2: Verify empty structure
        resp = builder_client.get(f"/api/v1/catalog/courses/{course_id}/structure")
        assert resp.status_code == 200
        assert resp.json()["lessons"] == []

        # Step 3: Add lessons with various task types
        resp = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/structure/bulk",
            json={
                "lessons": [
                    {
                        "id": None,
                        "title": "Введение",
                        "description": "Intro lesson",
                        "order_index": 0,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "theory_text",
                                "title": "Теория",
                                "order_index": 0,
                                "required": True,
                                "payload": {"content": "<h1>Введение</h1><p>Добро пожаловать в курс.</p>"},
                            },
                            {
                                "id": None,
                                "task_type": "quiz",
                                "title": "Проверка знаний",
                                "order_index": 1,
                                "required": True,
                                "payload": {
                                    "questions": [
                                        {
                                            "question": "Сколько будет 2+2?",
                                            "type": "single_choice",
                                            "options": [
                                                {"text": "3", "correct": False},
                                                {"text": "4", "correct": True},
                                                {"text": "5", "correct": False},
                                            ],
                                        }
                                    ]
                                },
                            },
                        ],
                    },
                    {
                        "id": None,
                        "title": "Практика",
                        "description": None,
                        "order_index": 1,
                        "tasks": [
                            {
                                "id": None,
                                "task_type": "theory_video",
                                "title": "Видеоурок",
                                "order_index": 0,
                                "required": True,
                                "payload": {
                                    "video_url": "https://www.youtube.com/watch?v=abc123",
                                    "transcript": "Video transcript",
                                },
                            },
                            {
                                "id": None,
                                "task_type": "cheat_sheet",
                                "title": "Шпаргалка",
                                "order_index": 1,
                                "required": False,
                                "payload": {"content": "<p>Основные формулы и правила</p>"},
                            },
                        ],
                    },
                ]
            },
        )
        assert resp.status_code == 200
        bulk = resp.json()
        assert len(bulk["lessons"]) == 2
        assert len(bulk["lessons"][0]["tasks"]) == 2
        assert len(bulk["lessons"][1]["tasks"]) == 2

        # Step 4: Verify structure returns payloads
        resp = builder_client.get(f"/api/v1/catalog/courses/{course_id}/structure")
        assert resp.status_code == 200
        structure = resp.json()
        assert len(structure["lessons"]) == 2
        l1_tasks = structure["lessons"][0]["tasks"]
        assert l1_tasks[0]["payload"]["content"] == "<h1>Введение</h1><p>Добро пожаловать в курс.</p>"
        assert l1_tasks[1]["payload"]["questions"][0]["question"] == "Сколько будет 2+2?"

        # Step 5: Validate — should pass
        resp = builder_client.post(f"/api/v1/catalog/courses/{course_id}/validate")
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert len(data["errors"]) == 0

        # Step 6: Publish
        resp = builder_client.post(
            f"/api/v1/catalog/courses/{course_id}/publish",
            json={"version": "1.0.0", "changelog": "Первый релиз"},
        )
        assert resp.status_code == 201
        release = resp.json()
        assert release["version"] == "1.0.0"
        assert release["status"] == "published"

        # Step 7: Verify release is listed
        resp = builder_client.get(f"/api/v1/catalog/courses/{course_id}/releases")
        assert resp.status_code == 200
        releases = resp.json()
        assert len(releases) == 1
        assert releases[0]["version"] == "1.0.0"
