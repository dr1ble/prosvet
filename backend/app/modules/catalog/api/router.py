from pathlib import Path
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse

from app.core.config import settings
from app.modules.catalog.api.schemas import (
    CourseBundleOut,
    CourseCreateIn,
    CourseListQuery,
    CourseOut,
    CourseReleaseCreateIn,
    CourseReleaseOut,
    ReleaseListQuery,
    ReleaseScreenOut,
)
from app.modules.catalog.domain.errors import CatalogError
from app.modules.catalog.infra.models import Course, CourseRelease, CourseReleaseScreen
from app.shared.auth.deps import require_policy
from app.shared.auth.schemas import CurrentActor
from app.shared.di.services import CatalogServiceDep

router = APIRouter()
COVER_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


def _catalog_covers_dir() -> Path:
    return Path(settings.simulation_media_dir).resolve().parent / "catalog_covers"


def _resolve_course_cover_path(course_slug: str) -> Path | None:
    normalized = course_slug.strip().lower()
    if not normalized or any(char in normalized for char in ("/", "\\", "..")):
        return None

    covers_dir = _catalog_covers_dir()
    for extension in COVER_MEDIA_TYPES:
        candidate = covers_dir / f"{normalized}{extension}"
        if candidate.is_file():
            return candidate
    return None


def _to_course_out(course: Course, request: Request) -> CourseOut:
    cover_url = None
    if _resolve_course_cover_path(course.slug) is not None:
        cover_url = str(request.url_for("catalog_course_cover", course_slug=course.slug))

    return CourseOut(
        id=course.id,
        slug=course.slug,
        title=course.title,
        description=course.description,
        cover_url=cover_url,
        status=course.status,
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


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
    request: Request,
    service: CatalogServiceDep,
    include_drafts: bool = Query(default=False),
    include_archived: bool = Query(default=False),
) -> list[CourseOut]:
    query = CourseListQuery(include_drafts=include_drafts, include_archived=include_archived)
    courses = service.list_courses(query)
    return [_to_course_out(course, request) for course in courses]


@router.get("/courses/{course_slug}/cover", include_in_schema=False, name="catalog_course_cover")
def get_course_cover_file(course_slug: str) -> FileResponse:
    cover_path = _resolve_course_cover_path(course_slug)
    if cover_path is None:
        raise HTTPException(status_code=404, detail="Course cover not found.")

    media_type = COVER_MEDIA_TYPES.get(cover_path.suffix.lower(), "application/octet-stream")
    return FileResponse(path=cover_path, media_type=media_type)


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    request: Request,
    payload: CourseCreateIn,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(
        require_policy("catalog.write")
    ),
) -> CourseOut:
    try:
        course = service.create_course(payload)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_course_out(course, request)


@router.post(
    "/courses/{course_id}/releases",
    response_model=CourseReleaseOut,
    status_code=status.HTTP_201_CREATED,
)
def create_course_release(
    course_id: UUID,
    payload: CourseReleaseCreateIn,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(
        require_policy("catalog.write")
    ),
) -> CourseReleaseOut:
    try:
        release, screens, _ = service.create_release(course_id=course_id, payload=payload)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_release_out(release, screen_count=len(screens))


@router.get("/courses/{course_id}/releases", response_model=list[CourseReleaseOut])
def list_course_releases(
    course_id: UUID,
    service: CatalogServiceDep,
    release_status: Literal["draft", "published"] | None = Query(default=None, alias="status"),
    version_query: str | None = Query(default=None, max_length=32),
    limit: int = Query(default=50, ge=1, le=200),
    _actor: CurrentActor = Depends(require_policy("catalog.releases.read")),
) -> list[CourseReleaseOut]:
    query = ReleaseListQuery(
        status=release_status,
        version_query=version_query,
        limit=limit,
    )
    try:
        releases = service.list_course_releases(course_id=course_id, query=query)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return [_to_release_out(release, screen_count=screen_count) for release, screen_count in releases]


@router.get("/courses/{course_slug}/releases/latest", response_model=CourseBundleOut)
def get_latest_course_release(
    course_slug: str,
    service: CatalogServiceDep,
    request: Request,
) -> CourseBundleOut:
    try:
        course, release, screens = service.get_latest_course_bundle(course_slug=course_slug)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return CourseBundleOut(
        course=_to_course_out(course, request),
        release=_to_release_out(release, screen_count=len(screens)),
        screens=[_to_screen_out(screen) for screen in screens],
    )
