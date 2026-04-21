"""add_course_lessons_and_lesson_tasks

Revision ID: 0012_add_lesson_tasks
Revises: 0011_remove_otp_and_phone_hash
Create Date: 2026-03-30 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012_add_lesson_tasks"
down_revision: Union[str, None] = "0011_remove_otp_and_phone_hash"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "course_lessons",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
    )
    op.create_index(
        op.f("ix_course_lessons_course_id"), "course_lessons", ["course_id"], unique=False
    )
    op.create_unique_constraint(
        "uq_lesson_order_per_course", "course_lessons", ["course_id", "order_index"]
    )

    op.create_table(
        "lesson_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_lesson_tasks_lesson_id"), "lesson_tasks", ["lesson_id"], unique=False)
    op.create_unique_constraint(
        "uq_task_order_per_lesson", "lesson_tasks", ["lesson_id", "order_index"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_task_order_per_lesson", "lesson_tasks", type_="unique")
    op.drop_index(op.f("ix_lesson_tasks_lesson_id"), table_name="lesson_tasks")
    op.drop_table("lesson_tasks")

    op.drop_constraint("uq_lesson_order_per_course", "course_lessons", type_="unique")
    op.drop_index(op.f("ix_course_lessons_course_id"), table_name="course_lessons")
    op.drop_table("course_lessons")
