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
    created_at: datetime


class WebhookPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    from_: str = Field(alias="from")
    text: str = ""
    type: str = "text"
    image: str | None = None
    audio: str | None = None
    mimetype: str | None = None
