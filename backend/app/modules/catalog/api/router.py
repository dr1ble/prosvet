from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.modules.catalog.api.schemas import (
    CourseBundleOut,
    CourseCreateIn,
    CourseListQuery,
    CourseOut,
    CourseReleaseCreateIn,
    CourseReleaseOut,
    ReleaseScreenOut,
)
from app.modules.catalog.domain.errors import CatalogError
from app.modules.catalog.domain.services import CatalogService
from app.modules.catalog.infra.models import Course, CourseRelease, CourseReleaseScreen
from app.shared.db.deps import get_db

router = APIRouter()


def _to_course_out(course: Course) -> CourseOut:
    return CourseOut.model_validate(course)


def _to_release_out(release: CourseRelease, screen_count: int) -> CourseReleaseOut:
    return CourseReleaseOut(
        id=release.id,
        course_id=release.course_id,
        version=release.version,
        changelog=release.changelog,
        status=release.status,
        published_at=release.published_at,
        created_at=release.created_at,
        screen_count=screen_count,
    )


def _to_screen_out(screen: CourseReleaseScreen) -> ReleaseScreenOut:
    return ReleaseScreenOut(
        id=screen.id,
        release_id=screen.release_id,
        screen_key=screen.screen_key,
        title=screen.title,
        order_index=screen.order_index,
        payload=screen.payload_json,
        checksum=screen.checksum,
        created_at=screen.created_at,
    )


@router.get("/courses", response_model=list[CourseOut])
def list_courses(
    include_drafts: bool = Query(default=False),
    include_archived: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[CourseOut]:
    query = CourseListQuery(include_drafts=include_drafts, include_archived=include_archived)
    service = CatalogService(db)
    courses = service.list_courses(query)
    return [_to_course_out(course) for course in courses]


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreateIn, db: Session = Depends(get_db)) -> CourseOut:
    service = CatalogService(db)
    try:
        course = service.create_course(payload)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_course_out(course)


@router.post(
    "/courses/{course_id}/releases",
    response_model=CourseReleaseOut,
    status_code=status.HTTP_201_CREATED,
)
def create_course_release(
    course_id: UUID,
    payload: CourseReleaseCreateIn,
    db: Session = Depends(get_db),
) -> CourseReleaseOut:
    service = CatalogService(db)
    try:
        release, screens, _ = service.create_release(course_id=course_id, payload=payload)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_release_out(release, screen_count=len(screens))


@router.get("/courses/{course_slug}/releases/latest", response_model=CourseBundleOut)
def get_latest_course_release(course_slug: str, db: Session = Depends(get_db)) -> CourseBundleOut:
    service = CatalogService(db)
    try:
        course, release, screens = service.get_latest_course_bundle(course_slug=course_slug)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return CourseBundleOut(
        course=_to_course_out(course),
        release=_to_release_out(release, screen_count=len(screens)),
        screens=[_to_screen_out(screen) for screen in screens],
    )
