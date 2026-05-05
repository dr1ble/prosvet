"""add user lesson notes

Revision ID: 0025_add_user_lesson_notes
Revises: 0024_add_lesson_glossary_terms
Create Date: 2026-04-28 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0025_add_user_lesson_notes"
down_revision: Union[str, None] = "0024_add_lesson_glossary_terms"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_lesson_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_lesson_notes_lesson_id"), "user_lesson_notes", ["lesson_id"])
    op.create_index(op.f("ix_user_lesson_notes_user_id"), "user_lesson_notes", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_user_lesson_notes_user_id"), table_name="user_lesson_notes")
    op.drop_index(op.f("ix_user_lesson_notes_lesson_id"), table_name="user_lesson_notes")
    op.drop_table("user_lesson_notes")
