"""Model import registry for metadata discovery (Alembic and runtime)."""

from app.modules.auth.infra.models import OtpChallenge, QrLoginToken, UserSession
from app.modules.catalog.infra.models import Course, CourseRelease, CourseReleaseScreen
from app.modules.users.models import User

__all__ = [
    "User",
    "OtpChallenge",
    "QrLoginToken",
    "UserSession",
    "Course",
    "CourseRelease",
    "CourseReleaseScreen",
]
