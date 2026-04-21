# pyright: reportMissingImports=false

import argparse
import hashlib
import json
import os
import sys
from typing import Any

from sqlalchemy import delete, select

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.modules.catalog.infra.models import (
    Course,
    CourseLesson,
    CourseStatus,
    LessonStatus,
    LessonTask,
)
from app.modules.users.models import User
from app.shared.db.session import SessionLocal
from scripts.db_schema_health import SchemaHealthError, ensure_db_schema_healthy

USER_TABLE = User.__table__

TARGET_SLUGS = [
    "builder-demo-valid",
    "builder-demo-issues",
]


def checksum(payload: dict[str, Any]) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def blueprints() -> list[dict[str, Any]]:
    return [
        {
            "slug": "builder-demo-valid",
            "title": "Демо курс: валидный флоу",
            "description": "Курс для быстрой проверки редактора, превью и публикации без ошибок.",
            "lessons": [
                {
                    "title": "Введение",
                    "description": "Стартовый урок",
                    "tasks": [
                        {
                            "task_type": "theory_text",
                            "title": "Теория",
                            "required": True,
                            "payload": {
                                "content": "<h2>Добро пожаловать</h2><p>Это демо-курс для проверки UI билдера.</p>",
                            },
                        },
                        {
                            "task_type": "theory_video",
                            "title": "Видеоблок",
                            "required": True,
                            "payload": {
                                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                                "transcript": "Короткий транскрипт для проверки редактора.",
                            },
                        },
                        {
                            "task_type": "quiz",
                            "title": "Проверка знаний",
                            "required": True,
                            "payload": {
                                "questions": [
                                    {
                                        "type": "single_choice",
                                        "question": "Какой это курс?",
                                        "options": [
                                            {"text": "Демо", "correct": True},
                                            {"text": "Боевой", "correct": False},
                                        ],
                                    }
                                ]
                            },
                        },
                    ],
                }
            ],
        },
        {
            "slug": "builder-demo-issues",
            "title": "Демо курс: с ошибками",
            "description": "Курс с намеренно неверными блоками для проверки валидации и подсветки проблем.",
            "lessons": [
                {
                    "title": "Проблемный урок",
                    "description": "Нужно исправить ошибки перед публикацией",
                    "tasks": [
                        {
                            "task_type": "theory_video",
                            "title": "Приветствие",
                            "required": True,
                            "payload": {
                                "video_url": "",
                            },
                        },
                        {
                            "task_type": "theory_text",
                            "title": "Теория",
                            "required": True,
                            "payload": {
                                "content": "",
                            },
                        },
                        {
                            "task_type": "simulation",
                            "title": "Новый блок",
                            "required": False,
                            "payload": {
                                "config": {},
                            },
                        },
                    ],
                }
            ],
        },
    ]


def cleanup() -> None:
    with SessionLocal.begin() as db:
        course_ids = db.scalars(select(Course.id).where(Course.slug.in_(TARGET_SLUGS))).all()
        if course_ids:
            lesson_ids = db.scalars(
                select(CourseLesson.id).where(CourseLesson.course_id.in_(course_ids))
            ).all()
            if lesson_ids:
                db.execute(delete(LessonTask).where(LessonTask.lesson_id.in_(lesson_ids)))
            db.execute(delete(CourseLesson).where(CourseLesson.course_id.in_(course_ids)))
            db.execute(delete(Course).where(Course.id.in_(course_ids)))


def seed() -> None:
    cleanup()
    with SessionLocal.begin() as db:
        for course_bp in blueprints():
            course = Course(
                slug=course_bp["slug"],
                title=course_bp["title"],
                description=course_bp.get("description"),
                status=CourseStatus.DRAFT.value,
            )
            db.add(course)
            db.flush()

            for lesson_index, lesson_bp in enumerate(course_bp["lessons"]):
                lesson = CourseLesson(
                    course_id=course.id,
                    title=lesson_bp["title"],
                    description=lesson_bp.get("description"),
                    order_index=lesson_index,
                    status=LessonStatus.DRAFT.value,
                )
                db.add(lesson)
                db.flush()

                for task_index, task_bp in enumerate(lesson_bp["tasks"]):
                    payload = task_bp["payload"]
                    db.add(
                        LessonTask(
                            lesson_id=lesson.id,
                            task_type=task_bp["task_type"],
                            title=task_bp["title"],
                            order_index=task_index,
                            required=bool(task_bp.get("required", True)),
                            payload_json=payload,
                            checksum=checksum(payload),
                        )
                    )

            print(f"[seeded] {course.slug} -> /course-builder/{course.id}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed mock data for Course Builder UI checks.")
    parser.add_argument("command", choices=["seed", "cleanup", "reset"])
    args = parser.parse_args()

    try:
        ensure_db_schema_healthy()
    except SchemaHealthError as exc:
        raise SystemExit(str(exc)) from exc

    if args.command == "seed":
        seed()
    elif args.command == "cleanup":
        cleanup()
        print("[cleanup] removed course-builder mock data")
    else:
        cleanup()
        seed()


if __name__ == "__main__":
    main()
