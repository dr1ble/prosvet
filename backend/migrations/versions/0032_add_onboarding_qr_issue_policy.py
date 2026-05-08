"""add onboarding qr issue policy

Revision ID: 0032_onboarding_qr_policy
Revises: 0031_personal_qr_policy
Create Date: 2026-05-07 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0032_onboarding_qr_policy"
down_revision: str | None = "0031_personal_qr_policy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO rbac_policy_rules (id, policy_key, role, enabled)
        VALUES
            ('88888888-8888-8888-8888-888888888101', 'auth.qr.onboarding.issue', 'administrator', true),
            ('88888888-8888-8888-8888-888888888102', 'auth.qr.onboarding.issue', 'moderator', true),
            ('88888888-8888-8888-8888-888888888103', 'auth.qr.onboarding.issue', 'assistant', true)
        ON CONFLICT (policy_key, role) DO UPDATE
            SET enabled = EXCLUDED.enabled,
                updated_at = now()
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM rbac_policy_rules
        WHERE policy_key = 'auth.qr.onboarding.issue'
        """
    )
