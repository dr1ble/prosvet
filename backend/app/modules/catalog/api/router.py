from pathlib import Path
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse

from app.core.config import settings
from app.modules.catalog.api.schemas import (
    CourseBundleOut,
    CourseCreateIn,
    CourseLessonCreateIn,
    CourseLessonOut,
    CourseLessonReorderIn,
    CourseLessonUpdateIn,
    CourseListQuery,
    CourseOut,
    CoursePublishIn,
    CourseReleaseCreateIn,
    CourseReleaseOut,
    LessonTaskCreateIn,
    LessonTaskOut,
    LessonTaskReorderIn,
    LessonTaskUpdateIn,
    ReleaseListQuery,
    ReleaseScreenOut,
)
from app.modules.catalog.domain.errors import CatalogError
from app.modules.catalog.infra.models import (
    Course,
    CourseLesson,
    CourseRelease,
    CourseReleaseScreen,
    LessonTask,
)
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


def _to_lesson_out(lesson: CourseLesson) -> CourseLessonOut:
    return CourseLessonOut(
        id=lesson.id,
        course_id=lesson.course_id,
        title=lesson.title,
        description=lesson.description,
        order_index=lesson.order_index,
        status=lesson.status,
        created_at=lesson.created_at,
        updated_at=lesson.updated_at,
    )


def _to_task_out(task: LessonTask) -> LessonTaskOut:
    return LessonTaskOut(
        id=task.id,
        lesson_id=task.lesson_id,
        task_type=task.task_type,
        title=task.title,
        order_index=task.order_index,
        required=task.required,
        payload=task.payload_json,
        checksum=task.checksum,
        created_at=task.created_at,
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


@router.get("/courses/{course_id}/lessons", response_model=list[CourseLessonOut])
def list_course_lessons(
    course_id: UUID,
    service: CatalogServiceDep,
    include_archived: bool = Query(default=False),
    _actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> list[CourseLessonOut]:
    try:
        lessons = service.list_course_lessons(course_id, include_archived=include_archived)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return [_to_lesson_out(lesson) for lesson in lessons]


@router.post(
    "/courses/{course_id}/lessons",
    response_model=CourseLessonOut,
    status_code=status.HTTP_201_CREATED,
)
def create_course_lesson(
    course_id: UUID,
    payload: CourseLessonCreateIn,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseLessonOut:
    try:
        lesson = service.create_course_lesson(
            course_id=course_id,
            title=payload.title,
            description=payload.description,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_lesson_out(lesson)


@router.patch("/lessons/{lesson_id}", response_model=CourseLessonOut)
def update_course_lesson(
    lesson_id: UUID,
    payload: CourseLessonUpdateIn,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseLessonOut:
    try:
        lesson = service.update_course_lesson(
            lesson_id=lesson_id,
            title=payload.title,
            description=payload.description,
            status=payload.status,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_lesson_out(lesson)


@router.delete("/lessons/{lesson_id}", response_model=CourseLessonOut)
def archive_course_lesson(
    lesson_id: UUID,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseLessonOut:
    try:
        lesson = service.archive_course_lesson(lesson_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_lesson_out(lesson)


@router.post("/lessons/{lesson_id}/restore", response_model=CourseLessonOut)
def restore_course_lesson(
    lesson_id: UUID,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseLessonOut:
    try:
        lesson = service.restore_course_lesson(lesson_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_lesson_out(lesson)


@router.post("/courses/{course_id}/lessons/{lesson_id}/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_course_lesson(
    course_id: UUID,
    lesson_id: UUID,
    payload: CourseLessonReorderIn,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> None:
    try:
        service.reorder_course_lesson(course_id, lesson_id, payload.order_index)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/lessons/{lesson_id}/tasks", response_model=list[LessonTaskOut])
def list_lesson_tasks(
    lesson_id: UUID,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> list[LessonTaskOut]:
    try:
        tasks = service.list_lesson_tasks(lesson_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return [_to_task_out(task) for task in tasks]


@router.post("/lessons/{lesson_id}/tasks", response_model=LessonTaskOut, status_code=status.HTTP_201_CREATED)
def create_lesson_task(
    lesson_id: UUID,
    payload: LessonTaskCreateIn,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> LessonTaskOut:
    try:
        task = service.create_lesson_task(
            lesson_id=lesson_id,
            task_type=payload.task_type,
            title=payload.title,
            required=payload.required,
            payload=payload.payload,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_task_out(task)


@router.patch("/tasks/{task_id}", response_model=LessonTaskOut)
def update_lesson_task(
    task_id: UUID,
    payload: LessonTaskUpdateIn,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> LessonTaskOut:
    try:
        task = service.update_lesson_task(
            task_id=task_id,
            title=payload.title,
            required=payload.required,
            payload=payload.payload,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_task_out(task)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_lesson_task(
    task_id: UUID,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> None:
    try:
        service.archive_lesson_task(task_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/lessons/{lesson_id}/tasks/{task_id}/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_lesson_task(
    lesson_id: UUID,
    task_id: UUID,
    payload: LessonTaskReorderIn,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> None:
    try:
        service.reorder_lesson_task(lesson_id, task_id, payload.order_index)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/tasks/{task_id}/duplicate", response_model=LessonTaskOut, status_code=status.HTTP_201_CREATED)
def duplicate_lesson_task(
    task_id: UUID,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> LessonTaskOut:
    try:
        task = service.duplicate_lesson_task(task_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_task_out(task)


@router.get("/courses/{course_id}/structure")
def get_course_structure(
    course_id: UUID,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> dict[str, Any]:
    try:
        return service.get_course_structure(course_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/courses/{course_id}/validate")
def validate_course(
    course_id: UUID,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> dict[str, Any]:
    try:
        return service.validate_course(course_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/courses/{course_id}/publish", response_model=CourseReleaseOut, status_code=status.HTTP_201_CREATED)
def publish_course(
    course_id: UUID,
    payload: CoursePublishIn,
    service: CatalogServiceDep,
    _actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseReleaseOut:
    try:
        release = service.publish_course(
            course_id=course_id,
            version=payload.version,
            changelog=payload.changelog,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_release_out(release, screen_count=0)
