"""repair missing user_sessions table

Revision ID: 0008_fix_user_sessions
Revises: 0007_simulation_library_items
Create Date: 2026-02-11 21:10:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0008_fix_user_sessions"
down_revision: Union[str, None] = "0007_simulation_library_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("user_sessions"):
        op.create_table(
            "user_sessions",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("refresh_token_hash", sa.String(length=64), nullable=False),
            sa.Column("device_id_hash", sa.Text(), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_user_sessions_user_id",
            "user_sessions",
            ["user_id"],
            unique=False,
        )
        return

    # Ensure index exists even if table was created manually.
    indexes = {idx["name"] for idx in inspector.get_indexes("user_sessions")}
    if "ix_user_sessions_user_id" not in indexes:
        op.create_index(
            "ix_user_sessions_user_id",
            "user_sessions",
            ["user_id"],
            unique=False,
        )


def downgrade() -> None:
    # Intentionally no-op: this migration repairs schema drift.
    pass
