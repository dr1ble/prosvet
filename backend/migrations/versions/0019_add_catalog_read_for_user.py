"""add catalog.read for user role

Revision ID: 0019_add_catalog_read_for_user
Revises: 0018_add_assistant_role
Create Date: 2026-04-06 13:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0019_add_catalog_read_for_user"
down_revision: Union[str, None] = "0018_add_assistant_role"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO rbac_policy_rules (id, policy_key, role, enabled)
        VALUES
            ('55555555-5555-5555-5555-555555555001', 'catalog.read', 'user', true)
        ON CONFLICT (policy_key, role) DO UPDATE
            SET enabled = EXCLUDED.enabled,
                updated_at = now()
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM rbac_policy_rules
        WHERE id = '55555555-5555-5555-5555-555555555001'
        """
    )
