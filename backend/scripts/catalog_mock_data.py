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
    CourseLesson,
    CourseRelease,
    CourseReleaseScreen,
    CourseStatus,
    LessonStatus,
    ReleaseStatus,
)
from app.modules.progress.infra.models import LessonGlossaryTerm  # noqa: E402
from app.modules.users import models as _user_models  # noqa: E402, F401
from app.shared.db.session import SessionLocal  # noqa: E402

TARGET_SLUGS = [
    "gosuslugi-doctor-appointment",
    "online-bank-safe-transfer",
    "messengers-messages-and-calls",
    "zhkh-payments-and-meters",
    "cybersecurity-scam-protection",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _checksum_payload(payload: dict[str, Any]) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _article(screen_key: str, title: str, order_index: int, markdown: str) -> dict[str, Any]:
    return {
        "screen_key": screen_key,
        "title": title,
        "order_index": order_index,
        "payload": {"type": "article", "markdown_content": markdown, "assets": []},
    }


def _video(screen_key: str, title: str, order_index: int, transcript: str) -> dict[str, Any]:
    return {
        "screen_key": screen_key,
        "title": title,
        "order_index": order_index,
        "payload": {
            "type": "video",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
            "duration_sec": 90,
            "transcript": transcript,
        },
    }


def _simulation(
    screen_key: str,
    title: str,
    image_url: str,
    hotspots: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "screen_key": screen_key,
        "title": title,
        "order_index": 3,
        "payload": {
            "type": "simulation",
            "image_url": image_url,
            "hotspots": hotspots,
            "is_start": True,
            "is_completion": True,
        },
    }


def _quiz(
    screen_key: str,
    title: str,
    question_id: str,
    question: str,
    correct_text: str,
) -> dict[str, Any]:
    return {
        "screen_key": screen_key,
        "title": title,
        "order_index": 4,
        "payload": {
            "type": "quiz",
            "questions": [
                {
                    "id": question_id,
                    "type": "single_choice",
                    "text": question,
                    "explanation": "Главное правило: не спешить и проверять данные перед нажатием.",
                    "options": [
                        {"id": "a", "text": "Нажать сразу, чтобы быстрее закончить"},
                        {"id": "b", "text": correct_text},
                        {"id": "c", "text": "Закрыть приложение без проверки"},
                    ],
                    "correct_option_id": "b",
                }
            ],
        },
    }


def _course(
    slug: str,
    title: str,
    description: str,
    prefix: str,
    intro: str,
    video_transcript: str,
    simulation_title: str,
    image_url: str,
    hotspots: list[dict[str, Any]],
    quiz_question: str,
    quiz_answer: str,
    summary: str,
) -> dict[str, Any]:
    return {
        "slug": slug,
        "title": title,
        "description": description,
        "status": CourseStatus.ACTIVE.value,
        "version": "1.0.0",
        "changelog": "Первая публикация: полный мобильный демо-флоу курса.",
        "screens": [
            _article(f"{prefix}-intro", "Что вы научитесь делать", 1, intro),
            _video(f"{prefix}-video", "Короткая демонстрация", 2, video_transcript),
            _simulation(f"{prefix}-simulation", simulation_title, image_url, hotspots),
            _quiz(f"{prefix}-quiz", "Мини-проверка", f"{prefix}-q1", quiz_question, quiz_answer),
            _article(f"{prefix}-summary", "Итоги и памятка", 5, summary),
        ],
    }


def _hotspot(
    x: float,
    y: float,
    width: float,
    height: float,
    label: str,
    hint: str,
) -> dict[str, Any]:
    return {
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "label": label,
        "hint": hint,
        "target_screen_key": None,
    }


def _glossary_terms_for_screen(slug: str, order_index: int) -> list[dict[str, str]]:
    terms_by_course: dict[str, list[dict[str, str]]] = {
        "gosuslugi-doctor-appointment": [
            {
                "term": "Госуслуги",
                "definition": "Государственный портал, где можно получить услуги онлайн.",
                "example": "Через Госуслуги можно записаться к врачу или проверить заявление.",
            },
            {
                "term": "Подтверждение записи",
                "definition": "Финальная проверка данных перед отправкой заявки.",
                "example": "Перед подтверждением сверяют врача, дату и время приема.",
            },
        ],
        "online-bank-safe-transfer": [
            {
                "term": "CVV",
                "definition": "Трехзначный код на карте, который нельзя сообщать другим людям.",
                "example": "Сотрудник банка не имеет права спрашивать CVV по телефону.",
            },
            {
                "term": "Код из SMS",
                "definition": "Одноразовый код подтверждения операции.",
                "example": "Код из SMS вводят только в приложении банка, если сами начали операцию.",
            },
        ],
        "messengers-messages-and-calls": [
            {
                "term": "Чат",
                "definition": "Окно переписки с человеком или группой людей.",
                "example": "В чате можно отправить текст, фото или голосовое сообщение.",
            },
            {
                "term": "Подозрительная ссылка",
                "definition": "Ссылка от неизвестного отправителя или с обещанием срочной выгоды.",
                "example": "Подозрительную ссылку лучше не открывать и проверить отправителя.",
            },
        ],
        "zhkh-payments-and-meters": [
            {
                "term": "Лицевой счет",
                "definition": "Номер, по которому сервис понимает, за какую квартиру или услугу идет оплата.",
                "example": "Лицевой счет сверяют с бумажной квитанцией перед оплатой.",
            },
            {
                "term": "Показания счетчика",
                "definition": "Текущие числа на приборе учета воды, газа или электричества.",
                "example": "Показания счетчика передают за текущий месяц.",
            },
        ],
        "cybersecurity-scam-protection": [
            {
                "term": "Мошеннический звонок",
                "definition": "Звонок, где вас торопят сообщить данные или перевести деньги.",
                "example": "Если звонящий давит и пугает, лучше положить трубку и перезвонить самому.",
            },
            {
                "term": "Проверка отправителя",
                "definition": "Сравнение сообщения с известным номером или другим каналом связи.",
                "example": "Если близкий просит деньги в сообщении, перезвоните ему по знакомому номеру.",
            },
        ],
    }
    terms = terms_by_course.get(slug, [])
    if order_index <= len(terms):
        return [terms[order_index - 1]]
    return []


def _course_blueprints() -> list[dict[str, Any]]:
    return [
        _course(
            slug="gosuslugi-doctor-appointment",
            title="Госуслуги: запись к врачу",
            description="Пошаговая тренировка записи к врачу через цифровой сервис без риска ошибки.",
            prefix="gosuslugi",
            intro="# Запись к врачу\n\nВы научитесь выбрать услугу, проверить пациента, дату и подтвердить запись.",
            video_transcript="Показываем, где искать медицинские услуги и как не перепутать дату приема.",
            simulation_title="Симуляция: подтверждение записи",
            image_url="https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1280&q=80",
            hotspots=[
                _hotspot(18, 24, 30, 10, "Проверить регион", "Сначала убедитесь, что выбран ваш регион."),
                _hotspot(62, 78, 24, 9, "Подтвердить запись", "Проверьте врача, дату и время перед подтверждением."),
            ],
            quiz_question="Что важно проверить перед подтверждением записи?",
            quiz_answer="Врача, дату, время и получателя услуги",
            summary="# Готово\n\nПеред подтверждением всегда сверяйте регион, пациента, врача и время записи.",
        ),
        _course(
            slug="online-bank-safe-transfer",
            title="Онлайн-банк: безопасный перевод",
            description="Практика перевода денег с проверкой получателя, суммы и защиты от мошенников.",
            prefix="bank",
            intro="# Перевод без тревоги\n\nРазберем безопасный путь: выбрать получателя, проверить сумму, подтвердить перевод.",
            video_transcript="Объясняем три проверки перед переводом и почему нельзя сообщать коды из SMS.",
            simulation_title="Симуляция: перевод по номеру",
            image_url="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1280&q=80",
            hotspots=[
                _hotspot(14, 29, 34, 11, "Проверить получателя", "Сверьте имя получателя до отправки."),
                _hotspot(59, 74, 27, 10, "Подтвердить перевод", "Подтверждайте только если сумма и имя верны."),
            ],
            quiz_question="Что нельзя сообщать по телефону даже якобы сотруднику банка?",
            quiz_answer="CVV и коды из SMS",
            summary="# Памятка\n\nНе называйте коды. Перед переводом проверьте получателя, сумму и назначение.",
        ),
        _course(
            slug="messengers-messages-and-calls",
            title="Мессенджеры: сообщения и звонки",
            description="Как писать сообщения, звонить близким и распознавать подозрительные ссылки.",
            prefix="messenger",
            intro="# Общение онлайн\n\nВы потренируетесь открыть чат, отправить сообщение и начать видеозвонок.",
            video_transcript="Показываем, чем отличаются личные сообщения, группы и видеозвонки.",
            simulation_title="Симуляция: отправка сообщения",
            image_url="https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1280&q=80",
            hotspots=[
                _hotspot(19, 30, 36, 10, "Выбрать чат", "Откройте нужный чат по имени человека."),
                _hotspot(58, 78, 28, 9, "Отправить сообщение", "Проверьте текст перед отправкой."),
            ],
            quiz_question="Что лучше сделать с незнакомой ссылкой в чате?",
            quiz_answer="Не открывать сразу и проверить отправителя",
            summary="# Теперь вы умеете\n\nОткрывать чат, писать сообщение, начинать звонок и осторожно относиться к ссылкам.",
        ),
        _course(
            slug="zhkh-payments-and-meters",
            title="ЖКХ онлайн: показания и оплата",
            description="Тренировка передачи показаний счетчиков и оплаты коммунальных услуг онлайн.",
            prefix="zhkh",
            intro="# ЖКХ без очередей\n\nПодготовьте лицевой счет, показания и квитанцию перед оплатой.",
            video_transcript="Показываем, как сверять лицевой счет и период начисления.",
            simulation_title="Симуляция: оплата квитанции",
            image_url="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1280&q=80",
            hotspots=[
                _hotspot(13, 31, 36, 12, "Проверить лицевой счет", "Сверьте номер счета с бумажной квитанцией."),
                _hotspot(61, 77, 26, 10, "Оплатить", "Перед оплатой проверьте период и сумму."),
            ],
            quiz_question="Как снизить риск ошибки при оплате ЖКХ?",
            quiz_answer="Сверять лицевой счет, период и сумму",
            summary="# Чек-лист\n\nПеред оплатой проверьте лицевой счет, месяц, сумму и способ оплаты.",
        ),
        _course(
            slug="cybersecurity-scam-protection",
            title="Кибербезопасность: защита от мошенников",
            description="Как распознавать опасные звонки, ссылки и просьбы перевести деньги.",
            prefix="security",
            intro="# Безопасность каждый день\n\nНаучимся замечать красные флаги и не поддаваться давлению мошенников.",
            video_transcript="Разбираем типичные фразы мошенников и безопасный порядок действий.",
            simulation_title="Симуляция: подозрительное сообщение",
            image_url="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1280&q=80",
            hotspots=[
                _hotspot(20, 28, 38, 11, "Проверить отправителя", "Не доверяйте просьбам о деньгах без проверки."),
                _hotspot(61, 76, 23, 9, "Сообщить близким", "Перезвоните человеку по знакомому номеру."),
            ],
            quiz_question="Что делать, если вас торопят перевести деньги?",
            quiz_answer="Остановиться и проверить информацию через другой канал",
            summary="# Главное правило\n\nНе спешите. Проверяйте отправителя, не сообщайте коды и советуйтесь с близкими.",
        ),
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

            db.execute(
                delete(CourseReleaseScreen).where(CourseReleaseScreen.release_id == release.id)
            )
            db.execute(delete(CourseLesson).where(CourseLesson.course_id == course.id))

            for screen_data in blueprint["screens"]:
                lesson = CourseLesson(
                    id=uuid.uuid4(),
                    course_id=course.id,
                    title=screen_data["title"],
                    description=None,
                    order_index=screen_data["order_index"],
                    status=LessonStatus.ACTIVE.value,
                    created_at=now,
                    updated_at=now,
                )
                db.add(lesson)
                db.flush()

                for term_index, term_data in enumerate(
                    _glossary_terms_for_screen(slug, screen_data["order_index"]),
                    start=1,
                ):
                    db.add(
                        LessonGlossaryTerm(
                            id=uuid.uuid4(),
                            lesson_id=lesson.id,
                            term=term_data["term"],
                            definition=term_data["definition"],
                            example=term_data["example"],
                            order_index=term_index,
                            created_at=now,
                        )
                    )

                payload = dict(screen_data["payload"])
                payload["lesson_id"] = str(lesson.id)
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
