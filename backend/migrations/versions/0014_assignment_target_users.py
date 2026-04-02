"""add assignment target users

Revision ID: 0014_assignment_target_users
Revises: 0013_groups_assignments
Create Date: 2026-04-01 20:05:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0014_assignment_target_users"
down_revision: Union[str, None] = "0013_groups_assignments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "group_course_assignment_target_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["assignment_id"], ["group_course_assignments.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assignment_id", "user_id", name="uq_group_assignment_target_user"),
    )
    op.create_index(
        op.f("ix_group_course_assignment_target_users_assignment_id"),
        "group_course_assignment_target_users",
        ["assignment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_group_course_assignment_target_users_user_id"),
        "group_course_assignment_target_users",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_group_course_assignment_target_users_user_id"),
        table_name="group_course_assignment_target_users",
    )
    op.drop_index(
        op.f("ix_group_course_assignment_target_users_assignment_id"),
        table_name="group_course_assignment_target_users",
    )
    op.drop_table("group_course_assignment_target_users")
