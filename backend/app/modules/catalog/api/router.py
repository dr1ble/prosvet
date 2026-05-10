import base64
from pathlib import Path
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.catalog.api.schemas import (
    BulkCourseStructureIn,
    BulkCourseStructureOut,
    CompetencyCreateIn,
    CompetencyOut,
    CompetencyUpdateIn,
    CourseBundleOut,
    CourseCompetenciesUpdateIn,
    CourseCompetencyOut,
    CourseCoverUploadIn,
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
    CourseRollbackIn,
    CourseUpdateIn,
    LessonTaskCreateIn,
    LessonTaskOut,
    LessonTaskReorderIn,
    LessonTaskUpdateIn,
    ReleaseListQuery,
    ReleaseScreenOut,
)
from app.modules.catalog.domain.errors import CatalogError
from app.modules.catalog.infra.models import (
    Competency,
    Course,
    CourseCompetency,
    CourseLesson,
    CourseRelease,
    CourseReleaseScreen,
    LessonTask,
)
from app.modules.users.models import User, UserRole
from app.shared.auth.deps import require_policy
from app.shared.auth.schemas import CurrentActor
from app.shared.db.deps import get_db
from app.shared.di.services import CatalogServiceDep

router = APIRouter()
COVER_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}

_CATALOG_ERROR_RU: dict[str, str] = {
    "Course slug is empty after normalization.": "Код курса не должен быть пустым.",
    "Course slug already exists.": "Курс с таким кодом уже существует.",
    "Course not found.": "Курс не найден.",
    "Only archived courses can be deleted.": "Удалить можно только архивный курс.",
    "Release with this version already exists.": "Релиз с такой версией уже существует.",
    "Published release not found for this course.": "Опубликованная версия курса не найдена.",
    "screen_key values must be unique per release.": "Ключи экранов должны быть уникальны внутри релиза.",
    "order_index values must be unique per release.": "Порядок экранов должен быть уникальным внутри релиза.",
    "Lesson not found.": "Урок не найден.",
    "Failed to update lesson.": "Не удалось обновить урок.",
    "Failed to archive lesson.": "Не удалось архивировать урок.",
    "Failed to restore lesson.": "Не удалось восстановить урок.",
    "Task not found.": "Задание не найдено.",
    "Failed to update task.": "Не удалось обновить задание.",
    "Failed to duplicate task.": "Не удалось продублировать задание.",
    "Cannot publish archived course.": "Нельзя опубликовать архивный курс.",
    "Release version already exists.": "Релиз с такой версией уже существует.",
    "Release not found for this course.": "Релиз для этого курса не найден.",
    "Selected release has no screens.": "В выбранном релизе нет экранов.",
    "Competency title already exists.": "Компетенция с таким названием уже существует.",
    "Competency links must be unique per course.": "Компетенции курса не должны повторяться.",
    "Competency not found.": "Компетенция не найдена.",
    "Invalid course competency type.": "Некорректный тип курса для компетенции.",
}


def _localize_catalog_error(detail: str) -> str:
    return _CATALOG_ERROR_RU.get(detail, detail)


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


def _save_course_cover(course_slug: str, filename: str, content_base64: str) -> Path:
    normalized = course_slug.strip().lower()
    suffix = Path(filename).suffix.lower()
    if suffix not in COVER_MEDIA_TYPES:
        raise HTTPException(status_code=422, detail="Неподдерживаемый формат обложки.")

    covers_dir = _catalog_covers_dir()
    covers_dir.mkdir(parents=True, exist_ok=True)

    for extension in COVER_MEDIA_TYPES:
        candidate = covers_dir / f"{normalized}{extension}"
        if candidate.exists():
            candidate.unlink()

    destination = covers_dir / f"{normalized}{suffix}"
    content = base64.b64decode(content_base64)
    if not content:
        raise HTTPException(status_code=422, detail="Файл обложки пустой.")
    destination.write_bytes(content)
    return destination


