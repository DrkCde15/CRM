from fastapi import APIRouter, Depends, HTTPException, Query
from httpx import AsyncClient
from sqlalchemy.orm import Session

from core.config import settings
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


def _client_tipo(client) -> str | None:
    return (client.dados or {}).get("tipo") if client else None


def _whatsapp_items(db: Session, current_user: User, include_archived: bool) -> list[InboxItem]:
    items: list[InboxItem] = []
    q = db.query(Conversation).filter_by(company_id=current_user.company_id)
    if not include_archived:
        q = q.filter_by(archived=False)
    for c in q.all():
        last = c.response or c.message
        items.append(
            InboxItem(
                channel="whatsapp",
                conversation_id=c.id,
                subject=c.message[:80] if c.message else "(conversa)",
                last_message=last[:120] if last else "",
                last_at=c.created_at,
                status="open" if c.read else "unread",
                client_id=c.client_id,
                client_tipo=_client_tipo(c.client),
                read=c.read,
                archived=c.archived,
            )
        )
    return items


def _email_items(db: Session, current_user: User) -> list[InboxItem]:
    items: list[InboxItem] = []
    for c in db.query(EmailConversation).filter_by(company_id=current_user.company_id).all():
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


def _website_items(db: Session, current_user: User) -> list[InboxItem]:
    items: list[InboxItem] = []
    for c in db.query(WebsiteConversation).filter_by(company_id=current_user.company_id).all():
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
    include_archived: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sources = {
        "whatsapp": lambda: _whatsapp_items(db, current_user, include_archived),
        "email": lambda: _email_items(db, current_user),
        "website": lambda: _website_items(db, current_user),
    }
    items: list[InboxItem] = []
    for name, fn in sources.items():
        if channel and channel != name:
            continue
        items.extend(fn())
    items.sort(key=lambda i: i.last_at or 0, reverse=True)
    return items


@router.patch("/whatsapp/{conversation_id}/read")
def mark_read(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Conversation).filter_by(id=conversation_id, company_id=current_user.company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conversation not found")
    c.read = True
    db.commit()
    return {"ok": True, "read": True}


@router.patch("/whatsapp/{conversation_id}/archive")
def archive(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Conversation).filter_by(id=conversation_id, company_id=current_user.company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conversation not found")
    c.archived = True
    db.commit()
    return {"ok": True, "archived": True}


@router.patch("/whatsapp/{conversation_id}/unarchive")
def unarchive(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Conversation).filter_by(id=conversation_id, company_id=current_user.company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conversation not found")
    c.archived = False
    db.commit()
    return {"ok": True, "archived": False}


@router.get("/channels")
def configured_channels(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {
        "whatsapp": {"enabled": True, "via": "gateway"},
        "email": {
            "enabled": db.query(EmailAccount).filter_by(company_id=current_user.company_id, active=True).count() > 0,
            "accounts": db.query(EmailAccount).filter_by(company_id=current_user.company_id).count(),
        },
        "website": {"enabled": True, "via": "widget"},
    }


@router.get("/gateway-status")
async def gateway_status():
    try:
        async with AsyncClient(base_url=settings.gateway_url, timeout=3) as http:
            r = await http.get("/health")
            data = r.json()
            connected = bool(data.get("connected"))
            return {"connected": connected, "detail": "ok" if connected else "WhatsApp desconectado"}
    except Exception:
        return {"connected": False, "detail": "Gateway indisponível"}
