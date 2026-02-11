"""Unit tests for CatalogService."""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.modules.catalog.api.schemas import (
    CourseCreateIn,
    CourseListQuery,
    CourseReleaseCreateIn,
    ReleaseListQuery,
)
from app.modules.catalog.domain.errors import CatalogError
from app.modules.catalog.domain.services import CatalogService
from app.modules.catalog.infra.models import (
    Course,
    CourseRelease,
    CourseReleaseScreen,
    CourseStatus,
    ReleaseStatus,
)


@pytest.fixture
def mock_repo():
    """Mock CatalogRepository."""
    return MagicMock()


@pytest.fixture
def catalog_service():
    """CatalogService instance (no DB session needed for unit tests)."""
    mock_db = MagicMock()
    service = CatalogService(mock_db)
    return service


def test_list_courses_all(catalog_service, mock_repo):
    """Should list all courses when no filters specified."""
    mock_course = MagicMock(spec=Course)
    mock_repo.list_courses.return_value = [mock_course]
    
    query = CourseListQuery(include_drafts=True, include_archived=True)
    result = catalog_service.list_courses(query)
    
    assert len(result) == 1
    mock_repo.list_courses.assert_called_once()


def test_list_courses_excludes_drafts_by_default(catalog_service, mock_repo):
    """Should exclude drafts by default."""
    mock_repo.list_courses.return_value = []
    
    query = CourseListQuery()
    catalog_service.list_courses(query)
    
    mock_repo.list_courses.assert_called_once_with(include_drafts=False, include_archived=False)


def test_list_courses_with_filters(catalog_service, mock_repo):
    """Should apply filters correctly."""
    mock_repo.list_courses.return_value = []
    
    query = CourseListQuery(include_drafts=True, include_archived=False)
    catalog_service.list_courses(query)
    
    mock_repo.list_courses.assert_called_once_with(include_drafts=True, include_archived=False)


def test_create_course_success(catalog_service, mock_repo):
    """Should create course successfully."""
    mock_repo.get_course_by_slug.return_value = None
    mock_repo.create_course.return_value = MagicMock()
    
    payload = CourseCreateIn(
        slug="test-course",
        title="Test Course",
        description="Test description",
        status=CourseStatus.DRAFT.value,
    )
    
    result = catalog_service.create_course(payload)
    
    assert result is not None
    mock_repo.create_course.assert_called_once()


def test_create_course_fails_duplicate_slug(catalog_service, mock_repo):
    """Should fail if course slug already exists."""
    existing_course = MagicMock(spec=Course)
    mock_repo.get_course_by_slug.return_value = existing_course
    
    payload = CourseCreateIn(
        slug="existing-course",
        title="Existing Course",
        description="Description",
        status=CourseStatus.DRAFT.value,
    )
    
    with pytest.raises(CatalogError, match="slug already exists"):
        catalog_service.create_course(payload)


def test_create_course_fails_empty_slug(catalog_service, mock_repo):
    """Should fail if slug is empty after normalization."""
    mock_repo.get_course_by_slug.return_value = None
    
    payload = CourseCreateIn(
        slug="   ",
        title="Empty Slug Course",
        description="Description",
        status=CourseStatus.DRAFT.value,
    )
    
    with pytest.raises(CatalogError, match="empty after normalization"):
        catalog_service.create_course(payload)


def test_create_release_success(catalog_service, mock_repo, course_id):
    """Should create release successfully."""
    course = MagicMock(spec=Course)
    course.id = course_id
    mock_repo.get_course_by_id.return_value = course
    mock_repo.get_release_by_version.return_value = None
    
    screens = []
    
    payload = CourseReleaseCreateIn(
        version="1.0.0",
        changelog="Initial release",
        status=ReleaseStatus.PUBLISHED.value,
        screens=screens,
    )
    
    with patch.object(catalog_service.db, "commit"):
        with patch("app.modules.catalog.domain.services._validate_screens"):
            result = catalog_service.create_release(course_id, payload)
    
    assert result is not None
    mock_repo.create_release.assert_called_once()


def test_create_release_fails_course_not_found(catalog_service, mock_repo, course_id):
    """Should fail if course not found."""
    mock_repo.get_course_by_id.return_value = None
    
    payload = CourseReleaseCreateIn(
        version="1.0.0",
        changelog="Initial release",
        status=ReleaseStatus.PUBLISHED.value,
        screens=[],
    )
    
    with pytest.raises(CatalogError, match="Course not found"):
        catalog_service.create_release(course_id, payload)


def test_create_release_fails_duplicate_version(catalog_service, mock_repo, course_id):
    """Should fail if release with version already exists."""
    course = MagicMock(spec=Course)
    course.id = course_id
    mock_repo.get_course_by_id.return_value = course
    
    existing_release = MagicMock(spec=CourseRelease)
    mock_repo.get_release_by_version.return_value = existing_release
    
    payload = CourseReleaseCreateIn(
        version="1.0.0",
        changelog="Duplicate",
        status=ReleaseStatus.PUBLISHED.value,
        screens=[],
    )
    
    with pytest.raises(CatalogError, match="version already exists"):
        catalog_service.create_release(course_id, payload)


def test_get_latest_course_bundle_success(catalog_service, mock_repo):
    """Should get latest course bundle successfully."""
    mock_repo.get_course_by_slug.return_value = MagicMock(spec=Course)
    
    release = MagicMock(spec=CourseRelease)
    release.id = uuid.uuid4()
    release.version = "1.0.0"
    
    screens = [
        MagicMock(spec=CourseReleaseScreen),
    ]
    
    mock_repo.get_latest_published_release.return_value = release
    mock_repo.list_release_screens.return_value = screens
    
    result = catalog_service.get_latest_course_bundle("published-course")
    
    assert result is not None
    assert len(result) == 3


def test_get_latest_course_bundle_fails_course_not_found(catalog_service, mock_repo):
    """Should fail if course not found."""
    mock_repo.get_course_by_slug.return_value = None
    
    with pytest.raises(CatalogError, match="Course not found"):
        catalog_service.get_latest_course_bundle("nonexistent-course")


def test_get_latest_course_bundle_fails_no_published_release(catalog_service, mock_repo):
    """Should fail if course has no published release."""
    mock_repo.get_course_by_slug.return_value = MagicMock(spec=Course)
    mock_repo.get_latest_published_release.return_value = None
    
    with pytest.raises(CatalogError, match="Published release not found"):
        catalog_service.get_latest_course_bundle("draft-course")


def test_list_course_releases(catalog_service, mock_repo, course_id):
    """Should list course releases."""
    mock_repo.get_course_by_id.return_value = MagicMock(spec=Course)
    mock_repo.list_releases.return_value = []
    
    query = ReleaseListQuery()
    result = catalog_service.list_course_releases(course_id, query)
    
    assert result is not None
    mock_repo.list_releases.assert_called_once()
