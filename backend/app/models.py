"""Model import registry for metadata discovery (Alembic and runtime)."""

from app.modules.auth.infra.models import QrLoginToken, UserSession
from app.modules.catalog.infra.models import (
    Competency,
    Course,
    CourseCompetency,
    CourseLesson,
    CourseRelease,
    CourseReleaseScreen,
    LessonTask,
)
from app.modules.diagnostics.infra.models import (
    DiagnosticAnswer,
    DiagnosticAttempt,
    DiagnosticCompetencyScore,
    DiagnosticQuestion,
    DiagnosticQuestionBank,
    LearningTrajectoryItem,
)
from app.modules.groups.infra.models import (
    GroupCourseAssignment,
    GroupCourseAssignmentTargetUser,
    GroupMembership,
    LearningGroup,
)
from app.modules.moderation.infra.models import ReleaseReview, ReleaseStatusHistory
from app.modules.progress.infra.models import LessonProgress
from app.modules.simulation.infra.models import SimulationDraft, SimulationMediaAsset
from app.modules.support.infra.models import CourseHelpRequest
from app.modules.users.models import User
from app.shared.auth.policy_models import RbacPolicyRule

__all__ = [
    "User",
    "QrLoginToken",
    "UserSession",
    "Course",
    "Competency",
    "CourseCompetency",
    "CourseLesson",
    "LessonTask",
    "CourseRelease",
    "CourseReleaseScreen",
    "DiagnosticQuestionBank",
    "DiagnosticQuestion",
    "DiagnosticAttempt",
    "DiagnosticAnswer",
    "DiagnosticCompetencyScore",
    "LearningTrajectoryItem",
    "LearningGroup",
    "GroupMembership",
    "GroupCourseAssignment",
    "GroupCourseAssignmentTargetUser",
    "ReleaseReview",
    "ReleaseStatusHistory",
    "LessonProgress",
    "SimulationDraft",
    "SimulationMediaAsset",
    "CourseHelpRequest",
    "RbacPolicyRule",
]
