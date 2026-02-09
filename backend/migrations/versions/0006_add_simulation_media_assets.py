"""add simulation media assets

Revision ID: 0006_add_simulation_media_assets
Revises: 0005_add_simulation_scope_key
Create Date: 2026-02-08 23:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0006_add_simulation_media_assets"
down_revision: Union[str, None] = "0005_add_simulation_scope_key"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "simulation_media_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scope_key", sa.String(length=190), nullable=False, server_default="global"),
        sa.Column("app_package_name", sa.String(length=255), nullable=False),
        sa.Column("store_type", sa.String(length=30), nullable=False, server_default="other"),
        sa.Column("min_supported_version", sa.String(length=40), nullable=False),
        sa.Column("max_supported_version", sa.String(length=40), nullable=False),
        sa.Column("released_at", sa.Date(), nullable=True),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index(
        op.f("ix_simulation_media_assets_owner_user_id"),
        "simulation_media_assets",
        ["owner_user_id"],
        unique=False,
    )
    op.alter_column("simulation_media_assets", "scope_key", server_default=None)
    op.alter_column("simulation_media_assets", "store_type", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_simulation_media_assets_owner_user_id"), table_name="simulation_media_assets")
    op.drop_table("simulation_media_assets")
