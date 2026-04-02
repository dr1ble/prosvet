"""add groups and group assignments

Revision ID: 0013_groups_assignments
Revises: 0012_add_lesson_tasks
Create Date: 2026-04-01 19:20:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0013_groups_assignments"
down_revision: Union[str, None] = "0012_add_lesson_tasks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_groups_name"),
    )

    op.create_table(
        "group_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_memberships_group_user"),
    )
    op.create_index(op.f("ix_group_memberships_group_id"), "group_memberships", ["group_id"], unique=False)
    op.create_index(op.f("ix_group_memberships_user_id"), "group_memberships", ["user_id"], unique=False)

    op.create_table(
        "group_course_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_policy", sa.String(length=32), nullable=False, server_default="immediate"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_group_course_assignments_group_id"),
        "group_course_assignments",
        ["group_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_group_course_assignments_course_id"),
        "group_course_assignments",
        ["course_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_group_course_assignments_created_by_user_id"),
        "group_course_assignments",
        ["created_by_user_id"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO rbac_policy_rules (id, policy_key, role, enabled)
        VALUES
            ('22222222-2222-2222-2222-222222222221', 'groups.view', 'administrator', true),
            ('22222222-2222-2222-2222-222222222222', 'groups.view', 'moderator', true),
            ('22222222-2222-2222-2222-222222222223', 'groups.manage', 'administrator', true),
            ('22222222-2222-2222-2222-222222222224', 'groups.manage', 'moderator', true)
        ON CONFLICT (policy_key, role) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM rbac_policy_rules
        WHERE policy_key IN ('groups.view', 'groups.manage')
          AND role IN ('administrator', 'moderator')
        """
    )

    op.drop_index(op.f("ix_group_course_assignments_created_by_user_id"), table_name="group_course_assignments")
    op.drop_index(op.f("ix_group_course_assignments_course_id"), table_name="group_course_assignments")
    op.drop_index(op.f("ix_group_course_assignments_group_id"), table_name="group_course_assignments")
    op.drop_table("group_course_assignments")

    op.drop_index(op.f("ix_group_memberships_user_id"), table_name="group_memberships")
    op.drop_index(op.f("ix_group_memberships_group_id"), table_name="group_memberships")
    op.drop_table("group_memberships")

    op.drop_table("groups")
