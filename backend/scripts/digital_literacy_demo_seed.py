# pyright: reportMissingImports=false

import argparse
import os
import random
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.modules.catalog.infra.models import Course, CourseLesson, CourseStatus, LessonStatus
from app.modules.groups.infra.models import (
    AssignmentStartPolicy,
    AssignmentStatus,
    GroupCourseAssignment,
    GroupCourseAssignmentTargetUser,
    GroupMembership,
    GroupStatus,
    LearningGroup,
)
from app.modules.progress.infra.models import LessonProgress
from app.modules.users.models import User, UserRole, UserStatus
from app.shared.db.session import SessionLocal
from app.shared.security.passwords import hash_password
from scripts.db_schema_health import SchemaHealthError, ensure_db_schema_healthy
from scripts.progress_mocks import seed as seed_progress

USER_LOGIN_PREFIX = "demo_lit_"
LEGACY_USER_LOGIN_PREFIX = "demo_ops_"
COURSE_SLUG_PREFIX = "literacy-demo-"
LEGACY_COURSE_SLUG_PREFIX = "ops-demo-"
GROUP_NAME_PREFIX = "Демо Цифровая Грамотность"


@dataclass(frozen=True)
class DemoUserBlueprint:
    login: str
    display_name: str
    role: UserRole


@dataclass(frozen=True)
class DemoCourseBlueprint:
    slug_suffix: str
    title: str
    description: str
    lesson_titles: list[str]


def users_blueprint() -> list[DemoUserBlueprint]:
    return [
        DemoUserBlueprint("demo_lit_admin", "Демо Администратор", UserRole.ADMINISTRATOR),
        DemoUserBlueprint("demo_lit_mod", "Демо Модератор", UserRole.MODERATOR),
        DemoUserBlueprint("demo_lit_user_01", "Иванова Мария", UserRole.USER),
        DemoUserBlueprint("demo_lit_user_02", "Петрова Галина", UserRole.USER),
        DemoUserBlueprint("demo_lit_user_03", "Кузнецов Виктор", UserRole.USER),
        DemoUserBlueprint("demo_lit_user_04", "Смирнова Нина", UserRole.USER),
        DemoUserBlueprint("demo_lit_user_05", "Соколов Николай", UserRole.USER),
    ]


def realistic_users_blueprint() -> list[DemoUserBlueprint]:
    base = [
        DemoUserBlueprint("demo_lit_admin", "Демо Администратор", UserRole.ADMINISTRATOR),
        DemoUserBlueprint("demo_lit_mod", "Демо Модератор", UserRole.MODERATOR),
    ]
    first_names = [
        "Алексей",
        "Ирина",
        "Дмитрий",
        "Елена",
        "Сергей",
        "Марина",
        "Павел",
        "Ольга",
        "Андрей",
        "Наталья",
        "Виктор",
        "Татьяна",
        "Роман",
        "Анна",
        "Евгений",
        "Светлана",
        "Николай",
        "Юлия",
        "Константин",
        "Вера",
    ]
    last_names = [
        "Иванов",
        "Петров",
        "Сидоров",
        "Смирнова",
        "Кузнецов",
        "Попова",
        "Соколов",
        "Лебедева",
        "Морозов",
        "Волкова",
        "Соловьев",
        "Васильева",
        "Зайцев",
        "Павлова",
        "Семенов",
        "Голубева",
        "Виноградов",
        "Беляева",
        "Богданов",
        "Тихонова",
    ]
    users: list[DemoUserBlueprint] = []
    for index in range(1, 61):
        first = first_names[(index - 1) % len(first_names)]
        last = last_names[((index - 1) * 3) % len(last_names)]
        users.append(
            DemoUserBlueprint(
                login=f"demo_lit_user_{index:02d}",
                display_name=f"{last} {first}",
                role=UserRole.USER,
            )
        )
    return [*base, *users]


def normal_courses_blueprint() -> list[DemoCourseBlueprint]:
    return [
        DemoCourseBlueprint(
            slug_suffix="safety",
            title="Смартфон без страха",
            description="Базовые навыки работы со смартфоном для начинающих",
            lesson_titles=["Знакомство", "Настройки", "Итоги"],
        ),
        DemoCourseBlueprint(
            slug_suffix="forklift",
            title="Госуслуги и запись к врачу",
            description="Практика записи на прием и работы с госуслугами",
            lesson_titles=["Вход", "Поиск услуги", "Запись", "Проверка"],
        ),
    ]


