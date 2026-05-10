"""add course competencies

Revision ID: 0034_course_competencies
Revises: 0033_diagnostics_trajectory
Create Date: 2026-05-09 00:00:00.000000
"""

from collections.abc import Sequence
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0034_course_competencies"
down_revision: str | None = "0033_diagnostics_trajectory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    now = datetime.now(timezone.utc)
    op.create_table(
        "competencies",
        sa.Column("key", sa.String(length=80), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("title", name="uq_competencies_title"),
    )

    op.create_table(
        "course_competencies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competency_key", sa.String(length=80), nullable=False),
        sa.Column("course_type", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["competency_key"], ["competencies.key"], ondelete="RESTRICT"),
        sa.UniqueConstraint("course_id", "competency_key", name="uq_course_competency"),
    )
    op.create_index("ix_course_competencies_course_id", "course_competencies", ["course_id"])
    op.create_index(
        "ix_course_competencies_competency_key",
        "course_competencies",
        ["competency_key"],
    )

    op.bulk_insert(
        sa.table(
            "competencies",
            sa.column("key", sa.String),
            sa.column("title", sa.String),
            sa.column("description", sa.Text),
            sa.column("category", sa.String),
            sa.column("is_active", sa.Boolean),
            sa.column("created_at", sa.DateTime(timezone=True)),
            sa.column("updated_at", sa.DateTime(timezone=True)),
        ),
        [
            {
                "key": "gosuslugi",
                "title": "Госуслуги",
                "description": "Работа с порталом и приложением Госуслуги",
                "category": "Госуслуги",
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "key": "banking",
                "title": "Онлайн-банкинг",
                "description": "Безопасная работа с банковскими сервисами",
                "category": "Финансы",
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "key": "messengers",
                "title": "Мессенджеры",
                "description": "Общение и обмен файлами в мессенджерах",
                "category": "Коммуникация",
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "key": "security",
                "title": "Кибербезопасность",
                "description": "Пароли, мошенничество и защита данных",
                "category": "Безопасность",
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_course_competencies_competency_key", table_name="course_competencies")
    op.drop_index("ix_course_competencies_course_id", table_name="course_competencies")
    op.drop_table("course_competencies")
    op.drop_table("competencies")
