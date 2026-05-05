"""add course help requests

Revision ID: 0026_add_course_help_requests
Revises: 0025_add_user_lesson_notes
Create Date: 2026-04-29 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0026_add_course_help_requests"
down_revision: str | None = "0025_add_user_lesson_notes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "course_help_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requester_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_to_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("screen_key", sa.String(length=120), nullable=True),
        sa.Column("screen_title", sa.String(length=255), nullable=True),
        sa.Column("request_type", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("staff_comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["requester_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_course_help_requests_course_id", "course_help_requests", ["course_id"])
    op.create_index("ix_course_help_requests_lesson_id", "course_help_requests", ["lesson_id"])
    op.create_index("ix_course_help_requests_requester_id", "course_help_requests", ["requester_id"])
    op.create_index("ix_course_help_requests_status", "course_help_requests", ["status"])


def downgrade() -> None:
    op.drop_index("ix_course_help_requests_status", table_name="course_help_requests")
    op.drop_index("ix_course_help_requests_requester_id", table_name="course_help_requests")
    op.drop_index("ix_course_help_requests_lesson_id", table_name="course_help_requests")
    op.drop_index("ix_course_help_requests_course_id", table_name="course_help_requests")
    op.drop_table("course_help_requests")
