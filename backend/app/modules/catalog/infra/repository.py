from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.modules.catalog.infra.models import Course, CourseRelease, CourseReleaseScreen, CourseStatus, ReleaseStatus


class CatalogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_courses(self, include_drafts: bool, include_archived: bool) -> list[Course]:
        stmt = select(Course)
        if not include_drafts:
            stmt = stmt.where(Course.status != CourseStatus.DRAFT.value)
        if not include_archived:
            stmt = stmt.where(Course.status != CourseStatus.ARCHIVED.value)
        stmt = stmt.order_by(desc(Course.updated_at), desc(Course.created_at))
        return list(self.db.scalars(stmt).all())

    def get_course_by_id(self, course_id: UUID) -> Course | None:
        stmt = select(Course).where(Course.id == course_id)
        return self.db.scalar(stmt)

    def get_course_by_slug(self, slug: str) -> Course | None:
        stmt = select(Course).where(Course.slug == slug)
        return self.db.scalar(stmt)

    def create_course(self, slug: str, title: str, description: str | None, status: str) -> Course:
        course = Course(slug=slug, title=title, description=description, status=status)
        self.db.add(course)
        self.db.flush()
        return course

    def get_release_by_version(self, course_id: UUID, version: str) -> CourseRelease | None:
        stmt = select(CourseRelease).where(
            CourseRelease.course_id == course_id,
            CourseRelease.version == version,
        )
        return self.db.scalar(stmt)

    def create_release(
        self,
        course_id: UUID,
        version: str,
        changelog: str | None,
        status: str,
        published_at: datetime | None,
    ) -> CourseRelease:
        release = CourseRelease(
            course_id=course_id,
            version=version,
            changelog=changelog,
            status=status,
            published_at=published_at,
        )
        self.db.add(release)
        self.db.flush()
        return release

    def add_release_screen(
        self,
        release_id: UUID,
        screen_key: str,
        title: str,
        order_index: int,
        payload: dict[str, Any],
        checksum: str,
    ) -> CourseReleaseScreen:
        screen = CourseReleaseScreen(
            release_id=release_id,
            screen_key=screen_key,
            title=title,
            order_index=order_index,
            payload_json=payload,
            checksum=checksum,
        )
        self.db.add(screen)
        self.db.flush()
        return screen

    def list_release_screens(self, release_id: UUID) -> list[CourseReleaseScreen]:
        stmt = (
            select(CourseReleaseScreen)
            .where(CourseReleaseScreen.release_id == release_id)
            .order_by(CourseReleaseScreen.order_index.asc(), CourseReleaseScreen.created_at.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_latest_published_release(self, course_id: UUID) -> CourseRelease | None:
        stmt = (
            select(CourseRelease)
            .where(
                CourseRelease.course_id == course_id,
                CourseRelease.status == ReleaseStatus.PUBLISHED.value,
            )
            .order_by(desc(CourseRelease.published_at).nulls_last(), desc(CourseRelease.created_at))
            .limit(1)
        )
        return self.db.scalar(stmt)

    def list_releases(self, course_id: UUID) -> list[tuple[CourseRelease, int]]:
        stmt = (
            select(CourseRelease, func.count(CourseReleaseScreen.id))
            .outerjoin(CourseReleaseScreen, CourseReleaseScreen.release_id == CourseRelease.id)
            .where(CourseRelease.course_id == course_id)
            .group_by(CourseRelease.id)
            .order_by(desc(CourseRelease.published_at).nulls_last(), desc(CourseRelease.created_at))
        )
        rows = self.db.execute(stmt).all()
        return [(release, int(screen_count)) for release, screen_count in rows]
