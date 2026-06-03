"""add simulation media applications registry

Revision ID: 0038_sim_media_apps
Revises: 0037_drop_lesson_references
Create Date: 2026-06-15 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0038_sim_media_apps"
down_revision: Union[str, None] = "0037_drop_lesson_references"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "simulation_media_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scope_key", sa.String(length=190), nullable=False, server_default="global"),
        sa.Column("app_package_name", sa.String(length=255), nullable=False),
        sa.Column("app_name", sa.String(length=255), nullable=False),
        sa.Column("icon_url", sa.String(length=1000), nullable=True),
        sa.Column("store_url", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "owner_user_id",
            "scope_key",
            "app_package_name",
            name="uq_simulation_media_app_owner_scope_package",
        ),
    )
    op.create_index(
        op.f("ix_simulation_media_applications_owner_user_id"),
        "simulation_media_applications",
        ["owner_user_id"],
        unique=False,
    )
    op.alter_column("simulation_media_applications", "scope_key", server_default=None)


def downgrade() -> None:
    op.drop_index(
        op.f("ix_simulation_media_applications_owner_user_id"),
        table_name="simulation_media_applications",
    )
    op.drop_table("simulation_media_applications")
