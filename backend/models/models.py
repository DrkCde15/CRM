from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
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
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    servico: Mapped[str] = mapped_column(String(255), default="")
    data_hora: Mapped[datetime] = mapped_column(DateTime)
    observacao: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(50), default="pendente")
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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))

    client: Mapped["Client"] = relationship(back_populates="tickets")


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


class WebsiteVisitor(Base):
    __tablename__ = "website_visitors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    session_id: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(50), default="")
    ip: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(Text, default="")
    country: Mapped[str] = mapped_column(String(120), default="")
    city: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    conversations: Mapped[list["WebsiteConversation"]] = relationship(
        back_populates="visitor"
    )


class WebsiteConversation(Base):
    __tablename__ = "website_conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    visitor_id: Mapped[int] = mapped_column(
        ForeignKey("website_visitors.id"), index=True
    )
    ticket_id: Mapped[int | None] = mapped_column(
        ForeignKey("tickets.id"), nullable=True, index=True
    )
    assigned_user: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(50), default="open")
    started_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    visitor: Mapped["WebsiteVisitor"] = relationship(back_populates="conversations")
    messages: Mapped[list["WebsiteMessage"]] = relationship(
        back_populates="conversation",
        order_by="WebsiteMessage.created_at.asc()",
    )


class WebsiteMessage(Base):
    __tablename__ = "website_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("website_conversations.id"), index=True
    )
    sender: Mapped[str] = mapped_column(String(50), default="visitor")
    message: Mapped[str] = mapped_column(Text, default="")
    attachments: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )

    conversation: Mapped["WebsiteConversation"] = relationship(back_populates="messages")


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


class WidgetConfig(Base):
    __tablename__ = "widget_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, default=1, index=True)
    name: Mapped[str] = mapped_column(String(255), default="Convexo")
    logo_url: Mapped[str] = mapped_column(String(500), default="")
    primary_color: Mapped[str] = mapped_column(String(20), default="#059669")
    welcome_message: Mapped[str] = mapped_column(
        Text, default="Olá! Como podemos ajudar?"
    )
    agent_avatar_url: Mapped[str] = mapped_column(String(500), default="")
    business_hours: Mapped[dict] = mapped_column(JSON, default=dict)
    position: Mapped[str] = mapped_column(String(20), default="right")
    language: Mapped[str] = mapped_column(String(20), default="pt-BR")
    icon_url: Mapped[str] = mapped_column(String(500), default="")
    theme: Mapped[str] = mapped_column(String(20), default="light")
    whatsapp_number: Mapped[str] = mapped_column(String(40), default="")
    contact_email: Mapped[str] = mapped_column(String(255), default="")
    api_token: Mapped[str] = mapped_column(String(255), default="", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