def realistic_courses_blueprint() -> list[DemoCourseBlueprint]:
    titles = [
        "Смартфон: базовые действия",
        "Мессенджеры и видеосвязь",
        "Онлайн-банкинг без ошибок",
        "Госуслуги в повседневной жизни",
        "Безопасность в интернете",
        "Полезные сервисы для дома и здоровья",
    ]
    return [
        DemoCourseBlueprint(
            slug_suffix=f"real-{index:02d}",
            title=titles[index - 1],
            description=f"Практический курс цифровой грамотности #{index:02d}",
            lesson_titles=[
                "Введение",
                "Правила",
                "Сценарий",
                "Инцидент",
                "Чек-лист",
                "Разбор",
            ],
        )
        for index in range(1, 7)
    ]


def cleanup() -> None:
    with SessionLocal.begin() as db:
        demo_users = list(
            db.scalars(
                select(User).where(
                    User.login.like(f"{USER_LOGIN_PREFIX}%")
                    | User.login.like(f"{LEGACY_USER_LOGIN_PREFIX}%")
                )
            ).all()
        )
        demo_user_ids = {user.id for user in demo_users}

        demo_courses = list(
            db.scalars(
                select(Course).where(
                    Course.slug.like(f"{COURSE_SLUG_PREFIX}%")
                    | Course.slug.like(f"{LEGACY_COURSE_SLUG_PREFIX}%")
                )
            ).all()
        )
        demo_course_ids = {course.id for course in demo_courses}

        group_ids_from_members = (
            set(
                db.scalars(
                    select(GroupMembership.group_id).where(
                        GroupMembership.user_id.in_(demo_user_ids)
                    )
                ).all()
            )
            if demo_user_ids
            else set()
        )

        group_ids_from_assignments = (
            set(
                db.scalars(
                    select(GroupCourseAssignment.group_id).where(
                        GroupCourseAssignment.course_id.in_(demo_course_ids)
                    )
                ).all()
            )
            if demo_course_ids
            else set()
        )

        named_groups = list(
            db.scalars(
                select(LearningGroup).where(
                    LearningGroup.name.like("Клуб %")
                    | LearningGroup.name.like("Demo Ops%")
                    | LearningGroup.name.like("Демо Операции%")
                )
            ).all()
        )
        named_group_ids = {group.id for group in named_groups}

        demo_groups = list(
            db.scalars(
                select(LearningGroup).where(LearningGroup.name.like(f"{GROUP_NAME_PREFIX}%"))
            ).all()
        )
        demo_group_ids = {
            *group_ids_from_members,
            *group_ids_from_assignments,
            *named_group_ids,
            *(group.id for group in demo_groups),
        }

        if demo_group_ids:
            assignment_ids = set(
                db.scalars(
                    select(GroupCourseAssignment.id).where(
                        GroupCourseAssignment.group_id.in_(demo_group_ids)
                    )
                ).all()
            )
            if assignment_ids:
                db.execute(
                    delete(GroupCourseAssignmentTargetUser).where(
                        GroupCourseAssignmentTargetUser.assignment_id.in_(assignment_ids)
                    )
                )
                db.execute(
                    delete(GroupCourseAssignment).where(
                        GroupCourseAssignment.id.in_(assignment_ids)
                    )
                )

            db.execute(delete(GroupMembership).where(GroupMembership.group_id.in_(demo_group_ids)))
            db.execute(delete(LearningGroup).where(LearningGroup.id.in_(demo_group_ids)))

        if demo_course_ids:
            lesson_ids = set(
                db.scalars(
                    select(CourseLesson.id).where(CourseLesson.course_id.in_(demo_course_ids))
                ).all()
            )
            if lesson_ids:
                db.execute(delete(LessonProgress).where(LessonProgress.lesson_id.in_(lesson_ids)))
                db.execute(delete(CourseLesson).where(CourseLesson.id.in_(lesson_ids)))
            db.execute(delete(Course).where(Course.id.in_(demo_course_ids)))

        if demo_user_ids:
            db.execute(delete(LessonProgress).where(LessonProgress.user_id.in_(demo_user_ids)))
            db.execute(delete(User).where(User.id.in_(demo_user_ids)))

        print("[cleanup] удалены демо-данные пользователей/групп/курсов")


