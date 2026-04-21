# pyright: reportMissingImports=false

import argparse
import hashlib
import json
import os
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal

from sqlalchemy import delete, select

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

from app.main import create_app
from app.modules.catalog.infra.models import (
    Course,
    CourseRelease,
    CourseReleaseScreen,
    CourseStatus,
    ReleaseStatus,
)
from app.modules.users.models import User, UserRole, UserStatus
from app.shared.auth.policy_models import RbacPolicyRule
from app.shared.db.session import SessionLocal
from app.shared.security.passwords import hash_password
from scripts.catalog_mock_data import (
    TARGET_SLUGS,
    cleanup_mock_catalog_courses,
    seed_mock_catalog_courses,
)
from scripts.db_schema_health import SchemaHealthError, ensure_db_schema_healthy

USER_LOGIN_PREFIX = "mobile_demo_"
SeedProfile = Literal["default", "mobile-heavy"]


MOBILE_HEAVY_EXTRA_COURSES: tuple[dict[str, Any], ...] = (
    {
        "slug": "online-pharmacy-orders",
        "title": "Онлайн-аптеки: безопасный заказ лекарств",
        "description": "Практика заказа рецептурных и безрецептурных препаратов через проверенные сервисы.",
        "version": "1.0.0",
        "changelog": "Первая публикация: сценарии безопасного заказа в онлайн-аптеках.",
        "screens": [
            {
                "screen_key": "pharma-intro",
                "title": "Проверка аптеки",
                "order_index": 1,
                "payload": {
                    "type": "article",
                    "markdown_content": "# Выбираем аптеку\n\nПроверяйте лицензию и отзывы перед оформлением заказа.",
                    "assets": [],
                },
            },
            {
                "screen_key": "pharma-video",
                "title": "Оформление заказа",
                "order_index": 2,
                "payload": {
                    "type": "video",
                    "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
                    "duration_sec": 196,
                    "transcript": "Пошаговый путь: поиск, добавление в корзину, подтверждение адреса.",
                },
            },
            {
                "screen_key": "pharma-sim",
                "title": "Симуляция: подтверждение заказа",
                "order_index": 3,
                "payload": {
                    "type": "simulation",
                    "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1280&q=80",
                    "hotspots": [
                        {
                            "x": 17,
                            "y": 30,
                            "width": 34,
                            "height": 10,
                            "label": "Проверить состав заказа",
                            "hint": "Сверьте дозировку и количество препаратов.",
                            "target_screen_key": None,
                        },
                        {
                            "x": 60,
                            "y": 76,
                            "width": 24,
                            "height": 9,
                            "label": "Подтвердить покупку",
                            "hint": "Подтверждайте только после проверки адреса и времени доставки.",
                            "target_screen_key": None,
                        },
                    ],
                    "is_start": True,
                    "is_completion": True,
                },
            },
            {
                "screen_key": "pharma-quiz",
                "title": "Контрольный вопрос",
                "order_index": 4,
                "payload": {
                    "type": "quiz",
                    "questions": [
                        {
                            "id": "pharma-q1",
                            "type": "single_choice",
                            "text": "Что важно проверить перед оплатой заказа?",
                            "options": [
                                {"id": "a", "text": "Только цену"},
                                {"id": "b", "text": "Состав, дозировку и адрес доставки"},
                                {"id": "c", "text": "Только время доставки"},
                            ],
                            "correct_option_id": "b",
                        }
                    ],
                },
            },
        ],
    },
    {
        "slug": "school-parent-chat-safety",
        "title": "Родительские чаты: цифровая безопасность",
        "description": "Как фильтровать сообщения, проверять ссылки и избегать фишинга в школьных чатах.",
        "version": "1.0.0",
        "changelog": "Первая публикация: базовые правила цифровой гигиены в чатах.",
        "screens": [
            {
                "screen_key": "chat-intro",
                "title": "Красные флаги в сообщениях",
                "order_index": 1,
                "payload": {
                    "type": "article",
                    "markdown_content": "# Осторожно с ссылками\n\nНе переходите по незнакомым ссылкам и всегда проверяйте источник сообщения.",
                    "assets": [],
                },
            },
            {
                "screen_key": "chat-cheat",
                "title": "Памятка по безопасности",
                "order_index": 2,
                "payload": {
                    "type": "cheat_sheet",
                    "title": "Чек-лист проверки сообщения",
                    "items": [
                        "Проверьте отправителя",
                        "Не открывайте вложения от неизвестных",
                        "Сверьте информацию в официальном канале школы",
                    ],
                },
            },
            {
                "screen_key": "chat-sim",
                "title": "Симуляция: проверка ссылки",
                "order_index": 3,
                "payload": {
                    "type": "simulation",
                    "image_url": "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1280&q=80",
                    "hotspots": [
                        {
                            "x": 20,
                            "y": 28,
                            "width": 38,
                            "height": 11,
                            "label": "Проверить домен",
                            "hint": "Официальные домены обычно короткие и узнаваемые.",
                            "target_screen_key": None,
                        },
                        {
                            "x": 61,
                            "y": 76,
                            "width": 23,
                            "height": 9,
                            "label": "Сообщить модератору",
                            "hint": "Сообщайте о подозрительных сообщениях администратору чата.",
                            "target_screen_key": None,
                        },
                    ],
                    "is_start": True,
                    "is_completion": True,
                },
            },
            {
                "screen_key": "chat-quiz",
                "title": "Мини-тест",
                "order_index": 4,
                "payload": {
                    "type": "quiz",
                    "questions": [
                        {
                            "id": "chat-q1",
                            "type": "single_choice",
                            "text": "Как лучше действовать при подозрительной ссылке в чате?",
                            "options": [
                                {"id": "a", "text": "Открыть и проверить"},
                                {"id": "b", "text": "Игнорировать и удалить сообщение"},
                                {"id": "c", "text": "Проверить источник и сообщить администратору"},
                            ],
                            "correct_option_id": "c",
                        }
                    ],
                },
            },
        ],
    },
)

