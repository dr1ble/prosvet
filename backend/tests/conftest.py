"""Shared fixtures for backend tests."""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Generator

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


# Use test database from environment or override the base URL
# For now, use main database due to pg_hba restrictions
# TODO: Configure pg_hba.conf to allow external database creation
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    settings.database_url.replace("localhost", "127.0.0.1")
)


@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine for the entire test session."""
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
def active_user(db_session: Session, user_id: uuid.UUID) -> User:
    """Create an active user for testing."""
    user = User(
        id=user_id,
        login="testuser",
        phone_hash="test_phone_hash",
        password_hash="hash",
        role=UserRole.USER,
        status="active",
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Create an admin user for testing."""
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        login="admin",
        phone_hash="admin_phone_hash",
        password_hash="hash",
        role=UserRole.ADMINISTRATOR,
        status="active",
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture
def course(db_session: Session, course_id: uuid.UUID) -> Course:
    """Create a test course."""
    course = Course(
        id=course_id,
        slug="test-course",
        title="Test Course",
        description="Test Description",
        status="draft",
    )
    db_session.add(course)
    db_session.flush()
    return course


@pytest.fixture
def published_course(db_session: Session, course_id: uuid.UUID) -> Course:
    """Create a published test course with release."""
    course = Course(
        id=course_id,
        slug="published-course",
        title="Published Course",
        description="Test Description",
        status="published",
    )
    db_session.add(course)
    
    release = CourseRelease(
        id=uuid.uuid4(),
        course_id=course_id,
        version="1.0.0",
        status="published",
        published_at=datetime.now(timezone.utc),
        changelog="Initial release",
    )
    db_session.add(release)
    db_session.flush()
    return course
