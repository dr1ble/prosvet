"""add course favorites

Revision ID: 0023_add_course_favorites
Revises: 0022_add_password_reset_tokens
Create Date: 2026-04-27 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0023_add_course_favorites"
down_revision: Union[str, None] = "0022_add_password_reset_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "course_favorites",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_course_favorite_user_course"),
    )
    op.create_index(op.f("ix_course_favorites_course_id"), "course_favorites", ["course_id"])
    op.create_index(op.f("ix_course_favorites_user_id"), "course_favorites", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_course_favorites_user_id"), table_name="course_favorites")
    op.drop_index(op.f("ix_course_favorites_course_id"), table_name="course_favorites")
    op.drop_table("course_favorites")
