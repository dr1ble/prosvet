"""add simulation draft scope key

Revision ID: 0005_add_simulation_scope_key
Revises: 0004_add_simulation_drafts
Create Date: 2026-02-08 21:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_add_simulation_scope_key"
down_revision: Union[str, None] = "0004_add_simulation_drafts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "simulation_drafts",
        sa.Column("scope_key", sa.String(length=190), nullable=False, server_default="global"),
    )
    op.drop_constraint(
        "uq_simulation_draft_owner",
        "simulation_drafts",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_simulation_draft_owner_scope",
        "simulation_drafts",
        ["owner_user_id", "scope_key"],
    )
    op.alter_column("simulation_drafts", "scope_key", server_default=None)


def downgrade() -> None:
    op.drop_constraint(
        "uq_simulation_draft_owner_scope",
        "simulation_drafts",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_simulation_draft_owner",
        "simulation_drafts",
        ["owner_user_id"],
    )
    op.drop_column("simulation_drafts", "scope_key")
