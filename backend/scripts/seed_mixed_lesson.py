import os
import sys
import uuid
from datetime import datetime

# Add the project root to the python path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))


from app.modules.catalog.infra.models import (
    Course,
    CourseRelease,
    CourseReleaseScreen,
    CourseStatus,
    LessonReference,
    ReleaseStatus,
)
from app.shared.db.session import SessionLocal


def seed_mixed_lesson():
    db = SessionLocal()

    try:
        print("Seeding Mixed Content Demo Course...")

        # 1. Create Course
        course_id = uuid.uuid4()
        course = Course(
            id=course_id,
            slug="mixed-content-demo",
            title="Mixed Content Demo",
            description="A demonstration course showcasing all lesson content types.",
            status=CourseStatus.ACTIVE.value,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(course)

        # 2. Create Release
        release_id = uuid.uuid4()
        release = CourseRelease(
            id=release_id,
            course_id=course_id,
            version="1.0.0",
            changelog="Initial release with mixed content.",
            status=ReleaseStatus.PUBLISHED.value,
            published_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(release)

        # 3. Create Lesson Reference (for the simulation)
        ref_id = uuid.uuid4()
        lesson_ref = LessonReference(
            id=ref_id,
            lesson_id=uuid.uuid4(),  # Placeholder ID
            title="Understanding Simulations",
            summary_text="This reference explains how to interact with the simulation component.",
            key_points=[
                "Click hotspots to interact.",
                "Observe changes in the system.",
                "Use hints if stuck.",
            ],
            code_snippets=[
                {"label": "Start Simulation", "code": "sim.start()", "language": "python"},
                {"label": "Check Status", "code": "sim.status()", "language": "python"},
            ],
            created_at=datetime.utcnow(),
        )
        db.add(lesson_ref)

        # 4. Create Screens

        # Screen 1: Article (Intro)
        screen1 = CourseReleaseScreen(
            id=uuid.uuid4(),
            release_id=release_id,
            screen_key="intro-article",
            title="Introduction",
            order_index=1,
            payload_json={
                "type": "article",
                "markdown_content": "# Welcome\n\nThis lesson demonstrates the different content types available in the platform.\n\n* **Articles**: Rich text content like this.\n* **Videos**: Educational video playback.\n* **Simulations**: Interactive exercises.\n* **Quizzes**: Knowledge checks.\n\nSwipe right to continue.",
                "assets": [],
            },
            checksum="chk_1",
            created_at=datetime.utcnow(),
        )
        db.add(screen1)

        # Screen 2: Video
        screen2 = CourseReleaseScreen(
            id=uuid.uuid4(),
            release_id=release_id,
            screen_key="demo-video",
            title="Video Lecture",
            order_index=2,
            payload_json={
                "type": "video",
                "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                "duration_sec": 600,
                "transcript": "This is a placeholder transcript for the video demonstration.",
            },
            checksum="chk_2",
            created_at=datetime.utcnow(),
        )
        db.add(screen2)

        # Screen 3: Simulation (with Reference)
        screen3 = CourseReleaseScreen(
            id=uuid.uuid4(),
            release_id=release_id,
            screen_key="demo-simulation",
            title="Interactive Lab",
            order_index=3,
            payload_json={
                "type": "simulation",
                "image_url": "https://via.placeholder.com/800x600.png?text=Simulation+Interface",
                "hotspots": [
                    {
                        "x": 50.0,
                        "y": 50.0,
                        "width": 20.0,
                        "height": 10.0,
                        "label": "Start Button",
                        "hint": "Click to start",
                        "target_screen_key": None,
                    }
                ],
                "is_start": True,
                "is_completion": True,
                "context_ref": str(ref_id),
            },
            checksum="chk_3",
            created_at=datetime.utcnow(),
        )
        # Link reference to screen
        lesson_ref.lesson_id = screen3.id

        db.add(screen3)

        # Screen 4: Quiz
        screen4 = CourseReleaseScreen(
            id=uuid.uuid4(),
            release_id=release_id,
            screen_key="final-quiz",
            title="Knowledge Check",
            order_index=4,
            payload_json={
                "type": "quiz",
                "questions": [
                    {
                        "id": "q1",
                        "type": "single_choice",
                        "text": "Which content type allows user interaction?",
                        "options": [
                            {"id": "o1", "text": "Video"},
                            {"id": "o2", "text": "Article"},
                            {"id": "o3", "text": "Simulation"},
                        ],
                        "correct_option_id": "o3",
                    }
                ],
            },
            checksum="chk_4",
            created_at=datetime.utcnow(),
        )
        db.add(screen4)

        # Screen 5: Cheat Sheet (Summary)
        screen5 = CourseReleaseScreen(
            id=uuid.uuid4(),
            release_id=release_id,
            screen_key="summary-reference",
            title="Lesson Summary",
            order_index=5,
            payload_json={"type": "cheat_sheet", "reference_id": str(ref_id)},
            checksum="chk_5",
            created_at=datetime.utcnow(),
        )
        db.add(screen5)

        db.commit()
        print(f"Successfully seeded course: {course.title} (Slug: {course.slug})")
        print("Created 5 screens with Video, Article, Simulation, Quiz, and Cheat Sheet types.")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_mixed_lesson()
