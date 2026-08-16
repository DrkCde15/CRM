"""mcp servers n8n

Substitui os campos de Docker (image, container_name, container_id, port) por
campos de integração com o n8n (workflow_id, n8n_base_url, n8n_api_key).

Revision ID: 20260816_1000
Revises: d1e2f3a4b5c6
Create Date: 2026-08-16

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260816_1000"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("mcp_servers") as batch_op:
        batch_op.drop_column("image")
        batch_op.drop_column("container_name")
        batch_op.drop_column("container_id")
        batch_op.drop_column("port")
        batch_op.add_column(sa.Column("workflow_id", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("n8n_base_url", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("n8n_api_key", sa.String(length=500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("mcp_servers") as batch_op:
        batch_op.drop_column("n8n_api_key")
        batch_op.drop_column("n8n_base_url")
        batch_op.drop_column("workflow_id")
        batch_op.add_column(
            sa.Column("port", sa.Integer(), nullable=True, server_default="0")
        )
        batch_op.add_column(sa.Column("container_id", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("container_name", sa.String(length=255), nullable=True))
        batch_op.add_column(
            sa.Column("image", sa.String(length=255), nullable=True, server_default="")
        )
