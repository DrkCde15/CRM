import json
from datetime import UTC, datetime

from fastapi import WebSocket
from sqlalchemy.orm import Session

from models.models import (
    Ticket,
    WebsiteConversation,
    WebsiteMessage,
    WebsiteVisitor,
)


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[int, set[WebSocket]] = {}

    async def connect(self, conversation_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._rooms.setdefault(conversation_id, set()).add(ws)

    def disconnect(self, conversation_id: int, ws: WebSocket) -> None:
        room = self._rooms.get(conversation_id)
        if room and ws in room:
            room.discard(ws)
            if not room:
                self._rooms.pop(conversation_id, None)

    async def send_to_conversation(self, conversation_id: int, payload: dict) -> None:
        room = self._rooms.get(conversation_id)
        if not room:
            return
        dead: list[WebSocket] = []
        for ws in list(room):
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(conversation_id, ws)


manager = ConnectionManager()


def upsert_visitor(db: Session, data: dict) -> WebsiteVisitor:
    visitor = (
        db.query(WebsiteVisitor).filter_by(session_id=data["session_id"]).first()
    )
    if visitor:
        for field in ("name", "email", "phone", "ip", "user_agent", "country", "city"):
            if data.get(field):
                setattr(visitor, field, data[field])
        visitor.last_seen = datetime.now(UTC)
    else:
        visitor = WebsiteVisitor(**data)
        db.add(visitor)
    db.commit()
    db.refresh(visitor)
    return visitor


def get_or_create_conversation(
    db: Session, visitor_id: int, ticket_id: int | None = None
) -> WebsiteConversation:
    conv = (
        db.query(WebsiteConversation)
        .filter_by(visitor_id=visitor_id, status="open")
        .order_by(WebsiteConversation.started_at.desc())
        .first()
    )
    if conv:
        return conv
    conv = WebsiteConversation(visitor_id=visitor_id, ticket_id=ticket_id, status="open")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def add_message(
    db: Session, conversation_id: int, sender: str, message: str, attachments: list | None = None
) -> WebsiteMessage:
    msg = WebsiteMessage(
        conversation_id=conversation_id,
        sender=sender,
        message=message,
        attachments=attachments or [],
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def assign_conversation(db: Session, conversation_id: int, user_id: int | None) -> WebsiteConversation:
    conv = db.get(WebsiteConversation, conversation_id)
    if not conv:
        raise LookupError("conversation not found")
    conv.assigned_user = user_id
    db.commit()
    db.refresh(conv)
    return conv


def close_conversation(db: Session, conversation_id: int) -> WebsiteConversation:
    conv = db.get(WebsiteConversation, conversation_id)
    if not conv:
        raise LookupError("conversation not found")
    conv.status = "closed"
    conv.closed_at = datetime.now(UTC)
    db.commit()
    db.refresh(conv)
    return conv


def ensure_ticket(db: Session, conversation_id: int) -> int | None:
    conv = db.get(WebsiteConversation, conversation_id)
    if not conv:
        return None
    if conv.ticket_id:
        return conv.ticket_id
    visitor = db.get(WebsiteVisitor, conv.visitor_id)
    name = visitor.name or visitor.email or f"Visitante {visitor.session_id[-6:]}"
    ticket = Ticket(titulo=f"[Chat] {name}", descricao="", tipo="chat")
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    conv.ticket_id = ticket.id
    db.commit()
    return ticket.id
