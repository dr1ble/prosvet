"""add support reply view state

Revision ID: 0035_support_reply_view_state
Revises: 0034_course_competencies
Create Date: 2026-05-09 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0035_support_reply_view_state"
down_revision: str | None = "0034_course_competencies"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "course_help_requests",
        sa.Column("student_viewed_staff_reply_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_course_help_requests_requester_reply_viewed",
        "course_help_requests",
        ["requester_id", "student_viewed_staff_reply_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_course_help_requests_requester_reply_viewed", table_name="course_help_requests")
    op.drop_column("course_help_requests", "student_viewed_staff_reply_at")