def _create_users(db, blueprints: list[DemoUserBlueprint]) -> dict[str, User]:
    created: dict[str, User] = {}
    for blueprint in blueprints:
        user = User(
            login=blueprint.login,
            password_hash=hash_password("demo12345"),
            display_name=blueprint.display_name,
            role=blueprint.role,
            status=UserStatus.ACTIVE,
        )
        db.add(user)
        db.flush()
        created[blueprint.login] = user
    return created


def _create_courses_and_lessons(db, blueprints: list[DemoCourseBlueprint]) -> list[Course]:
    courses: list[Course] = []
    for course_blueprint in blueprints:
        course = Course(
            slug=f"{COURSE_SLUG_PREFIX}{course_blueprint.slug_suffix}",
            title=course_blueprint.title,
            description=course_blueprint.description,
            status=CourseStatus.ACTIVE.value,
        )
        db.add(course)
        db.flush()

        for lesson_index, lesson_title in enumerate(course_blueprint.lesson_titles):
            db.add(
                CourseLesson(
                    course_id=course.id,
                    title=f"{course_blueprint.title}: {lesson_title}",
                    description=None,
                    order_index=lesson_index,
                    status=LessonStatus.ACTIVE.value,
                )
            )
        courses.append(course)
    db.flush()
    return courses


def _seed_normal(db, demo_users: dict[str, User], courses: list[Course]) -> None:
    course_a, course_b = courses[0], courses[1]

    group_a = LearningGroup(
        name=f"{GROUP_NAME_PREFIX} Альфа",
        description="Группа начинающих (уровень А)",
        status=GroupStatus.ACTIVE.value,
    )
    group_b = LearningGroup(
        name=f"{GROUP_NAME_PREFIX} Бета",
        description="Группа продолжающих (уровень Б)",
        status=GroupStatus.ACTIVE.value,
    )
    db.add_all([group_a, group_b])
    db.flush()

    memberships = [
        (group_a.id, demo_users["demo_lit_user_01"].id),
        (group_a.id, demo_users["demo_lit_user_02"].id),
        (group_a.id, demo_users["demo_lit_user_03"].id),
        (group_b.id, demo_users["demo_lit_user_03"].id),
        (group_b.id, demo_users["demo_lit_user_04"].id),
        (group_b.id, demo_users["demo_lit_user_05"].id),
    ]
    for group_id, user_id in memberships:
        db.add(GroupMembership(group_id=group_id, user_id=user_id))

    admin_id = demo_users["demo_lit_admin"].id
    assignment_a = GroupCourseAssignment(
        group_id=group_a.id,
        course_id=course_a.id,
        created_by_user_id=admin_id,
        start_policy=AssignmentStartPolicy.IMMEDIATE.value,
        status=AssignmentStatus.ACTIVE.value,
    )
    assignment_b = GroupCourseAssignment(
        group_id=group_b.id,
        course_id=course_b.id,
        created_by_user_id=admin_id,
        start_policy=AssignmentStartPolicy.SCHEDULED.value,
        status=AssignmentStatus.SCHEDULED.value,
    )
    db.add_all([assignment_a, assignment_b])
    db.flush()

    db.add(
        GroupCourseAssignmentTargetUser(
            assignment_id=assignment_a.id,
            user_id=demo_users["demo_lit_user_04"].id,
        )
    )
    db.add(
        GroupCourseAssignmentTargetUser(
            assignment_id=assignment_b.id,
            user_id=demo_users["demo_lit_user_01"].id,
        )
    )


