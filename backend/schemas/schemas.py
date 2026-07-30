from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field

T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    total: int
    skip: int
    limit: int


class UserCreate(BaseModel):
    email: EmailStr
    name: str = ""
    password: str
    role: str = "agent"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    name: str
    role: str
    company_id: int
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    body: str
    link: str | None
    read: bool
    created_at: datetime


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phone: str
    name: str
    estado: str
    tipo: str | None = None
    created_at: datetime


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    message: str
    response: str
    type: str
    created_at: datetime


class AppointmentCreate(BaseModel):
    name: str = ""
    servico: str = ""
    data_hora: datetime
    observacao: str = ""


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    name: str
    servico: str
    data_hora: datetime
    observacao: str
    status: str
    created_at: datetime


class TicketCreate(BaseModel):
    titulo: str
    descricao: str = ""
    tipo: str = "chamado"
    client_id: int | None = None


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int | None
    titulo: str
    descricao: str
    tipo: str
    status: str
    taky_task_id: int | None
    resumo: str | None = None
    created_at: datetime


class WebhookPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    from_: str = Field(alias="from")
    text: str = ""
    type: str = "text"
    image: str | None = None
    audio: str | None = None
    mimetype: str | None = None
    tenant_id: int | None = None


# ───────────────────────────── Email channel ─────────────────────────────


class EmailAccountCreate(BaseModel):
    company_id: int = 1
    provider: str = "imap"
    email: str
    display_name: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    imap_host: str = ""
    imap_port: int = 993
    username: str = ""
    password: str = ""
    google_script_url: str = ""
    google_script_secret: str = ""
    active: bool = True


class EmailAccountUpdate(BaseModel):
    display_name: str | None = None
    smtp_host: str | None = None
    smtp_port: int | None = None
    imap_host: str | None = None
    imap_port: int | None = None
    username: str | None = None
    password: str | None = None
    google_script_url: str | None = None
    google_script_secret: str | None = None
    active: bool | None = None


class EmailAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    provider: str
    email: str
    display_name: str
    smtp_host: str
    smtp_port: int
    imap_host: str
    imap_port: int
    username: str
    google_script_url: str
    active: bool
    created_at: datetime


class EmailMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    conversation_id: int
    sender: str
    recipient: str
    cc: str
    bcc: str
    body_html: str
    body_text: str
    attachments: list
    message_id: str
    in_reply_to: str
    direction: str
    created_at: datetime


class EmailConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int | None
    ticket_id: int | None
    subject: str
    thread_id: str
    account_id: int
    created_at: datetime
    messages: list[EmailMessageOut] = []


class EmailSend(BaseModel):
    conversation_id: int | None = None
    account_id: int | None = None
    to: str
    subject: str = ""
    body_html: str = ""
    body_text: str = ""
    cc: str = ""
    bcc: str = ""
    in_reply_to: str = ""


class CannedResponseCreate(BaseModel):
    kind: str = "quick_reply"  # quick_reply | macro
    title: str
    content: str


class CannedResponseUpdate(BaseModel):
    kind: str | None = None
    title: str | None = None
    content: str | None = None


class CannedResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    kind: str
    title: str
    content: str
    created_at: datetime


# ───────────────────────────── Unified inbox ─────────────────────────────


class InboxItem(BaseModel):
    channel: str
    conversation_id: int
    subject: str
    last_message: str
    last_at: datetime | None
    status: str
    client_id: int | None = None
    ticket_id: int | None = None
    client_tipo: str | None = None
    read: bool = True
    archived: bool = False


class ConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    value: str
    encrypted: bool


class ConfigUpdate(BaseModel):
    value: str

