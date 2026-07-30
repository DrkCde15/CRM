"""add read and archived to conversations

Revision ID: 2c060afe81bb
Revises: 106a8143c808
Create Date: 2026-07-14 15:16:43.907792

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c060afe81bb'
down_revision: Union[str, None] = '106a8143c808'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        read_default, archived_default = sa.text('1'), sa.text('0')
    else:
        read_default, archived_default = sa.text('true'), sa.text('false')
    op.add_column('conversations', sa.Column('read', sa.Boolean(), nullable=False, server_default=read_default))
    op.add_column('conversations', sa.Column('archived', sa.Boolean(), nullable=False, server_default=archived_default))


def downgrade() -> None:
    op.drop_column('conversations', 'archived')
    op.drop_column('conversations', 'read')
    # ### end Alembic commands ###
