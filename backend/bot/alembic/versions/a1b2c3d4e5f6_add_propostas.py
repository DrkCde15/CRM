"""add propostas table

Revision ID: a1b2c3d4e5f6
Revises: df67217e0195
Create Date: 2026-08-14 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'df67217e0195'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('propostas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('telefone', sa.String(length=20), nullable=False),
        sa.Column('titulo', sa.String(length=200), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('proposta_texto', sa.Text(), nullable=True),
        sa.Column('modelo', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_propostas_telefone'), 'propostas', ['telefone'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_propostas_telefone'), table_name='propostas')
    op.drop_table('propostas')
