"""create ai_conversations and ai_messages tables

Revision ID: d1e2f3a4b5c6
Revises: c0d4e5f6a7b8
Create Date: 2026-07-29 16:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c0d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(name: str) -> bool:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    return name in insp.get_table_names()


def upgrade() -> None:
    if not table_exists('ai_conversations'):
        op.create_table('ai_conversations',
            sa.Column('id', sa.String(64), nullable=False),
            sa.Column('company_id', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(255), nullable=False, server_default='Nova conversa'),
            sa.Column('agent', sa.String(100), nullable=False, server_default='assistente'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_ai_conversations_company_id'), 'ai_conversations', ['company_id'])
        op.create_index(op.f('ix_ai_conversations_user_id'), 'ai_conversations', ['user_id'])

    if not table_exists('ai_messages'):
        op.create_table('ai_messages',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('conversation_id', sa.String(64), nullable=False),
            sa.Column('role', sa.String(20), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['conversation_id'], ['ai_conversations.id'], ondelete='CASCADE'),
        )
        op.create_index(op.f('ix_ai_messages_conversation_id'), 'ai_messages', ['conversation_id'])


def downgrade() -> None:
    op.drop_table('ai_messages')
    op.drop_table('ai_conversations')
