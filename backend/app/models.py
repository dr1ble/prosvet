"""Model import registry for metadata discovery (Alembic and runtime)."""

from app.modules.auth.infra.models import QrLoginToken, UserSession
from app.modules.catalog.infra.models import (
    Course,
    CourseLesson,
    CourseRelease,
    CourseReleaseScreen,
    LessonTask,
)
from app.modules.simulation.infra.models import SimulationDraft, SimulationMediaAsset
from app.modules.users.models import User
from app.shared.auth.policy_models import RbacPolicyRule

__all__ = [
    "User",
    "QrLoginToken",
    "UserSession",
    "Course",
    "CourseLesson",
    "LessonTask",
    "CourseRelease",
    "CourseReleaseScreen",
    "SimulationDraft",
    "SimulationMediaAsset",
    "RbacPolicyRule",
]
