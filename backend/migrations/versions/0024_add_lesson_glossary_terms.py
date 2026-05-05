"""add lesson glossary terms

Revision ID: 0024_add_lesson_glossary_terms
Revises: 0023_add_course_favorites
Create Date: 2026-04-28 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0024_add_lesson_glossary_terms"
down_revision: Union[str, None] = "0023_add_course_favorites"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lesson_glossary_terms",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("term", sa.String(length=120), nullable=False),
        sa.Column("definition", sa.Text(), nullable=False),
        sa.Column("example", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lesson_id", "term", name="uq_lesson_glossary_term_lesson_term"),
    )
    op.create_index(op.f("ix_lesson_glossary_terms_lesson_id"), "lesson_glossary_terms", ["lesson_id"])

    op.create_table(
        "user_glossary_terms",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("term_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_bookmarked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["term_id"], ["lesson_glossary_terms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "term_id", name="uq_user_glossary_term_user_term"),
    )
    op.create_index(op.f("ix_user_glossary_terms_term_id"), "user_glossary_terms", ["term_id"])
    op.create_index(op.f("ix_user_glossary_terms_user_id"), "user_glossary_terms", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_user_glossary_terms_user_id"), table_name="user_glossary_terms")
    op.drop_index(op.f("ix_user_glossary_terms_term_id"), table_name="user_glossary_terms")
    op.drop_table("user_glossary_terms")
    op.drop_index(op.f("ix_lesson_glossary_terms_lesson_id"), table_name="lesson_glossary_terms")
    op.drop_table("lesson_glossary_terms")
