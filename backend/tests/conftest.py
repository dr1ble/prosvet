"""Shared fixtures for backend tests."""

import os
import uuid
from collections.abc import Generator
from contextlib import contextmanager
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.main import app
from app.modules.auth.infra.models import Base as AuthBase
from app.modules.catalog.infra.models import Base as CatalogBase
from app.modules.catalog.infra.models import Course, CourseRelease
from app.modules.simulation.infra.models import Base as SimulationBase
from app.modules.users.models import UserRole
from app.shared.auth.schemas import CurrentActor

# Use main database (test database needs pg_hba config for external creation)
# For isolated tests, use mock repositories instead of real DB
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", settings.database_url.replace("localhost", "127.0.0.1")
)


@pytest.fixture(scope="session", autouse=True)
def test_engine():
    """Create test database engine for# entire test session."""
    engine = create_engine(TEST_DATABASE_URL, echo=False)

    # Create all tables
    AuthBase.metadata.create_all(bind=engine)
    CatalogBase.metadata.create_all(bind=engine)
    SimulationBase.metadata.create_all(bind=engine)

    yield engine

    # Drop all tables after session
    SimulationBase.metadata.drop_all(bind=engine)
    CatalogBase.metadata.drop_all(bind=engine)
    AuthBase.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(test_engine) -> Generator[Session, None, None]:
    """Create a new database session wrapped in a rollback-only transaction.

    Uses connection-level transaction that is never committed, ensuring
    complete test isolation. All commits within the test are effectively
    no-ops because the outer transaction is rolled back.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def now() -> datetime:
    """Current UTC datetime for consistent test times."""
    return datetime.now(timezone.utc)


@pytest.fixture
def user_id() -> uuid.UUID:
    """Random user ID for tests."""
    return uuid.uuid4()


@pytest.fixture
def course_id() -> uuid.UUID:
    """Random course ID for tests."""
    return uuid.uuid4()


@pytest.fixture
def active_user():
    """Mock active user for testing (no DB interaction)."""
    user_id = uuid.uuid4()
    user = MagicMock()
    user.id = user_id
    user.login = "testuser"
    user.password_hash = "hash"
    user.role = UserRole.USER
    user.status = "active"
    return user


@pytest.fixture
def admin_user():
    """Mock admin user for testing (no DB interaction)."""
    user_id = uuid.uuid4()
    user = MagicMock()
    user.id = user_id
    user.login = "admin"
    user.password_hash = "hash"
    user.role = UserRole.ADMINISTRATOR
    user.status = "active"
    return user


@pytest.fixture
def course():
    """Mock course for testing (no DB interaction)."""
    course_id = uuid.uuid4()
    course = MagicMock(spec=Course)
    course.id = course_id
    course.slug = "test-course"
    course.title = "Test Course"
    course.description = "Test Description"
    course.status = "draft"
    return course


@pytest.fixture
def published_course():
    """Mock published test course (no DB interaction)."""
    course_id = uuid.uuid4()
    release_id = uuid.uuid4()

    course = MagicMock(spec=Course)
    course.id = course_id
    course.slug = "published-course"
    course.title = "Published Course"
    course.description = "Test Description"
    course.status = "published"

    release = MagicMock(spec=CourseRelease)
    release.id = release_id
    release.version = "1.0.0"
    release.status = "published"
    release.published_at = datetime.now(timezone.utc)
    release.changelog = "Initial release"

    return course


@pytest.fixture
def api_client() -> TestClient:
    """Shared API client for integration tests."""
    return TestClient(app)


@pytest.fixture
def dependency_overrider():
    """Temporarily override FastAPI dependencies in tests."""

    @contextmanager
    def _overrider(overrides: dict):
        previous = dict(app.dependency_overrides)
        app.dependency_overrides.update(overrides)
        try:
            yield
        finally:
            app.dependency_overrides = previous

    return _overrider


@pytest.fixture
def actor_factory():
    """Build CurrentActor for role-based endpoint tests."""

    def _build(role: UserRole) -> CurrentActor:
        return CurrentActor(user_id=uuid.uuid4(), role=role)

    return _build
