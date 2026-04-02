"""add lesson progress tracking

Revision ID: 0015_progress_tracking
Revises: 0014_assignment_target_users
Create Date: 2026-04-01 21:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0015_progress_tracking"
down_revision: Union[str, None] = "0014_assignment_target_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lesson_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="in_progress"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_lesson_progress_user_lesson"),
    )
    op.create_index(op.f("ix_lesson_progress_user_id"), "lesson_progress", ["user_id"], unique=False)
    op.create_index(op.f("ix_lesson_progress_lesson_id"), "lesson_progress", ["lesson_id"], unique=False)

    op.execute(
        """
        INSERT INTO rbac_policy_rules (id, policy_key, role, enabled)
        VALUES
            ('33333333-3333-3333-3333-333333333331', 'progress.view', 'administrator', true),
            ('33333333-3333-3333-3333-333333333332', 'progress.view', 'moderator', true)
        ON CONFLICT (policy_key, role) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM rbac_policy_rules
        WHERE policy_key = 'progress.view'
          AND role IN ('administrator', 'moderator')
        """
    )
    op.drop_index(op.f("ix_lesson_progress_lesson_id"), table_name="lesson_progress")
    op.drop_index(op.f("ix_lesson_progress_user_id"), table_name="lesson_progress")
    op.drop_table("lesson_progress")
