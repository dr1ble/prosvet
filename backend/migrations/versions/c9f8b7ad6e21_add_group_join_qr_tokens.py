from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c9f8b7ad6e21"
down_revision: Union[str, None] = "8e4958a5cc97"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "group_join_qr_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        op.f("ix_group_join_qr_tokens_group_id"),
        "group_join_qr_tokens",
        ["group_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_group_join_qr_tokens_created_by_user_id"),
        "group_join_qr_tokens",
        ["created_by_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_group_join_qr_tokens_token_hash"),
        "group_join_qr_tokens",
        ["token_hash"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_group_join_qr_tokens_token_hash"), table_name="group_join_qr_tokens")
    op.drop_index(
        op.f("ix_group_join_qr_tokens_created_by_user_id"), table_name="group_join_qr_tokens"
    )
    op.drop_index(op.f("ix_group_join_qr_tokens_group_id"), table_name="group_join_qr_tokens")
    op.drop_table("group_join_qr_tokens")
