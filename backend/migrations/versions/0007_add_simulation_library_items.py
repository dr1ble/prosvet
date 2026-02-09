"""add simulation library items

Revision ID: 0007_add_simulation_library_items
Revises: 0006_add_simulation_media_assets
Create Date: 2026-02-09 23:10:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0007_add_simulation_library_items"
down_revision: Union[str, None] = "0006_add_simulation_media_assets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "simulation_library_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scope_key", sa.String(length=190), nullable=False, server_default="global"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("target_app_name", sa.String(length=255), nullable=True),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
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
    )
    op.create_index(
        op.f("ix_simulation_library_items_owner_user_id"),
        "simulation_library_items",
        ["owner_user_id"],
        unique=False,
    )
    op.alter_column("simulation_library_items", "scope_key", server_default=None)


def downgrade() -> None:
    op.drop_index(
        op.f("ix_simulation_library_items_owner_user_id"),
        table_name="simulation_library_items",
    )
    op.drop_table("simulation_library_items")
