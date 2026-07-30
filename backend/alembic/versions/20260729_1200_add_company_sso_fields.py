"""add sso fields to companies

Revision ID: f7a1b2c3d4e5
Revises: e6f6a0938a63
Create Date: 2026-07-29 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f7a1b2c3d4e5'
down_revision: Union[str, None] = 'e6f6a0938a63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = [c['name'] for c in insp.get_columns('companies')]
    if 'sso_provider' not in cols:
        op.add_column('companies', sa.Column('sso_provider', sa.String(50), nullable=True))
    if 'sso_client_id' not in cols:
        op.add_column('companies', sa.Column('sso_client_id', sa.String(500), nullable=True))
    if 'sso_client_secret' not in cols:
        op.add_column('companies', sa.Column('sso_client_secret', sa.Text(), nullable=True))
    if 'sso_issuer' not in cols:
        op.add_column('companies', sa.Column('sso_issuer', sa.String(500), nullable=True))
    if 'sso_metadata_url' not in cols:
        op.add_column('companies', sa.Column('sso_metadata_url', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('companies', 'sso_metadata_url')
    op.drop_column('companies', 'sso_issuer')
    op.drop_column('companies', 'sso_client_secret')
    op.drop_column('companies', 'sso_client_id')
    op.drop_column('companies', 'sso_provider')