def _delete_course_cover(course_slug: str) -> bool:
    cover_path = _resolve_course_cover_path(course_slug)
    if cover_path is None:
        return False
    cover_path.unlink(missing_ok=True)
    return True


def _to_course_out(
    course: Course,
    request: Request,
    author_display_name: str | None = None,
    favorite_course_ids: set[UUID] | None = None,
) -> CourseOut:
    cover_url = None
    if _resolve_course_cover_path(course.slug) is not None:
        cover_url = str(request.url_for("catalog_course_cover", course_slug=course.slug))

    return CourseOut(
        id=course.id,
        author_id=getattr(course, "author_id", None),
        author_display_name=author_display_name,
        slug=course.slug,
        title=course.title,
        description=course.description,
        cover_url=cover_url,
        is_favorite=favorite_course_ids is not None and course.id in favorite_course_ids,
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


def _favorite_course_ids(service: CatalogServiceDep, actor: CurrentActor) -> set[UUID]:
    list_favorite_course_ids = getattr(service.repo, "list_favorite_course_ids", None)
    if list_favorite_course_ids is None:
        return set()
    return list_favorite_course_ids(actor.user_id)


def _to_screen_out(screen: CourseReleaseScreen) -> ReleaseScreenOut:
    lesson_id = screen.payload_json.get("lesson_id") if isinstance(screen.payload_json, dict) else None
    return ReleaseScreenOut(
        id=screen.id,
        release_id=screen.release_id,
        lesson_id=lesson_id,
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


def _to_competency_out(competency: Competency) -> CompetencyOut:
    return CompetencyOut(
        key=competency.key,
        title=competency.title,
        description=competency.description,
        category=competency.category,
        is_active=competency.is_active,
    )


def _to_course_competency_out(
    link: CourseCompetency,
    competencies_by_key: dict[str, Competency],
) -> CourseCompetencyOut:
    competency = competencies_by_key.get(link.competency_key)
    return CourseCompetencyOut(
        competency_key=link.competency_key,
        competency_title=competency.title if competency else link.competency_key,
        competency_description=competency.description if competency else None,
        competency_category=competency.category if competency else None,
        course_type=link.course_type,
    )


def _ensure_methodologist_course_access(
    service: CatalogServiceDep,
    actor: CurrentActor,
    course_id: UUID,
) -> None:
    if actor.role != UserRole.METHODOLOGIST:
        return
    course = service.repo.get_course_by_id(course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Курс не найден.")
    if course.author_id != actor.user_id:
        raise HTTPException(status_code=403, detail="Недостаточно прав для доступа к курсу.")


def _ensure_methodologist_release_access(
    service: CatalogServiceDep,
    actor: CurrentActor,
    release_id: UUID,
) -> None:
    if actor.role != UserRole.METHODOLOGIST:
        return
    release = service.repo.get_release_by_id(release_id)
    if release is None:
        raise HTTPException(status_code=404, detail="Релиз не найден.")
    course = service.repo.get_course_by_id(release.course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Курс не найден.")
    if course.author_id != actor.user_id:
        raise HTTPException(status_code=403, detail="Недостаточно прав для доступа к версии.")


def _ensure_methodologist_lesson_access(
    service: CatalogServiceDep,
    actor: CurrentActor,
    lesson_id: UUID,
) -> None:
    if actor.role != UserRole.METHODOLOGIST:
        return
    lesson = service.repo.get_lesson_by_id(lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Урок не найден.")
    _ensure_methodologist_course_access(service, actor, lesson.course_id)


def _ensure_methodologist_task_access(
    service: CatalogServiceDep,
    actor: CurrentActor,
    task_id: UUID,
) -> None:
    if actor.role != UserRole.METHODOLOGIST:
        return
    task = service.repo.get_task_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задание не найдено.")
    lesson = service.repo.get_lesson_by_id(task.lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Урок не найден.")
    _ensure_methodologist_course_access(service, actor, lesson.course_id)


@router.get("/courses", response_model=list[CourseOut])
def list_courses(
    request: Request,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.read")),
    db: Session = Depends(get_db),
    include_drafts: bool = Query(default=False),
    include_archived: bool = Query(default=False),
) -> list[CourseOut]:
    query = CourseListQuery(include_drafts=include_drafts, include_archived=include_archived)
    courses = service.list_courses(query)
    favorite_course_ids = _favorite_course_ids(service, actor)

    author_ids = {c.author_id for c in courses if c.author_id}
    author_names: dict[UUID, str] = {}
    if author_ids:
        users = db.scalars(select(User).where(User.id.in_(author_ids))).all()
        author_names = {u.id: u.display_name or u.login or str(u.id) for u in users}

    return [
        _to_course_out(
            course,
            request,
            author_names.get(course.author_id) if course.author_id is not None else None,
            favorite_course_ids,
        )
        for course in courses
    ]


@router.get("/courses/favorites", response_model=list[CourseOut])
def list_favorite_courses(
    request: Request,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> list[CourseOut]:
    favorite_course_ids = _favorite_course_ids(service, actor)
    return [
        _to_course_out(course, request, favorite_course_ids=favorite_course_ids)
        for course in service.repo.list_favorite_courses(actor.user_id)
    ]


@router.put("/courses/{course_id}/favorite", response_model=CourseOut)
def add_favorite_course(
    course_id: UUID,
    request: Request,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> CourseOut:
    course = service.repo.get_course_by_id(course_id)
    if course is None or course.status in {"draft", "archived"}:
        raise HTTPException(status_code=404, detail="Курс не найден.")
    service.repo.add_favorite_course(actor.user_id, course_id)
    return _to_course_out(course, request, favorite_course_ids={course_id})


@router.delete("/courses/{course_id}/favorite", response_model=CourseOut)
def remove_favorite_course(
    course_id: UUID,
    request: Request,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> CourseOut:
    course = service.repo.get_course_by_id(course_id)
    if course is None or course.status in {"draft", "archived"}:
        raise HTTPException(status_code=404, detail="Курс не найден.")
    service.repo.remove_favorite_course(actor.user_id, course_id)
    return _to_course_out(course, request, favorite_course_ids=set())


@router.get("/competencies", response_model=list[CompetencyOut])
def list_competencies(
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> list[CompetencyOut]:
    del actor
    return [_to_competency_out(competency) for competency in service.list_competencies()]


@router.post("/competencies", response_model=CompetencyOut, status_code=status.HTTP_201_CREATED)
def create_competency(
    payload: CompetencyCreateIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CompetencyOut:
    del actor
    try:
        competency = service.create_competency(payload)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_competency_out(competency)


@router.patch("/competencies/{competency_key}", response_model=CompetencyOut)
def update_competency(
    competency_key: str,
    payload: CompetencyUpdateIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CompetencyOut:
    del actor
    try:
        competency = service.set_competency_active(competency_key, is_active=payload.is_active)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_competency_out(competency)


@router.get("/courses/{course_id}/competencies", response_model=list[CourseCompetencyOut])
def list_course_competencies(
    course_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> list[CourseCompetencyOut]:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        links = service.list_course_competencies(course_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    competencies = {competency.key: competency for competency in service.list_competencies()}
    return [_to_course_competency_out(link, competencies) for link in links]


@router.put("/courses/{course_id}/competencies", response_model=list[CourseCompetencyOut])
def replace_course_competencies(
    course_id: UUID,
    payload: CourseCompetenciesUpdateIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> list[CourseCompetencyOut]:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        links = service.replace_course_competencies(course_id, payload)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    competencies = {competency.key: competency for competency in service.list_competencies()}
    return [_to_course_competency_out(link, competencies) for link in links]


@router.get("/courses/{course_slug}/cover", include_in_schema=False, name="catalog_course_cover")
def get_course_cover_file(course_slug: str) -> FileResponse:
    cover_path = _resolve_course_cover_path(course_slug)
    if cover_path is None:
        raise HTTPException(status_code=404, detail="Обложка курса не найдена.")

    media_type = COVER_MEDIA_TYPES.get(cover_path.suffix.lower(), "application/octet-stream")
    return FileResponse(path=cover_path, media_type=media_type)


@router.post("/courses/{course_id}/cover", response_model=CourseOut)
def upload_course_cover(
    course_id: UUID,
    request: Request,
    payload: CourseCoverUploadIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseOut:
    _ensure_methodologist_course_access(service, actor, course_id)
    course = service.repo.get_course_by_id(course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Курс не найден.")
    _save_course_cover(course.slug, payload.filename, payload.content_base64)
    return _to_course_out(course, request)


@router.delete("/courses/{course_id}/cover", response_model=CourseOut)
def delete_course_cover(
    course_id: UUID,
    request: Request,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseOut:
    _ensure_methodologist_course_access(service, actor, course_id)
    course = service.repo.get_course_by_id(course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Курс не найден.")
    _delete_course_cover(course.slug)
    return _to_course_out(course, request)


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    request: Request,
    payload: CourseCreateIn,
    service: CatalogServiceDep,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseOut:
    try:
        course = service.create_course(payload, author_id=actor.user_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    from app.modules.users.models import User

    author = db.scalar(select(User).where(User.id == actor.user_id))
    author_name = author.display_name if author else None
    if not author_name and author:
        author_name = author.login
    return _to_course_out(course, request, author_name)


@router.patch("/courses/{course_id}", response_model=CourseOut)
def update_course(
    course_id: UUID,
    request: Request,
    payload: CourseUpdateIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseOut:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        course = service.update_course(course_id=course_id, payload=payload)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_course_out(course, request)


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> None:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        course = service.repo.get_course_by_id(course_id)
        service.delete_course(course_id=course_id)
        if course is not None:
            _delete_course_cover(course.slug)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc


@router.post(
    "/courses/{course_id}/releases",
    response_model=CourseReleaseOut,
    status_code=status.HTTP_201_CREATED,
)
def create_course_release(
    course_id: UUID,
    payload: CourseReleaseCreateIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseReleaseOut:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        release, screens, _ = service.create_release(course_id=course_id, payload=payload)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_release_out(release, screen_count=len(screens))


@router.get("/courses/{course_id}/releases", response_model=list[CourseReleaseOut])
def list_course_releases(
    course_id: UUID,
    service: CatalogServiceDep,
    release_status: Literal["draft", "published"] | None = Query(default=None, alias="status"),
    version_query: str | None = Query(default=None, max_length=32),
    limit: int = Query(default=50, ge=1, le=200),
    actor: CurrentActor = Depends(require_policy("catalog.releases.read")),
) -> list[CourseReleaseOut]:
    _ensure_methodologist_course_access(service, actor, course_id)
    query = ReleaseListQuery(
        status=release_status,
        version_query=version_query,
        limit=limit,
    )
    try:
        releases = service.list_course_releases(course_id=course_id, query=query)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return [
        _to_release_out(release, screen_count=screen_count) for release, screen_count in releases
    ]


@router.get("/courses/{course_slug}/releases/latest", response_model=CourseBundleOut)
def get_latest_course_release(
    course_slug: str,
    service: CatalogServiceDep,
    request: Request,
    actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> CourseBundleOut:
    try:
        course, release, screens = service.get_latest_course_bundle(course_slug=course_slug)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc

    return CourseBundleOut(
        course=_to_course_out(
            course,
            request,
            favorite_course_ids=_favorite_course_ids(service, actor),
        ),
        release=_to_release_out(release, screen_count=len(screens)),
        screens=[_to_screen_out(screen) for screen in screens],
    )


@router.get("/courses/{course_id}/lessons", response_model=list[CourseLessonOut])
def list_course_lessons(
    course_id: UUID,
    service: CatalogServiceDep,
    include_archived: bool = Query(default=False),
    actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> list[CourseLessonOut]:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        lessons = service.list_course_lessons(course_id, include_archived=include_archived)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
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
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseLessonOut:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        lesson = service.create_course_lesson(
            course_id=course_id,
            title=payload.title,
            description=payload.description,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_lesson_out(lesson)


@router.patch("/lessons/{lesson_id}", response_model=CourseLessonOut)
def update_course_lesson(
    lesson_id: UUID,
    payload: CourseLessonUpdateIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseLessonOut:
    _ensure_methodologist_lesson_access(service, actor, lesson_id)
    try:
        lesson = service.update_course_lesson(
            lesson_id=lesson_id,
            title=payload.title,
            description=payload.description,
            status=payload.status,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_lesson_out(lesson)


@router.delete("/lessons/{lesson_id}", response_model=CourseLessonOut)
def archive_course_lesson(
    lesson_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseLessonOut:
    _ensure_methodologist_lesson_access(service, actor, lesson_id)
    try:
        lesson = service.archive_course_lesson(lesson_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_lesson_out(lesson)


@router.post("/lessons/{lesson_id}/restore", response_model=CourseLessonOut)
def restore_course_lesson(
    lesson_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseLessonOut:
    _ensure_methodologist_lesson_access(service, actor, lesson_id)
    try:
        lesson = service.restore_course_lesson(lesson_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_lesson_out(lesson)


@router.post(
    "/courses/{course_id}/lessons/{lesson_id}/reorder", status_code=status.HTTP_204_NO_CONTENT
)
def reorder_course_lesson(
    course_id: UUID,
    lesson_id: UUID,
    payload: CourseLessonReorderIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> None:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        service.reorder_course_lesson(course_id, lesson_id, payload.order_index)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc


@router.get("/lessons/{lesson_id}/tasks", response_model=list[LessonTaskOut])
def list_lesson_tasks(
    lesson_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> list[LessonTaskOut]:
    _ensure_methodologist_lesson_access(service, actor, lesson_id)
    try:
        tasks = service.list_lesson_tasks(lesson_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return [_to_task_out(task) for task in tasks]


@router.post(
    "/lessons/{lesson_id}/tasks", response_model=LessonTaskOut, status_code=status.HTTP_201_CREATED
)
def create_lesson_task(
    lesson_id: UUID,
    payload: LessonTaskCreateIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> LessonTaskOut:
    _ensure_methodologist_lesson_access(service, actor, lesson_id)
    try:
        task = service.create_lesson_task(
            lesson_id=lesson_id,
            task_type=payload.task_type,
            title=payload.title,
            required=payload.required,
            payload=payload.payload,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_task_out(task)


@router.patch("/tasks/{task_id}", response_model=LessonTaskOut)
def update_lesson_task(
    task_id: UUID,
    payload: LessonTaskUpdateIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> LessonTaskOut:
    _ensure_methodologist_task_access(service, actor, task_id)
    try:
        task = service.update_lesson_task(
            task_id=task_id,
            title=payload.title,
            required=payload.required,
            payload=payload.payload,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_task_out(task)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_lesson_task(
    task_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> None:
    _ensure_methodologist_task_access(service, actor, task_id)
    try:
        service.archive_lesson_task(task_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc


@router.post("/lessons/{lesson_id}/tasks/{task_id}/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_lesson_task(
    lesson_id: UUID,
    task_id: UUID,
    payload: LessonTaskReorderIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> None:
    _ensure_methodologist_lesson_access(service, actor, lesson_id)
    _ensure_methodologist_task_access(service, actor, task_id)
    try:
        service.reorder_lesson_task(lesson_id, task_id, payload.order_index)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc


@router.post(
    "/tasks/{task_id}/duplicate", response_model=LessonTaskOut, status_code=status.HTTP_201_CREATED
)
def duplicate_lesson_task(
    task_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> LessonTaskOut:
    _ensure_methodologist_task_access(service, actor, task_id)
    try:
        task = service.duplicate_lesson_task(task_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_task_out(task)


@router.get("/courses/{course_id}/structure")
def get_course_structure(
    course_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.read")),
) -> dict[str, Any]:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        return service.get_course_structure(course_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc


@router.post("/courses/{course_id}/structure/bulk", response_model=BulkCourseStructureOut)
def update_course_structure_bulk(
    course_id: UUID,
    payload: BulkCourseStructureIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> BulkCourseStructureOut:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        result = service.update_course_structure_bulk(course_id, payload)
        return BulkCourseStructureOut(**result)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc


@router.post("/courses/{course_id}/validate")
def validate_course(
    course_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> dict[str, Any]:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        return service.validate_course(course_id)
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc


@router.post(
    "/courses/{course_id}/publish",
    response_model=CourseReleaseOut,
    status_code=status.HTTP_201_CREATED,
)
def publish_course(
    course_id: UUID,
    payload: CoursePublishIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseReleaseOut:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        release = service.publish_course(
            course_id=course_id,
            version=payload.version,
            changelog=payload.changelog,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    return _to_release_out(release, screen_count=0)


@router.post(
    "/courses/{course_id}/submit_for_review",
    response_model=CourseReleaseOut,
    status_code=status.HTTP_201_CREATED,
)
def submit_course_for_review(
    course_id: UUID,
    payload: CoursePublishIn,
    service: CatalogServiceDep,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(require_policy("catalog.release.submit_review")),
) -> CourseReleaseOut:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        release = service.submit_course_for_review(
            course_id=course_id,
            version=payload.version,
            changelog=payload.changelog,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc

    # Record moderation history entry so the release is traceable in the queue.
    from app.modules.moderation.infra.repository import ModerationRepository

    moderation_repo = ModerationRepository(db)
    moderation_repo.create_history_entry(
        release_id=release.id,
        from_status="draft",
        to_status="pending_review",
        actor_user_id=actor.user_id,
        reason=payload.changelog,
    )
    return _to_release_out(release, screen_count=0)


@router.post(
    "/courses/{course_id}/rollback",
    response_model=CourseReleaseOut,
)
def rollback_course_release(
    course_id: UUID,
    payload: CourseRollbackIn,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.write")),
) -> CourseReleaseOut:
    _ensure_methodologist_course_access(service, actor, course_id)
    try:
        release = service.rollback_course(
            course_id=course_id,
            release_id=payload.release_id,
            version=payload.version,
            changelog=payload.changelog,
        )
    except CatalogError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_catalog_error(exc.detail)) from exc
    screens = service.repo.list_release_screens(release.id)
    return _to_release_out(release, screen_count=len(screens))


@router.get("/releases/{release_id}/screens", response_model=list[ReleaseScreenOut])
def get_release_screens(
    release_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.releases.read")),
) -> list[ReleaseScreenOut]:
    _ensure_methodologist_release_access(service, actor, release_id)
    screens = service.repo.list_release_screens(release_id)
    if not screens:
        raise HTTPException(status_code=404, detail="Экраны релиза не найдены.")
    return [_to_screen_out(screen) for screen in screens]


@router.get("/releases/{release_id}/diff")
def get_release_diff(
    release_id: UUID,
    service: CatalogServiceDep,
    actor: CurrentActor = Depends(require_policy("catalog.releases.read")),
) -> dict[str, Any]:
    _ensure_methodologist_release_access(service, actor, release_id)
    current_screens = service.repo.list_release_screens(release_id)
    if not current_screens:
        raise HTTPException(status_code=404, detail="Экраны релиза не найдены.")

    release = service.repo.get_release_by_id(release_id)
    if release is None:
        raise HTTPException(status_code=404, detail="Релиз не найден.")

    prev_release = service.repo.get_previous_release(release.course_id, release_id)

    prev_screens: list[dict[str, Any]] = []
    if prev_release is not None:
        prev_screens_list = service.repo.list_release_screens(prev_release.id)
        prev_screens = [_to_screen_out(s).model_dump() for s in prev_screens_list]

    current_screens_out = [_to_screen_out(s).model_dump() for s in current_screens]

    return {
        "current_version": release.version,
        "previous_version": prev_release.version if prev_release else None,
        "current_screens": current_screens_out,
        "previous_screens": prev_screens,
    }
