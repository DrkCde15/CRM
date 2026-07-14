"""email account google script fields

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-14 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "email_accounts",
        sa.Column("google_script_url", sa.String(length=500), nullable=False, server_default=""),
    )
    op.add_column(
        "email_accounts",
        sa.Column("encrypted_script_secret", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("email_accounts", "encrypted_script_secret")
    op.drop_column("email_accounts", "google_script_url")
