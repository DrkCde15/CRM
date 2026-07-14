"""canned responses: quick replies and macros

Revision ID: d4e5f6a7b8c
Revises: c3d4e5f6a7b8
"""

from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "canned_responses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("kind", sa.String(length=20), nullable=False, server_default="quick_reply"),
        sa.Column("title", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_canned_responses_company_id", "canned_responses", ["company_id"])
    op.create_index("ix_canned_responses_kind", "canned_responses", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_canned_responses_kind", table_name="canned_responses")
    op.drop_index("ix_canned_responses_company_id", table_name="canned_responses")
    op.drop_table("canned_responses")
