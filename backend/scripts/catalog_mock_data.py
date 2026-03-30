import argparse
import hashlib
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select

# Add the backend root to the python path.
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.modules.catalog.infra.models import (  # noqa: E402
    Course,
    CourseRelease,
    CourseReleaseScreen,
    CourseStatus,
    ReleaseStatus,
)
from app.shared.db.session import SessionLocal  # noqa: E402

TARGET_SLUGS = [
    "gosuslugi-basic",
    "sberbank-online-security",
    "zhkh-payments-online",
    "telemedicine-appointments",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _checksum_payload(payload: dict[str, Any]) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _course_blueprints() -> list[dict[str, Any]]:
    return [
        {
            "slug": "gosuslugi-basic",
            "title": "Госуслуги: базовые услуги без ошибок",
            "description": "Практика записи к врачу, проверки штрафов и подачи заявлений через Госуслуги.",
            "version": "1.0.0",
            "changelog": "Первая публикация: базовые операции в Госуслугах.",
            "screens": [
                {
                    "screen_key": "gosuslugi-intro",
                    "title": "Зачем нужен аккаунт",
                    "order_index": 1,
                    "payload": {
                        "type": "article",
                        "markdown_content": "# Госуслуги без стресса\n\nВ этом уроке вы пройдете безопасный путь: вход -> выбор услуги -> подтверждение действия.",
                        "assets": [],
                    },
                },
                {
                    "screen_key": "gosuslugi-video",
                    "title": "Навигация по главной странице",
                    "order_index": 2,
                    "payload": {
                        "type": "video",
                        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
                        "duration_sec": 185,
                        "transcript": "Показываем, как найти популярные услуги и проверить статус заявлений.",
                    },
                },
                {
                    "screen_key": "gosuslugi-sim",
                    "title": "Симуляция: запись к врачу",
                    "order_index": 3,
                    "payload": {
                        "type": "simulation",
                        "image_url": "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1280&q=80",
                        "hotspots": [
                            {
                                "x": 18,
                                "y": 24,
                                "width": 30,
                                "height": 10,
                                "label": "Выбрать регион",
                                "hint": "Сначала проверьте регион и ФИО пациента.",
                                "target_screen_key": None,
                            },
                            {
                                "x": 62,
                                "y": 78,
                                "width": 24,
                                "height": 9,
                                "label": "Подтвердить запись",
                                "hint": "Убедитесь в корректности даты и времени перед подтверждением.",
                                "target_screen_key": None,
                            },
                        ],
                        "is_start": True,
                        "is_completion": True,
                    },
                },
                {
                    "screen_key": "gosuslugi-quiz",
                    "title": "Проверка знаний",
                    "order_index": 4,
                    "payload": {
                        "type": "quiz",
                        "questions": [
                            {
                                "id": "gs-q1",
                                "type": "single_choice",
                                "text": "Что нужно проверить перед подтверждением записи?",
                                "options": [
                                    {"id": "a", "text": "Только номер телефона"},
                                    {"id": "b", "text": "Дату, время и получателя услуги"},
                                    {"id": "c", "text": "Только адрес поликлиники"},
                                ],
                                "correct_option_id": "b",
                            }
                        ],
                    },
                },
            ],
        },
        {
            "slug": "sberbank-online-security",
            "title": "СберБанк Онлайн: безопасные платежи",
            "description": "Как оплачивать счета, переводить деньги и распознавать мошеннические сценарии.",
            "version": "1.0.0",
            "changelog": "Первая публикация: базовая финансовая грамотность в мобильном банке.",
            "screens": [
                {
                    "screen_key": "sber-intro",
                    "title": "Правило трех проверок",
                    "order_index": 1,
                    "payload": {
                        "type": "article",
                        "markdown_content": "# Безопасные операции\n\nПеред оплатой всегда проверьте получателя, сумму и назначение платежа.",
                        "assets": [],
                    },
                },
                {
                    "screen_key": "sber-video",
                    "title": "Оплата по QR-коду",
                    "order_index": 2,
                    "payload": {
                        "type": "video",
                        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                        "duration_sec": 210,
                        "transcript": "Пошагово показываем оплату без ручного ввода реквизитов.",
                    },
                },
                {
                    "screen_key": "sber-sim",
                    "title": "Симуляция: перевод по номеру",
                    "order_index": 3,
                    "payload": {
                        "type": "simulation",
                        "image_url": "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1280&q=80",
                        "hotspots": [
                            {
                                "x": 14,
                                "y": 29,
                                "width": 34,
                                "height": 11,
                                "label": "Проверить получателя",
                                "hint": "Сверьте имя получателя до отправки.",
                                "target_screen_key": None,
                            },
                            {
                                "x": 59,
                                "y": 74,
                                "width": 27,
                                "height": 10,
                                "label": "Подтвердить перевод",
                                "hint": "Подтверждайте только если данные верны.",
                                "target_screen_key": None,
                            },
                        ],
                        "is_start": True,
                        "is_completion": True,
                    },
                },
                {
                    "screen_key": "sber-quiz",
                    "title": "Мини-тест",
                    "order_index": 4,
                    "payload": {
                        "type": "quiz",
                        "questions": [
                            {
                                "id": "sb-q1",
                                "type": "single_choice",
                                "text": "Что нельзя сообщать даже сотруднику банка по телефону?",
                                "options": [
                                    {"id": "a", "text": "ФИО"},
                                    {"id": "b", "text": "CVV и коды из SMS"},
                                    {"id": "c", "text": "Номер карты"},
                                ],
                                "correct_option_id": "b",
                            }
                        ],
                    },
                },
            ],
        },
        {
            "slug": "zhkh-payments-online",
            "title": "ЖКХ онлайн: платежи и показания",
            "description": "Научитесь передавать показания счетчиков и оплачивать коммунальные услуги онлайн.",
            "version": "1.0.0",
            "changelog": "Первая публикация: сценарии ежемесячной оплаты ЖКХ.",
            "screens": [
                {
                    "screen_key": "zhkh-intro",
                    "title": "Что подготовить заранее",
                    "order_index": 1,
                    "payload": {
                        "type": "article",
                        "markdown_content": "# Платежи без ошибок\n\nПодготовьте номер лицевого счета, актуальные показания и сумму последнего платежа.",
                        "assets": [],
                    },
                },
                {
                    "screen_key": "zhkh-video",
                    "title": "Передача показаний",
                    "order_index": 2,
                    "payload": {
                        "type": "video",
                        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                        "duration_sec": 240,
                        "transcript": "Показываем, как вносить показания воды и электричества в личном кабинете.",
                    },
                },
                {
                    "screen_key": "zhkh-sim",
                    "title": "Симуляция: оплата квитанции",
                    "order_index": 3,
                    "payload": {
                        "type": "simulation",
                        "image_url": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1280&q=80",
                        "hotspots": [
                            {
                                "x": 13,
                                "y": 31,
                                "width": 36,
                                "height": 12,
                                "label": "Проверить лицевой счет",
                                "hint": "Сверьте номер счета с бумажной квитанцией.",
                                "target_screen_key": None,
                            },
                            {
                                "x": 61,
                                "y": 77,
                                "width": 26,
                                "height": 10,
                                "label": "Оплатить",
                                "hint": "Перед оплатой проверьте период начисления.",
                                "target_screen_key": None,
                            },
                        ],
                        "is_start": True,
                        "is_completion": True,
                    },
                },
                {
                    "screen_key": "zhkh-quiz",
                    "title": "Проверка знаний",
                    "order_index": 4,
                    "payload": {
                        "type": "quiz",
                        "questions": [
                            {
                                "id": "zhkh-q1",
                                "type": "single_choice",
                                "text": "Как снизить риск ошибки при оплате ЖКХ?",
                                "options": [
                                    {"id": "a", "text": "Оплачивать сразу без проверки"},
                                    {"id": "b", "text": "Сверять лицевой счет и период"},
                                    {"id": "c", "text": "Округлять сумму вручную"},
                                ],
                                "correct_option_id": "b",
                            }
                        ],
                    },
                },
            ],
        },
        {
            "slug": "telemedicine-appointments",
            "title": "Телемедицина: запись и онлайн-консультации",
            "description": "Практика записи на онлайн-прием и подготовки к консультации с врачом.",
            "version": "1.0.0",
            "changelog": "Первая публикация: цифровые медицинские сервисы для ежедневной практики.",
            "screens": [
                {
                    "screen_key": "med-intro",
                    "title": "Подготовка к консультации",
                    "order_index": 1,
                    "payload": {
                        "type": "article",
                        "markdown_content": "# Онлайн-прием\n\nПодготовьте документы, список симптомов и вопросы, чтобы консультация была полезной.",
                        "assets": [],
                    },
                },
                {
                    "screen_key": "med-video",
                    "title": "Как выбрать удобное время",
                    "order_index": 2,
                    "payload": {
                        "type": "video",
                        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                        "duration_sec": 225,
                        "transcript": "Разбираем календарь врача, подтверждение записи и напоминания.",
                    },
                },
                {
                    "screen_key": "med-sim",
                    "title": "Симуляция: подтверждение приема",
                    "order_index": 3,
                    "payload": {
                        "type": "simulation",
                        "image_url": "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1280&q=80",
                        "hotspots": [
                            {
                                "x": 17,
                                "y": 27,
                                "width": 33,
                                "height": 12,
                                "label": "Проверить данные пациента",
                                "hint": "ФИО и дата рождения должны совпадать с документом.",
                                "target_screen_key": None,
                            },
                            {
                                "x": 60,
                                "y": 76,
                                "width": 24,
                                "height": 10,
                                "label": "Подтвердить прием",
                                "hint": "Проверьте дату, время и выбранного врача.",
                                "target_screen_key": None,
                            },
                        ],
                        "is_start": True,
                        "is_completion": True,
                    },
                },
                {
                    "screen_key": "med-quiz",
                    "title": "Контрольный вопрос",
                    "order_index": 4,
                    "payload": {
                        "type": "quiz",
                        "questions": [
                            {
                                "id": "med-q1",
                                "type": "single_choice",
                                "text": "Что лучше сделать до начала онлайн-приема?",
                                "options": [
                                    {"id": "a", "text": "Подготовить документы и список вопросов"},
                                    {"id": "b", "text": "Открыть сразу несколько приложений"},
                                    {"id": "c", "text": "Отключить звук"},
                                ],
                                "correct_option_id": "a",
                            }
                        ],
                    },
                },
            ],
        },
    ]


def seed_mock_catalog_courses() -> None:
    db = SessionLocal()
    now = _utcnow()

    try:
        print("Seeding diploma-themed mock courses...")

        for blueprint in _course_blueprints():
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
                print(f"[create] course: {slug}")
            else:
                course.title = blueprint["title"]
                course.description = blueprint["description"]
                course.status = CourseStatus.ACTIVE.value
                course.updated_at = now
                print(f"[update] course: {slug}")

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
                print(f"[create] release {blueprint['version']} for {slug}")
            else:
                release.changelog = blueprint["changelog"]
                release.status = ReleaseStatus.PUBLISHED.value
                release.published_at = now
                print(f"[refresh] release {blueprint['version']} for {slug}")

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

        db.commit()
        print("Done. Diploma-themed catalog data is ready for mobile client.")
    except Exception as exc:
        db.rollback()
        raise RuntimeError(f"Failed to seed catalog data: {exc}") from exc
    finally:
        db.close()


def cleanup_mock_catalog_courses(dry_run: bool = False) -> None:
    db = SessionLocal()

    try:
        courses = list(db.scalars(select(Course).where(Course.slug.in_(TARGET_SLUGS))).all())
        if not courses:
            print("No target mock courses found. Nothing to delete.")
            return

        found_slugs = [course.slug for course in courses]
        print(f"Found {len(found_slugs)} target course(s): {', '.join(found_slugs)}")

        if dry_run:
            print("Dry-run mode: no data was deleted.")
            return

        db.execute(delete(Course).where(Course.slug.in_(TARGET_SLUGS)))
        db.commit()
        print(f"Deleted {len(found_slugs)} course(s). Related releases/screens removed by cascade.")
    except Exception as exc:
        db.rollback()
        raise RuntimeError(f"Failed to cleanup mock courses: {exc}") from exc
    finally:
        db.close()


def reset_mock_catalog_courses(dry_run: bool = False) -> None:
    if dry_run:
        cleanup_mock_catalog_courses(dry_run=True)
        print("Dry-run reset: seed step skipped.")
        return

    cleanup_mock_catalog_courses(dry_run=False)
    seed_mock_catalog_courses()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Manage diploma-themed mock catalog data (seed/cleanup/reset)."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("seed", help="Create or update mock catalog courses")

    cleanup_parser = subparsers.add_parser("cleanup", help="Delete mock catalog courses")
    cleanup_parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted")

    reset_parser = subparsers.add_parser("reset", help="Cleanup and seed again")
    reset_parser.add_argument("--dry-run", action="store_true", help="Show cleanup target only")

    args = parser.parse_args()

    if args.command == "seed":
        seed_mock_catalog_courses()
        return

    if args.command == "cleanup":
        cleanup_mock_catalog_courses(dry_run=args.dry_run)
        return

    if args.command == "reset":
        reset_mock_catalog_courses(dry_run=args.dry_run)
        return


if __name__ == "__main__":
    main()
