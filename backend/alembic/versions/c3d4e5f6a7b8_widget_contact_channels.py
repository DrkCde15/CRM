"""widget whatsapp and email contact channels

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
"""

from alembic import op
import sqlalchemy as sa


revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "widget_configs",
        sa.Column("whatsapp_number", sa.String(length=40), server_default="", nullable=False),
    )
    op.add_column(
        "widget_configs",
        sa.Column("contact_email", sa.String(length=255), server_default="", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("widget_configs", "contact_email")
    op.drop_column("widget_configs", "whatsapp_number")
