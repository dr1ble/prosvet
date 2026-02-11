"""Shared fixtures for backend tests."""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Generator
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.modules.auth.infra.models import Base as AuthBase
from app.modules.auth.infra.models import (
    OtpChallenge,
    QrLoginToken,
    UserSession,
)
from app.modules.catalog.infra.models import Base as CatalogBase
from app.modules.catalog.infra.models import Course, CourseRelease, CourseReleaseScreen
from app.modules.simulation.infra.models import Base as SimulationBase
from app.modules.users.models import User, UserRole


# Use main database (test database needs pg_hba config for external creation)
# For isolated tests, use mock repositories instead of real DB
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    settings.database_url.replace("localhost", "127.0.0.1")
)


@pytest.fixture(scope="session")
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
    """Create a new database session for each test."""
    SessionLocal = sessionmaker(bind=test_engine)
    
    session = SessionLocal()
    try:
        yield session
        session.rollback()
    finally:
        session.close()


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
    user.phone_hash = "test_phone_hash"
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
    user.phone_hash = "admin_phone_hash"
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
