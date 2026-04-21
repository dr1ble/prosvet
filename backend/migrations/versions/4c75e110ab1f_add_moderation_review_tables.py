"""add moderation review tables

Revision ID: 4c75e110ab1f
Revises: 0017_role_perms
Create Date: 2026-04-03 13:17:07.492535
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "4c75e110ab1f"
down_revision: Union[str, None] = "0017_role_perms"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "release_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("release_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewer_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("decision", sa.String(length=32), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["release_id"], ["course_releases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewer_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_release_reviews_release_id"), "release_reviews", ["release_id"], unique=False
    )
    op.create_index(
        op.f("ix_release_reviews_reviewer_user_id"),
        "release_reviews",
        ["reviewer_user_id"],
        unique=False,
    )

    op.create_table(
        "release_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("release_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_status", sa.String(length=32), nullable=False),
        sa.Column("to_status", sa.String(length=32), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["release_id"], ["course_releases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_release_status_history_actor_user_id"),
        "release_status_history",
        ["actor_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_release_status_history_release_id"),
        "release_status_history",
        ["release_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_release_status_history_release_id"), table_name="release_status_history")
    op.drop_index(op.f("ix_release_status_history_actor_user_id"), table_name="release_status_history")
    op.drop_table("release_status_history")

    op.drop_index(op.f("ix_release_reviews_reviewer_user_id"), table_name="release_reviews")
    op.drop_index(op.f("ix_release_reviews_release_id"), table_name="release_reviews")
    op.drop_table("release_reviews")