MOBILE_HEAVY_EXTRA_SLUGS: tuple[str, ...] = tuple(
    blueprint["slug"] for blueprint in MOBILE_HEAVY_EXTRA_COURSES
)


@dataclass(frozen=True)
class DemoUserBlueprint:
    login: str
    password: str
    display_name: str
    role: UserRole


DEMO_USERS: tuple[DemoUserBlueprint, ...] = (
    DemoUserBlueprint(
        login="mobile_demo_admin",
        password="mobile12345",
        display_name="Администратор демо мобайла",
        role=UserRole.ADMINISTRATOR,
    ),
    DemoUserBlueprint(
        login="mobile_demo_method",
        password="mobile12345",
        display_name="Методист демо мобайла",
        role=UserRole.METHODOLOGIST,
    ),
    DemoUserBlueprint(
        login="mobile_demo_user",
        password="mobile12345",
        display_name="Ученик демо мобайла",
        role=UserRole.USER,
    ),
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _checksum_payload(payload: dict[str, Any]) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _target_slugs_for_profile(profile: SeedProfile) -> tuple[str, ...]:
    if profile == "mobile-heavy":
        return tuple(TARGET_SLUGS) + MOBILE_HEAVY_EXTRA_SLUGS
    return tuple(TARGET_SLUGS)


def _upsert_demo_users() -> None:
    now = _utcnow()
    with SessionLocal.begin() as db:
        for blueprint in DEMO_USERS:
            user = db.scalar(select(User).where(User.login == blueprint.login))
            if user is None:
                user = User(
                    id=uuid.uuid4(),
                    login=blueprint.login,
                    password_hash=hash_password(blueprint.password),
                    display_name=blueprint.display_name,
                    role=blueprint.role,
                    status=UserStatus.ACTIVE,
                    created_at=now,
                    updated_at=now,
                )
                db.add(user)
                print(f"[create] user: {blueprint.login} ({blueprint.role.value})")
                continue

            user.password_hash = hash_password(blueprint.password)
            user.display_name = blueprint.display_name
            user.role = blueprint.role
            user.status = UserStatus.ACTIVE
            user.updated_at = now
            print(f"[update] user: {blueprint.login} ({blueprint.role.value})")


def _ensure_mobile_catalog_access_policy() -> None:
    with SessionLocal.begin() as db:
        rule = db.scalar(
            select(RbacPolicyRule).where(
                RbacPolicyRule.policy_key == "catalog.read",
                RbacPolicyRule.role == UserRole.USER.value,
            )
        )
        if rule is None:
            db.add(
                RbacPolicyRule(
                    policy_key="catalog.read",
                    role=UserRole.USER.value,
                    enabled=True,
                )
            )
            print("[create] rbac: catalog.read -> user (enabled)")
            return

        if not rule.enabled:
            rule.enabled = True
            print("[update] rbac: catalog.read -> user (enabled)")
            return

        print("[keep] rbac: catalog.read -> user already enabled")


def _seed_mobile_heavy_courses() -> None:
    now = _utcnow()
    with SessionLocal.begin() as db:
        print("Seeding extra mobile-heavy courses...")
        for blueprint in MOBILE_HEAVY_EXTRA_COURSES:
            slug = blueprint["slug"]
            course = db.scalar(select(Course).where(Course.slug == slug))
            if course is None:
                course = Course(
                    id=uuid.uuid4(),
                    slug=slug,
                    title=blueprint["title"],
                    description=blueprint["description"],
                    status=CourseStatus.ACTIVE.value,
                    created_at=now,
                    updated_at=now,
                )
                db.add(course)
                db.flush()
                print(f"[create] heavy course: {slug}")
            else:
                course.title = blueprint["title"]
                course.description = blueprint["description"]
                course.status = CourseStatus.ACTIVE.value
                course.updated_at = now
                print(f"[update] heavy course: {slug}")

            release = db.scalar(
                select(CourseRelease).where(
                    CourseRelease.course_id == course.id,
                    CourseRelease.version == blueprint["version"],
                )
            )
            if release is None:
                release = CourseRelease(
                    id=uuid.uuid4(),
                    course_id=course.id,
                    version=blueprint["version"],
                    changelog=blueprint["changelog"],
                    status=ReleaseStatus.PUBLISHED.value,
                    published_at=now,
                    created_at=now,
                )
                db.add(release)
                db.flush()
                print(f"[create] heavy release {blueprint['version']} for {slug}")
            else:
                release.changelog = blueprint["changelog"]
                release.status = ReleaseStatus.PUBLISHED.value
                release.published_at = now
                print(f"[refresh] heavy release {blueprint['version']} for {slug}")

            db.execute(delete(CourseReleaseScreen).where(CourseReleaseScreen.release_id == release.id))

            for screen_data in blueprint["screens"]:
                payload = screen_data["payload"]
                db.add(
                    CourseReleaseScreen(
                        id=uuid.uuid4(),
                        release_id=release.id,
                        screen_key=screen_data["screen_key"],
                        title=screen_data["title"],
                        order_index=screen_data["order_index"],
                        payload_json=payload,
                        checksum=_checksum_payload(payload),
                        created_at=now,
                    )
                )


def _assign_authors_for_mobile_courses(profile: SeedProfile) -> None:
    with SessionLocal.begin() as db:
        users = {
            user.login: user
            for user in db.scalars(
                select(User).where(User.login.in_([blueprint.login for blueprint in DEMO_USERS]))
            ).all()
        }
        methodologist = users.get("mobile_demo_method")
        if methodologist is None:
            raise RuntimeError("Demo users were not found. Run seed first.")

        now = _utcnow()
        target_slugs = _target_slugs_for_profile(profile)
        courses = db.scalars(select(Course).where(Course.slug.in_(target_slugs))).all()
        if not courses:
            raise RuntimeError("No target catalog courses found. Catalog seeding did not run.")

        ordered_courses = sorted(courses, key=lambda course: course.slug)
        for course in ordered_courses:
            course.author_id = methodologist.id
            course.updated_at = now
            print(f"[author] {course.slug} -> {course.author_id}")


def seed_mobile_runtime_demo_data(profile: SeedProfile = "default") -> None:
    print("Seeding mobile runtime demo users...")
    _upsert_demo_users()
    _ensure_mobile_catalog_access_policy()

    print("Seeding published catalog data for mobile Home/Player...")
    seed_mock_catalog_courses()

    if profile == "mobile-heavy":
        _seed_mobile_heavy_courses()

    print("Assigning seeded users as course authors...")
    _assign_authors_for_mobile_courses(profile)

    print(f"Done. Mobile runtime demo data is ready (profile: {profile}).")
    print("Use login: mobile_demo_user / password: mobile12345")


def _cleanup_mobile_heavy_courses(dry_run: bool = False) -> None:
    with SessionLocal() as db:
        courses = list(db.scalars(select(Course).where(Course.slug.in_(MOBILE_HEAVY_EXTRA_SLUGS))).all())
        if not courses:
            print("No mobile-heavy extra courses found. Nothing to delete.")
            return

        found_slugs = sorted(course.slug or "<empty-slug>" for course in courses)
        print(f"Found {len(found_slugs)} mobile-heavy course(s): {', '.join(found_slugs)}")

        if dry_run:
            print("Dry-run mode: no heavy courses were deleted.")
            return

        db.execute(delete(Course).where(Course.slug.in_(MOBILE_HEAVY_EXTRA_SLUGS)))
        db.commit()
        print(f"Deleted {len(found_slugs)} mobile-heavy course(s).")


def cleanup_mobile_runtime_demo_data(dry_run: bool = False) -> None:
    print("Cleaning catalog demo courses...")
    cleanup_mock_catalog_courses(dry_run=dry_run)
    _cleanup_mobile_heavy_courses(dry_run=dry_run)

    with SessionLocal() as db:
        users = list(db.scalars(select(User).where(User.login.like(f"{USER_LOGIN_PREFIX}%"))).all())
        if not users:
            print("No mobile demo users found. Nothing to delete.")
            return

        found_logins = sorted(user.login or "<empty-login>" for user in users)
        print(f"Found {len(found_logins)} mobile demo user(s): {', '.join(found_logins)}")

        if dry_run:
            print("Dry-run mode: no users were deleted.")
            return

        db.execute(delete(User).where(User.login.like(f"{USER_LOGIN_PREFIX}%")))
        db.commit()
        print(f"Deleted {len(found_logins)} mobile demo user(s).")


def reset_mobile_runtime_demo_data(
    dry_run: bool = False,
    profile: SeedProfile = "default",
) -> None:
    if dry_run:
        cleanup_mobile_runtime_demo_data(dry_run=True)
        print("Dry-run reset: seed step skipped.")
        return

    cleanup_mobile_runtime_demo_data(dry_run=False)
    seed_mobile_runtime_demo_data(profile=profile)


def verify_mobile_runtime_demo_data(profile: SeedProfile = "default") -> None:
    app = create_app()
    with TestClient(app) as client:
        login_response = client.post(
            "/api/v1/auth/login",
            json={"login": "mobile_demo_user", "password": "mobile12345"},
        )
        if login_response.status_code != 200:
            raise RuntimeError(f"Login verification failed: {login_response.status_code}")

        auth_payload = login_response.json()
        access_token = auth_payload.get("access_token")
        if not access_token:
            raise RuntimeError("Login verification failed: no access token in response.")

        headers = {"Authorization": f"Bearer {access_token}"}

        me_response = client.get("/api/v1/auth/me", headers=headers)
        if me_response.status_code != 200:
            raise RuntimeError(f"/auth/me verification failed: {me_response.status_code}")

        me_payload = me_response.json()
        if me_payload.get("display_name") != "Ученик демо мобайла":
            raise RuntimeError("/auth/me verification failed: unexpected display_name.")

        courses_response = client.get(
            "/api/v1/catalog/courses",
            params={"include_drafts": "false", "include_archived": "false"},
            headers=headers,
        )
        if courses_response.status_code != 200:
            raise RuntimeError(f"/catalog/courses verification failed: {courses_response.status_code}")

        courses_payload = courses_response.json()
        if not isinstance(courses_payload, list) or not courses_payload:
            raise RuntimeError("/catalog/courses verification failed: empty response.")

        expected_min_courses = len(_target_slugs_for_profile(profile))
        if len(courses_payload) < expected_min_courses:
            raise RuntimeError(
                f"/catalog/courses verification failed: expected at least {expected_min_courses} courses "
                f"for profile '{profile}', got {len(courses_payload)}."
            )

        known_slugs = {item.get("slug") for item in courses_payload}
        matched_slug = next((slug for slug in _target_slugs_for_profile(profile) if slug in known_slugs), None)
        if matched_slug is None:
            raise RuntimeError("/catalog/courses verification failed: seeded slugs not found.")

        bundle_response = client.get(f"/api/v1/catalog/courses/{matched_slug}/releases/latest")
        if bundle_response.status_code != 200:
            raise RuntimeError(
                f"/catalog/courses/{{slug}}/releases/latest failed: {bundle_response.status_code}"
            )

        bundle_payload = bundle_response.json()
        screens = bundle_payload.get("screens")
        if not isinstance(screens, list) or not screens:
            raise RuntimeError("Latest release verification failed: no screens in response.")

        print(f"Verification successful (profile: {profile}):")
        print("- login: OK")
        print("- /auth/me: OK")
        print(f"- /catalog/courses: {len(courses_payload)} course(s)")
        print(f"- latest release for '{matched_slug}': {len(screens)} screen(s)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Manage mobile runtime demo data (seed/cleanup/reset/verify)."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    seed_parser = subparsers.add_parser("seed", help="Create or update mobile runtime demo data")
    seed_parser.add_argument(
        "--profile",
        choices=("default", "mobile-heavy"),
        default="default",
        help="Seed profile: default (base set) or mobile-heavy (expanded set)",
    )

    cleanup_parser = subparsers.add_parser("cleanup", help="Delete mobile runtime demo data")
    cleanup_parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted")

    reset_parser = subparsers.add_parser("reset", help="Cleanup and seed again")
    reset_parser.add_argument("--dry-run", action="store_true", help="Show cleanup target only")
    reset_parser.add_argument(
        "--profile",
        choices=("default", "mobile-heavy"),
        default="default",
        help="Seed profile used after cleanup",
    )

    verify_parser = subparsers.add_parser("verify", help="Verify demo data through API endpoints")
    verify_parser.add_argument(
        "--profile",
        choices=("default", "mobile-heavy"),
        default="default",
        help="Expected profile for verification thresholds",
    )

    args = parser.parse_args()

    try:
        ensure_db_schema_healthy()
    except SchemaHealthError as exc:
        raise SystemExit(str(exc)) from exc

    if args.command == "seed":
        seed_mobile_runtime_demo_data(profile=args.profile)
        return

    if args.command == "cleanup":
        cleanup_mobile_runtime_demo_data(dry_run=args.dry_run)
        return

    if args.command == "reset":
        reset_mobile_runtime_demo_data(dry_run=args.dry_run, profile=args.profile)
        return

    if args.command == "verify":
        verify_mobile_runtime_demo_data(profile=args.profile)
        return


if __name__ == "__main__":
    main()