def _seed_realistic(db, demo_users: dict[str, User], courses: list[Course]) -> None:
    rng = random.Random(42)
    admin_id = demo_users["demo_lit_admin"].id
    user_ids = [
        user.id for login, user in sorted(demo_users.items()) if login.startswith("demo_lit_user_")
    ]

    group_names = [
        "Группа 'Цифровой Старт' — Утро",
        "Группа 'Цифровой Старт' — Вечер",
        "Группа 'Серебряный Возраст' — Утро",
        "Группа 'Серебряный Возраст' — Вечер",
        "Группа 'Активное Долголетие' — Базовый",
        "Группа 'Мудрость Поколений' — Продвинутый",
    ]

    groups: list[LearningGroup] = []
    for index, group_name in enumerate(group_names, start=1):
        group = LearningGroup(
            name=group_name,
            description=f"Учебная группа цифровой грамотности #{index:02d}",
            status=GroupStatus.ACTIVE.value,
        )
        db.add(group)
        groups.append(group)
    db.flush()

    for idx, group in enumerate(groups):
        start = idx * 8
        member_slice = user_ids[start : start + 20]
        if len(member_slice) < 20:
            member_slice = [*member_slice, *user_ids[: 20 - len(member_slice)]]
        for user_id in member_slice:
            db.add(GroupMembership(group_id=group.id, user_id=user_id))

    assignments: list[GroupCourseAssignment] = []
    for idx, group in enumerate(groups):
        first_course = courses[idx % len(courses)]
        second_course = courses[(idx + 2) % len(courses)]

        assignments.append(
            GroupCourseAssignment(
                group_id=group.id,
                course_id=first_course.id,
                created_by_user_id=admin_id,
                start_policy=AssignmentStartPolicy.IMMEDIATE.value,
                status=AssignmentStatus.ACTIVE.value,
            )
        )
        assignments.append(
            GroupCourseAssignment(
                group_id=group.id,
                course_id=second_course.id,
                created_by_user_id=admin_id,
                start_policy=AssignmentStartPolicy.SCHEDULED.value,
                status=AssignmentStatus.SCHEDULED.value,
            )
        )

    db.add_all(assignments)
    db.flush()

    for assignment in assignments:
        extra_targets = rng.sample(user_ids, k=5)
        for user_id in extra_targets:
            db.add(
                GroupCourseAssignmentTargetUser(
                    assignment_id=assignment.id,
                    user_id=user_id,
                )
            )


def _spread_demo_progress_dates(profile: str) -> None:
    rng = random.Random(42 if profile == "basic" else 84)
    max_days = 45 if profile == "basic" else 120
    now = datetime.now(timezone.utc)

    with SessionLocal.begin() as db:
        demo_user_ids = list(
            db.scalars(
                select(User.id).where(
                    User.login.like(f"{USER_LOGIN_PREFIX}%")
                    | User.login.like(f"{LEGACY_USER_LOGIN_PREFIX}%")
                )
            ).all()
        )

        if not demo_user_ids:
            return

        progress_rows = list(
            db.scalars(
                select(LessonProgress)
                .join(CourseLesson, CourseLesson.id == LessonProgress.lesson_id)
                .join(Course, Course.id == CourseLesson.course_id)
                .where(
                    LessonProgress.user_id.in_(demo_user_ids),
                    LessonProgress.completed_at.is_not(None),
                    Course.slug.like(f"{COURSE_SLUG_PREFIX}%")
                    | Course.slug.like(f"{LEGACY_COURSE_SLUG_PREFIX}%"),
                )
                .order_by(LessonProgress.user_id, CourseLesson.order_index, LessonProgress.id)
            ).all()
        )

        for index, row in enumerate(progress_rows):
            day_offset = (index * 5 + rng.randint(0, 6)) % max_days
            hour_offset = rng.randint(0, 23)
            row.completed_at = now - timedelta(days=day_offset, hours=hour_offset)

        print(
            f"[seed] demo progress dates distributed across the last {max_days} days"
        )


def seed(clean_first: bool = True, profile: str = "basic") -> None:
    if clean_first:
        cleanup()

    with SessionLocal.begin() as db:
        if profile == "realistic":
            demo_users = _create_users(db, realistic_users_blueprint())
            courses = _create_courses_and_lessons(db, realistic_courses_blueprint())
            _seed_realistic(db, demo_users, courses)
        else:
            demo_users = _create_users(db, users_blueprint())
            courses = _create_courses_and_lessons(db, normal_courses_blueprint())
            _seed_normal(db, demo_users, courses)

        print(
            f"[seed] создан набор демо-данных ({profile}): пользователи, группы, курсы, назначения"
        )

    seed_progress(seed_value=42)
    _spread_demo_progress_dates(profile)
    print("[seed] demo progress generated")
    print("[credentials] логин: demo_lit_admin / пароль: demo12345")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo data for groups/progress UI checks.")
    parser.add_argument("command", choices=["seed", "cleanup", "reset"])
    parser.add_argument("--profile", choices=["basic", "realistic"], default="basic")
    args = parser.parse_args()

    try:
        ensure_db_schema_healthy()
    except SchemaHealthError as exc:
        raise SystemExit(str(exc)) from exc

    if args.command == "seed":
        seed(clean_first=True, profile=args.profile)
    elif args.command == "cleanup":
        cleanup()
    else:
        cleanup()
        seed(clean_first=False, profile=args.profile)


if __name__ == "__main__":
    main()
