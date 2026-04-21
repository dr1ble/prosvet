"""add assistant role and rbac permissions

Revision ID: 0018_add_assistant_role
Revises: c9f8b7ad6e21
Create Date: 2026-04-04 18:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0018_add_assistant_role"
down_revision: Union[str, None] = "c9f8b7ad6e21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO rbac_policy_rules (id, policy_key, role, enabled)
        VALUES
            ('44444444-4444-4444-4444-444444444001', 'dashboard.view', 'assistant', true),
            ('44444444-4444-4444-4444-444444444002', 'catalog.view', 'assistant', true),
            ('44444444-4444-4444-4444-444444444003', 'groups.view', 'assistant', true),
            ('44444444-4444-4444-4444-444444444004', 'groups.manage', 'assistant', true),
            ('44444444-4444-4444-4444-444444444005', 'progress.view', 'assistant', true),
            ('44444444-4444-4444-4444-444444444006', 'search.view', 'assistant', true)
        ON CONFLICT (policy_key, role) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM rbac_policy_rules
        WHERE id LIKE '44444444-4444-4444-4444-444444444%'
        """
    )
