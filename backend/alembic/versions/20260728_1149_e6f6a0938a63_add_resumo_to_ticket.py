"""add resumo to ticket

Revision ID: e6f6a0938a63
Revises: 2c060afe81bb
Create Date: 2026-07-28 11:49:31.224022

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e6f6a0938a63'
down_revision: Union[str, None] = '2c060afe81bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()
    for t in ('website_conversations', 'website_messages', 'website_visitors', 'widget_configs'):
        if t in tables:
            op.drop_table(t)

    columns = [c['name'] for c in insp.get_columns('tickets')]
    if 'resumo' not in columns:
        op.add_column('tickets', sa.Column('resumo', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('tickets', 'resumo')
