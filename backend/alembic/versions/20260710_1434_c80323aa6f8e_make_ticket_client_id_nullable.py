"""make ticket client_id nullable

Revision ID: c80323aa6f8e
Revises: 4508608f2e85
Create Date: 2026-07-10 14:34:32.265619

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c80323aa6f8e"
down_revision: Union[str, None] = "4508608f2e85"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("tickets") as batch_op:
        batch_op.alter_column("client_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("tickets") as batch_op:
        batch_op.alter_column("client_id", existing_type=sa.Integer(), nullable=False)
