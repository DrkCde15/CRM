"""create missing model tables (webhooks, scheduled_jobs, workflows, sla_rules, mcp_servers)

Revision ID: b9c3d4e5f6a7
Revises: a8b2c3d4e5f6
Create Date: 2026-07-29 15:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b9c3d4e5f6a7'
down_revision: Union[str, None] = 'a8b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(name: str) -> bool:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    return name in insp.get_table_names()


def upgrade() -> None:
    if not table_exists('webhooks'):
        op.create_table('webhooks',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('company_id', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('name', sa.String(255), nullable=False, server_default=''),
            sa.Column('url', sa.String(500), nullable=False),
            sa.Column('events', sa.Text(), nullable=False, server_default=''),
            sa.Column('secret', sa.String(64), nullable=False, server_default=''),
            sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_webhooks_company_id'), 'webhooks', ['company_id'])

    if not table_exists('scheduled_jobs'):
        op.create_table('scheduled_jobs',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('company_id', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('name', sa.String(255), nullable=False, server_default=''),
            sa.Column('task_type', sa.String(100), nullable=False),
            sa.Column('interval_minutes', sa.Integer(), nullable=False, server_default='60'),
            sa.Column('config', sa.JSON(), nullable=True),
            sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('last_run_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_scheduled_jobs_company_id'), 'scheduled_jobs', ['company_id'])

    if not table_exists('workflows'):
        op.create_table('workflows',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('company_id', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('name', sa.String(255), nullable=False, server_default=''),
            sa.Column('event', sa.String(100), nullable=False),
            sa.Column('conditions', sa.JSON(), nullable=True),
            sa.Column('actions', sa.JSON(), nullable=False),
            sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_workflows_company_id'), 'workflows', ['company_id'])

    if not table_exists('sla_rules'):
        op.create_table('sla_rules',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('company_id', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('name', sa.String(255), nullable=False, server_default=''),
            sa.Column('priority', sa.String(50), nullable=False, server_default='media'),
            sa.Column('max_response_hours', sa.Float(), nullable=False, server_default='24.0'),
            sa.Column('max_resolution_hours', sa.Float(), nullable=False, server_default='72.0'),
            sa.Column('escalate_after_hours', sa.Float(), nullable=False, server_default='0'),
            sa.Column('escalate_action', sa.String(50), nullable=False, server_default=''),
            sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_sla_rules_company_id'), 'sla_rules', ['company_id'])

    if not table_exists('mcp_servers'):
        op.create_table('mcp_servers',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('company_id', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('name', sa.String(255), nullable=False, server_default=''),
            sa.Column('server_url', sa.String(500), nullable=False, server_default=''),
            sa.Column('image', sa.String(255), nullable=False, server_default=''),
            sa.Column('container_name', sa.String(255), nullable=True),
            sa.Column('container_id', sa.String(255), nullable=True),
            sa.Column('port', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('env_vars', sa.JSON(), nullable=False),
            sa.Column('type', sa.String(50), nullable=False, server_default='custom'),
            sa.Column('status', sa.String(50), nullable=False, server_default='stopped'),
            sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_mcp_servers_company_id'), 'mcp_servers', ['company_id'])


def downgrade() -> None:
    op.drop_table('mcp_servers')
    op.drop_table('sla_rules')
    op.drop_table('workflows')
    op.drop_table('scheduled_jobs')
    op.drop_table('webhooks')
