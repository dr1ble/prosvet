# pyright: reportMissingImports=false

import argparse
import os
import random
import sys
from collections import defaultdict
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.modules.catalog.infra.models import CourseLesson, LessonStatus
from app.modules.groups.infra.models import (
    GroupCourseAssignment,
    GroupCourseAssignmentTargetUser,
    GroupMembership,
)
from app.modules.progress.infra.models import LessonProgress, LessonProgressStatus
from app.shared.db.session import SessionLocal
from scripts.db_schema_health import SchemaHealthError, ensure_db_schema_healthy


def _load_targets(db) -> dict[UUID, set[UUID]]:
    assignments = list(db.scalars(select(GroupCourseAssignment)).all())
    if not assignments:
        return {}

    group_ids = {assignment.group_id for assignment in assignments}
    assignment_ids = {assignment.id for assignment in assignments}

    memberships = db.execute(
        select(GroupMembership.group_id, GroupMembership.user_id).where(
            GroupMembership.group_id.in_(group_ids)
        )
    ).all()
    members_by_group: dict[UUID, set[UUID]] = defaultdict(set)
    for group_id, user_id in memberships:
        members_by_group[group_id].add(user_id)

    extra_targets = db.execute(
        select(
            GroupCourseAssignmentTargetUser.assignment_id,
            GroupCourseAssignmentTargetUser.user_id,
        ).where(GroupCourseAssignmentTargetUser.assignment_id.in_(assignment_ids))
    ).all()
    extra_by_assignment: dict[UUID, set[UUID]] = defaultdict(set)
    for assignment_id, user_id in extra_targets:
        extra_by_assignment[assignment_id].add(user_id)

    targets: dict[UUID, set[UUID]] = {}
    for assignment in assignments:
        result = set(members_by_group.get(assignment.group_id, set()))
        result.update(extra_by_assignment.get(assignment.id, set()))
        if result:
            targets[assignment.id] = result
    return targets


def cleanup() -> None:
    try:
        with SessionLocal.begin() as db:
            assignment_targets = _load_targets(db)
            if not assignment_targets:
                print("[cleanup] no assignments or targets")
                return

        assignment_ids = set(assignment_targets.keys())
        user_ids = set().union(*assignment_targets.values())

        assignments = list(
            db.scalars(
                select(GroupCourseAssignment).where(GroupCourseAssignment.id.in_(assignment_ids))
            ).all()
        )
        course_ids = {assignment.course_id for assignment in assignments}

        lesson_ids = set(
            db.scalars(
                select(CourseLesson.id).where(
                    CourseLesson.course_id.in_(course_ids),
                    CourseLesson.status != LessonStatus.ARCHIVED.value,
                )
            ).all()
        )

        if not lesson_ids or not user_ids:
            print("[cleanup] no progress rows to remove")
            return

            db.execute(
                delete(LessonProgress).where(
                    LessonProgress.user_id.in_(user_ids),
                    LessonProgress.lesson_id.in_(lesson_ids),
                )
            )
            print("[cleanup] removed seeded progress rows")
    except SQLAlchemyError as exc:
        print(f"[cleanup] skipped: database schema is not ready ({exc.__class__.__name__})")


def seed(seed_value: int) -> None:
    random.seed(seed_value)

    try:
        with SessionLocal.begin() as db:
            assignment_targets = _load_targets(db)
            if not assignment_targets:
                print("[seed] no assignment targets found; nothing to seed")
                return

            assignments = list(
                db.scalars(
                    select(GroupCourseAssignment).where(
                        GroupCourseAssignment.id.in_(assignment_targets.keys())
                    )
                ).all()
            )
            course_ids = {assignment.course_id for assignment in assignments}

            lessons = db.execute(
                select(CourseLesson.id, CourseLesson.course_id).where(
                    CourseLesson.course_id.in_(course_ids),
                    CourseLesson.status != LessonStatus.ARCHIVED.value,
                )
            ).all()
            lessons_by_course: dict[UUID, list[UUID]] = defaultdict(list)
            for lesson_id, course_id in lessons:
                lessons_by_course[course_id].append(lesson_id)

            now = datetime.now(timezone.utc)
            created = 0
            updated = 0
            pending: dict[tuple[UUID, UUID], LessonProgress] = {}

            for assignment in assignments:
                lesson_ids = lessons_by_course.get(assignment.course_id, [])
                if not lesson_ids:
                    continue

                target_users = assignment_targets.get(assignment.id, set())
                for user_id in target_users:
                    completion_ratio = random.uniform(0.2, 1.0)
                    completed_threshold = max(1, int(round(len(lesson_ids) * completion_ratio)))

                    for idx, lesson_id in enumerate(sorted(lesson_ids)):
                        key = (user_id, lesson_id)
                        status = (
                            LessonProgressStatus.COMPLETED.value
                            if idx < completed_threshold
                            else LessonProgressStatus.IN_PROGRESS.value
                        )
                        completed_at = (
                            now if status == LessonProgressStatus.COMPLETED.value else None
                        )

                        pending_item = pending.get(key)
                        if pending_item is not None:
                            if status == LessonProgressStatus.COMPLETED.value:
                                pending_item.status = status
                                pending_item.completed_at = completed_at
                            updated += 1
                            continue

                        existing = db.scalar(
                            select(LessonProgress).where(
                                LessonProgress.user_id == user_id,
                                LessonProgress.lesson_id == lesson_id,
                            )
                        )
                        if existing is None:
                            item = LessonProgress(
                                user_id=user_id,
                                lesson_id=lesson_id,
                                status=status,
                                completed_at=completed_at,
                            )
                            db.add(item)
                            pending[key] = item
                            created += 1
                        else:
                            existing.status = status
                            existing.completed_at = completed_at
                            updated += 1

            print(f"[seed] progress rows created={created}, updated={updated}")
    except SQLAlchemyError as exc:
        print(f"[seed] skipped: database schema is not ready ({exc.__class__.__name__})")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed mock lesson progress for groups/assignments."
    )
    parser.add_argument("command", choices=["seed", "cleanup", "reset"])
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    try:
        ensure_db_schema_healthy()
    except SchemaHealthError as exc:
        raise SystemExit(str(exc)) from exc

    if args.command == "seed":
        seed(seed_value=args.seed)
    elif args.command == "cleanup":
        cleanup()
    else:
        cleanup()
        seed(seed_value=args.seed)


if __name__ == "__main__":
    main()
