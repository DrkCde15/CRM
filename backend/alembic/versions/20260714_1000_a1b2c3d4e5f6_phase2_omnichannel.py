"""phase 2 omnichannel channels

Revision ID: a1b2c3d4e5f6
Revises: 9674c849521a
Create Date: 2026-07-14 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9674c849521a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("smtp_host", sa.String(length=255), nullable=False),
        sa.Column("smtp_port", sa.Integer(), nullable=False),
        sa.Column("imap_host", sa.String(length=255), nullable=False),
        sa.Column("imap_port", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("encrypted_password", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_accounts_email"), "email_accounts", ["email"])
    op.create_index(
        op.f("ix_email_accounts_company_id"), "email_accounts", ["company_id"]
    )

    op.create_table(
        "email_conversations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("ticket_id", sa.Integer(), nullable=True),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("thread_id", sa.String(length=255), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["email_accounts.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_conversations_thread_id"),
        "email_conversations",
        ["thread_id"],
    )
    op.create_index(
        op.f("ix_email_conversations_account_id"),
        "email_conversations",
        ["account_id"],
    )
    op.create_index(
        op.f("ix_email_conversations_client_id"),
        "email_conversations",
        ["client_id"],
    )
    op.create_index(
        op.f("ix_email_conversations_ticket_id"),
        "email_conversations",
        ["ticket_id"],
    )

    op.create_table(
        "email_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("sender", sa.String(length=500), nullable=False),
        sa.Column("recipient", sa.String(length=500), nullable=False),
        sa.Column("cc", sa.Text(), nullable=False),
        sa.Column("bcc", sa.Text(), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column("attachments", sa.JSON(), nullable=False),
        sa.Column("message_id", sa.String(length=500), nullable=False),
        sa.Column("in_reply_to", sa.String(length=500), nullable=False),
        sa.Column("direction", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["email_conversations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_messages_conversation_id"),
        "email_messages",
        ["conversation_id"],
    )
    op.create_index(
        op.f("ix_email_messages_message_id"), "email_messages", ["message_id"]
    )

    op.create_table(
        "website_visitors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
        sa.Column("ip", sa.String(length=64), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=False),
        sa.Column("country", sa.String(length=120), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_seen", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_website_visitors_session_id"), "website_visitors", ["session_id"]
    )

    op.create_table(
        "website_conversations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("visitor_id", sa.Integer(), nullable=False),
        sa.Column("ticket_id", sa.Integer(), nullable=True),
        sa.Column("assigned_user", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["visitor_id"], ["website_visitors.id"]),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"]),
        sa.ForeignKeyConstraint(["assigned_user"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_website_conversations_visitor_id"),
        "website_conversations",
        ["visitor_id"],
    )
    op.create_index(
        op.f("ix_website_conversations_ticket_id"),
        "website_conversations",
        ["ticket_id"],
    )
    op.create_index(
        op.f("ix_website_conversations_assigned_user"),
        "website_conversations",
        ["assigned_user"],
    )

    op.create_table(
        "website_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("sender", sa.String(length=50), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("attachments", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["website_conversations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_website_messages_conversation_id"),
        "website_messages",
        ["conversation_id"],
    )

    op.create_table(
        "widget_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("logo_url", sa.String(length=500), nullable=False),
        sa.Column("primary_color", sa.String(length=20), nullable=False),
        sa.Column("welcome_message", sa.Text(), nullable=False),
        sa.Column("agent_avatar_url", sa.String(length=500), nullable=False),
        sa.Column("business_hours", sa.JSON(), nullable=False),
        sa.Column("position", sa.String(length=20), nullable=False),
        sa.Column("language", sa.String(length=20), nullable=False),
        sa.Column("icon_url", sa.String(length=500), nullable=False),
        sa.Column("theme", sa.String(length=20), nullable=False),
        sa.Column("api_token", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_widget_configs_company_id"), "widget_configs", ["company_id"]
    )
    op.create_index(
        op.f("ix_widget_configs_api_token"), "widget_configs", ["api_token"]
    )


def downgrade() -> None:
    op.drop_table("widget_configs")
    op.drop_table("website_messages")
    op.drop_table("website_conversations")
    op.drop_table("website_visitors")
    op.drop_table("email_messages")
    op.drop_table("email_conversations")
    op.drop_table("email_accounts")
