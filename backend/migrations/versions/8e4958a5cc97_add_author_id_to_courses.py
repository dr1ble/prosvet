"""add_author_id_to_courses

Revision ID: 8e4958a5cc97
Revises: 4c75e110ab1f
Create Date: 2026-04-03 14:58:00.722729
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '8e4958a5cc97'
down_revision: Union[str, None] = '4c75e110ab1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'courses',
        sa.Column('author_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        op.f('ix_courses_author_id'),
        'courses',
        ['author_id'],
        unique=False,
    )
    op.create_foreign_key(
        'fk_courses_author_id_users',
        'courses', 'users',
        ['author_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_courses_author_id_users', 'courses', type_='foreignkey')
    op.drop_index(op.f('ix_courses_author_id'), table_name='courses')
    op.drop_column('courses', 'author_id')
