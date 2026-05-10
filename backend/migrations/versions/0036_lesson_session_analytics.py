"""add lightweight lesson session analytics

Revision ID: 0036_lesson_session_analytics
Revises: 0035_support_reply_view_state
Create Date: 2026-05-09 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0036_lesson_session_analytics"
down_revision: str | None = "0035_support_reply_view_state"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "lesson_session_analytics",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("hint_level_max", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("result", sa.String(length=16), nullable=False, server_default="completed"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_lesson_session_analytics_user_id",
        "lesson_session_analytics",
        ["user_id"],
    )
    op.create_index(
        "ix_lesson_session_analytics_course_id",
        "lesson_session_analytics",
        ["course_id"],
    )
    op.create_index(
        "ix_lesson_session_analytics_lesson_id",
        "lesson_session_analytics",
        ["lesson_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_lesson_session_analytics_lesson_id", table_name="lesson_session_analytics")
    op.drop_index("ix_lesson_session_analytics_course_id", table_name="lesson_session_analytics")
    op.drop_index("ix_lesson_session_analytics_user_id", table_name="lesson_session_analytics")
    op.drop_table("lesson_session_analytics")
