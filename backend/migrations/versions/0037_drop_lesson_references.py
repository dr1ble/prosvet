"""drop legacy lesson_references table

Revision ID: 0037_drop_lesson_references
Revises: 0036_lesson_session_analytics
Create Date: 2026-05-09 22:50:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0037_drop_lesson_references"
down_revision: str | None = "0036_lesson_session_analytics"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("lesson_references"):
        return

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("lesson_references")}
    if op.f("ix_lesson_references_lesson_id") in existing_indexes:
        op.drop_index(op.f("ix_lesson_references_lesson_id"), table_name="lesson_references")

    op.drop_table("lesson_references")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("lesson_references"):
        return

    op.create_table(
        "lesson_references",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("lesson_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary_text", sa.Text(), nullable=False),
        sa.Column("key_points", sa.ARRAY(sa.String()), nullable=False),
        sa.Column("code_snippets", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_lesson_references_lesson_id"),
        "lesson_references",
        ["lesson_id"],
        unique=False,
    )
