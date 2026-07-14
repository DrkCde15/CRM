from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import (
    Conversation,
    EmailAccount,
    EmailConversation,
    User,
    WebsiteConversation,
)
from schemas.schemas import InboxItem

router = APIRouter(prefix="/inbox", tags=["inbox"])


def _whatsapp_items(db: Session) -> list[InboxItem]:
    items: list[InboxItem] = []
    for c in db.query(Conversation).all():
        last = c.response or c.message
        items.append(
            InboxItem(
                channel="whatsapp",
                conversation_id=c.id,
                subject=c.message[:80] if c.message else "(conversa)",
                last_message=last[:120] if last else "",
                last_at=c.created_at,
                status="open",
                client_id=c.client_id,
            )
        )
    return items


def _email_items(db: Session) -> list[InboxItem]:
    items: list[InboxItem] = []
    for c in db.query(EmailConversation).all():
        last = c.messages[-1] if c.messages else None
        items.append(
            InboxItem(
                channel="email",
                conversation_id=c.id,
                subject=c.subject or "(sem assunto)",
                last_message=(last.body_text or "")[-120:] if last else "",
                last_at=last.created_at if last else c.created_at,
                status="open",
                ticket_id=c.ticket_id,
                client_id=c.client_id,
            )
        )
    return items


def _website_items(db: Session) -> list[InboxItem]:
    items: list[InboxItem] = []
    for c in db.query(WebsiteConversation).all():
        last = c.messages[-1] if c.messages else None
        items.append(
            InboxItem(
                channel="website",
                conversation_id=c.id,
                subject=f"Chat #{c.id}",
                last_message=(last.message or "")[-120:] if last else "",
                last_at=last.created_at if last else c.started_at,
                status=c.status,
                ticket_id=c.ticket_id,
                client_id=None,
            )
        )
    return items


@router.get("", response_model=list[InboxItem])
def unified_inbox(
    channel: str | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sources = {
        "whatsapp": _whatsapp_items,
        "email": _email_items,
        "website": _website_items,
    }
    items: list[InboxItem] = []
    for name, fn in sources.items():
        if channel and channel != name:
            continue
        items.extend(fn(db))
    items.sort(key=lambda i: i.last_at or 0, reverse=True)
    return items


@router.get("/channels")
def configured_channels(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return {
        "whatsapp": {"enabled": True, "via": "gateway"},
        "email": {
            "enabled": db.query(EmailAccount).filter_by(active=True).count() > 0,
            "accounts": db.query(EmailAccount).count(),
        },
        "website": {"enabled": True, "via": "widget"},
    }
