from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="agent")
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), default="Empresa")
    sso_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sso_client_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sso_client_secret: Mapped[str | None] = mapped_column(Text, nullable=True)
    sso_issuer: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sso_metadata_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text, default="")
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    phone: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    estado: Mapped[str] = mapped_column(String(50), default="inicio")
    dados: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    @property
    def tipo(self) -> str | None:
        return (self.dados or {}).get("tipo")

    conversations: Mapped[list["Conversation"]] = relationship(back_populates="client")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="client")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="client")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    response: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String(50), default="texto")
    read: Mapped[bool] = mapped_column(Boolean, default=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))

    client: Mapped["Client"] = relationship(back_populates="conversations")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    servico: Mapped[str] = mapped_column(String(255), default="")
    data_hora: Mapped[datetime] = mapped_column(DateTime)
    observacao: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(50), default="pendente")
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))

    client: Mapped["Client"] = relationship(back_populates="appointments")


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id"), nullable=True, index=True
    )
    titulo: Mapped[str] = mapped_column(String(500))
    descricao: Mapped[str] = mapped_column(Text, default="")
    tipo: Mapped[str] = mapped_column(String(50), default="chamado")
    status: Mapped[str] = mapped_column(String(50), default="aberto")
    taky_task_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resumo: Mapped[str | None] = mapped_column(Text, nullable=True)
    sla_breached: Mapped[bool] = mapped_column(Boolean, default=False)
    categoria: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    prioridade: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    sentimento: Mapped[str | None] = mapped_column(String(50), nullable=True)
    classified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))

    client: Mapped["Client"] = relationship(back_populates="tickets")


class Webhook(Base):
    __tablename__ = "webhooks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    url: Mapped[str] = mapped_column(String(500))
    events: Mapped[str] = mapped_column(Text, default="")  # comma-separated list
    secret: Mapped[str] = mapped_column(String(64), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class ScheduledJob(Base):
    __tablename__ = "scheduled_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    task_type: Mapped[str] = mapped_column(String(100))  # sla_check, appointment_reminder, cleanup, webhook_retry
    interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    event: Mapped[str] = mapped_column(String(100))  # e.g. ticket.created, message.received
    conditions: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    actions: Mapped[dict] = mapped_column(JSON)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class SLARule(Base):
    __tablename__ = "sla_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    priority: Mapped[str] = mapped_column(String(50), default="media")  # baixa, media, alta
    max_response_hours: Mapped[float] = mapped_column(default=24.0)
    max_resolution_hours: Mapped[float] = mapped_column(default=72.0)
    escalate_after_hours: Mapped[float] = mapped_column(default=0)  # 0 = disabled
    escalate_action: Mapped[str] = mapped_column(String(50), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class Config(Base):
    __tablename__ = "config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")
    encrypted: Mapped[bool] = mapped_column(Boolean, default=False)


class EmailAccount(Base):
    __tablename__ = "email_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    provider: Mapped[str] = mapped_column(String(50), default="imap")
    email: Mapped[str] = mapped_column(String(255), index=True)
    display_name: Mapped[str] = mapped_column(String(255), default="")
    smtp_host: Mapped[str] = mapped_column(String(255), default="")
    smtp_port: Mapped[int] = mapped_column(Integer, default=587)
    imap_host: Mapped[str] = mapped_column(String(255), default="")
    imap_port: Mapped[int] = mapped_column(Integer, default=993)
    username: Mapped[str] = mapped_column(String(255), default="")
    encrypted_password: Mapped[str] = mapped_column(Text, default="")
    google_script_url: Mapped[str] = mapped_column(String(500), default="")
    encrypted_script_secret: Mapped[str] = mapped_column(Text, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )

    conversations: Mapped[list["EmailConversation"]] = relationship(
        back_populates="account"
    )


class EmailConversation(Base):
    __tablename__ = "email_conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id"), nullable=True, index=True
    )
    ticket_id: Mapped[int | None] = mapped_column(
        ForeignKey("tickets.id"), nullable=True, index=True
    )
    subject: Mapped[str] = mapped_column(String(500), default="")
    thread_id: Mapped[str] = mapped_column(String(255), default="", index=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("email_accounts.id"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )

    account: Mapped["EmailAccount"] = relationship(back_populates="conversations")
    messages: Mapped[list["EmailMessage"]] = relationship(
        back_populates="conversation",
        order_by="EmailMessage.created_at.asc()",
    )


class EmailMessage(Base):
    __tablename__ = "email_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("email_conversations.id"), index=True
    )
    sender: Mapped[str] = mapped_column(String(500), default="")
    recipient: Mapped[str] = mapped_column(String(500), default="")
    cc: Mapped[str] = mapped_column(Text, default="")
    bcc: Mapped[str] = mapped_column(Text, default="")
    body_html: Mapped[str] = mapped_column(Text, default="")
    body_text: Mapped[str] = mapped_column(Text, default="")
    attachments: Mapped[list] = mapped_column(JSON, default=list)
    message_id: Mapped[str] = mapped_column(String(500), default="", index=True)
    in_reply_to: Mapped[str] = mapped_column(String(500), default="")
    direction: Mapped[str] = mapped_column(String(20), default="inbound")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )

    conversation: Mapped["EmailConversation"] = relationship(back_populates="messages")


class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    server_url: Mapped[str] = mapped_column(String(500), default="")
    workflow_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    n8n_base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    n8n_api_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    env_vars: Mapped[dict] = mapped_column(JSON, default=dict)
    type: Mapped[str] = mapped_column(String(50), default="custom")
    status: Mapped[str] = mapped_column(String(50), default="stopped")  # running, stopped, error
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class CannedResponse(Base):
    __tablename__ = "canned_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    kind: Mapped[str] = mapped_column(String(20), default="quick_reply", index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    title: Mapped[str] = mapped_column(String(255), default="Nova conversa")
    agent: Mapped[str] = mapped_column(String(100), default="assistente")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    messages: Mapped[list["AIMessage"]] = relationship(back_populates="conversation", order_by="AIMessage.created_at", cascade="all, delete-orphan")


class AIMessage(Base):
    __tablename__ = "ai_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("ai_conversations.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))

    conversation: Mapped["AIConversation"] = relationship(back_populates="messages")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), index=True)  # ex.: ticket.classify, plugin.toggle, login
    entity: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    level: Mapped[str] = mapped_column(String(20), default="info", index=True)  # info | warning | error
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), index=True)


class Plugin(Base):
    __tablename__ = "plugins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    key: Mapped[str] = mapped_column(String(100), index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(100), default="geral")
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    __table_args__ = (UniqueConstraint("company_id", "key", name="uq_plugin_company_key"),)


