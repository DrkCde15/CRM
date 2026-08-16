"""add missing columns in appointments and tickets

Revision ID: a8b2c3d4e5f6
Revises: f7a1b2c3d4e5
Create Date: 2026-07-29 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a8b2c3d4e5f6'
down_revision: Union[str, None] = 'f7a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table: str, col: str) -> bool:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    return any(c['name'] == col for c in insp.get_columns(table))


def upgrade() -> None:
    if not column_exists('appointments', 'user_id'):
        op.add_column('appointments', sa.Column('user_id', sa.Integer(), nullable=True))
    if not column_exists('appointments', 'external_id'):
        op.add_column('appointments', sa.Column('external_id', sa.String(255), nullable=True))
    if not column_exists('appointments', 'provider'):
        op.add_column('appointments', sa.Column('provider', sa.String(50), nullable=True))
    if not column_exists('tickets', 'sla_breached'):
        op.add_column('tickets', sa.Column('sla_breached', sa.Boolean(), nullable=False, server_default='false'))
        # SQLite (versões sem suporte a ALTER COLUMN DROP DEFAULT) mantém o
        # server_default; em Postgres removemos para não forçar default na coluna.
        if op.get_bind().dialect.name != "sqlite":
            op.alter_column('tickets', 'sla_breached', server_default=None)


def downgrade() -> None:
    op.drop_column('tickets', 'sla_breached')
    op.drop_column('appointments', 'provider')
    op.drop_column('appointments', 'external_id')
    op.drop_column('appointments', 'user_id')
