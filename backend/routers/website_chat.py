import os
from collections import defaultdict
from time import time

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.deps import get_current_user, optional_current_user
from models.models import (
    User,
    WebsiteConversation,
    WebsiteMessage,
    WebsiteVisitor,
    WidgetConfig,
)
from schemas.schemas import (
    ChatAssign,
    ChatConnect,
    ChatSend,
    WebsiteConversationOut,
    WebsiteMessageOut,
    WidgetConfigCreate,
    WidgetConfigOut,
    WidgetConfigUpdate,
    WidgetEmailIn,
    WidgetLeadIn,
)
from services.email import render_html, send_email
from services import chat

router = APIRouter(tags=["website-chat"])

_ALLOWED_EXT = {
    "pdf", "docx", "xlsx", "zip", "png", "jpeg", "jpg", "webp", "mp4",
}
_RATE: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 30
_RATE_WINDOW = 60


def _throttle(key: str) -> None:
    now = time()
    hits = _RATE[key]
    hits[:] = [t for t in hits if now - t < _RATE_WINDOW]
    if len(hits) >= _RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Muitas requisições. Tente mais tarde.")
    hits.append(now)


def _get_widget(token: str, db: Session) -> WidgetConfig:
    cfg = db.query(WidgetConfig).filter_by(api_token=token).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Widget não encontrado")
    return cfg


def _create_widget_lead(
    db: Session,
    cfg: WidgetConfig,
    *,
    name: str = "",
    email: str = "",
    phone: str = "",
    message: str = "",
    kind: str = "website",
) -> WebsiteConversation:
    from secrets import token_urlsafe

    visitor = WebsiteVisitor(
        session_id=f"widget-{kind}-{token_urlsafe(8)}",
        name=name,
        email=email,
        phone=phone,
    )
    db.add(visitor)
    db.commit()
    db.refresh(visitor)

    conv = WebsiteConversation(visitor_id=visitor.id, status="open")
    db.add(conv)
    db.commit()
    db.refresh(conv)

    if kind == "whatsapp":
        label = "📱 Cliente iniciou atendimento pelo WhatsApp"
        if cfg.whatsapp_number:
            label += f" ({cfg.whatsapp_number})"
        body = f"{label}\n{message}".strip()
    elif kind == "email":
        label = "✉️ Contato recebido pelo formulário de e-mail do site"
        meta = []
        if name:
            meta.append(f"Nome: {name}")
        if email:
            meta.append(f"E-mail: {email}")
        body = f"{label}\n" + ("\n".join(meta) + "\n" if meta else "") + message
    else:
        body = message

    chat.add_message(db, conv.id, "visitor", body.strip())
    return conv


# ───────────────────────────── Widget config (admin) ─────────────────────────


@router.get("/widget/config", response_model=WidgetConfigOut)
def public_widget_config(token: str = Query(...), db: Session = Depends(get_db)):
    return _get_widget(token, db)


@router.post("/widget/config", response_model=WidgetConfigOut)
def create_widget_config(
    body: WidgetConfigCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    if _.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    from secrets import token_urlsafe

    cfg = WidgetConfig(**body.model_dump(), api_token=token_urlsafe(24))
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.put("/widget/config/{config_id}", response_model=WidgetConfigOut)
def update_widget_config(
    config_id: int,
    body: WidgetConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if _.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    cfg = db.get(WidgetConfig, config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="Config não encontrada")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cfg, field, value)
    db.commit()
    db.refresh(cfg)
    return cfg


# ───────────────────────────── Chat (visitor + agent) ─────────────────────────

@router.post("/widget/email")
async def widget_email(
    body: WidgetEmailIn,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    _throttle(f"widget-email:{token}")
    cfg = _get_widget(token, db)
    dest = cfg.contact_email
    if not dest:
        raise HTTPException(status_code=400, detail="E-mail de contato não configurado")
    html = render_html(
        body.subject,
        f"<p><b>De:</b> {body.name} ({body.email})</p><p>{body.message}</p>",
    )
    await send_email(dest, body.subject, html)
    conv = _create_widget_lead(
        db,
        cfg,
        name=body.name,
        email=body.email,
        message=body.message,
        kind="email",
    )
    return {"ok": True, "conversation_id": conv.id}


@router.post("/widget/lead")
def widget_lead(
    body: WidgetLeadIn,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    _throttle(f"widget-lead:{token}")
    cfg = _get_widget(token, db)
    conv = _create_widget_lead(
        db,
        cfg,
        name=body.name,
        email=body.email,
        phone=body.phone,
        message=body.message,
        kind=body.channel or "whatsapp",
    )
    return {"ok": True, "conversation_id": conv.id}



@router.post("/chat/connect", response_model=WebsiteConversationOut)
def chat_connect(body: ChatConnect, db: Session = Depends(get_db)):
    _throttle(f"connect:{body.session_id}")
    visitor = chat.upsert_visitor(db, body.model_dump())
    conv = chat.get_or_create_conversation(db, visitor.id)
    return conv


@router.get("/chat/conversations", response_model=list[WebsiteConversationOut])
def list_chat_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(WebsiteConversation)
    if status:
        q = q.filter_by(status=status)
    return q.order_by(WebsiteConversation.started_at.desc()).offset(skip).limit(limit).all()


@router.get("/chat/history/{conversation_id}", response_model=list[WebsiteMessageOut])
def chat_history(
    conversation_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    return (
        db.query(WebsiteMessage)
        .filter_by(conversation_id=conversation_id)
        .order_by(WebsiteMessage.created_at.asc())
        .all()
    )


@router.post("/chat/send")
async def chat_send(
    body: ChatSend,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_current_user),
):
    conv = db.get(WebsiteConversation, body.conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    _throttle(f"send:{body.conversation_id}")

    sender = "agent" if user else "visitor"
    msg = chat.add_message(db, body.conversation_id, sender, body.message, body.attachments)
    if user:
        chat.ensure_ticket(db, body.conversation_id)
    await chat.manager.send_to_conversation(
        body.conversation_id,
        {
            "type": "message",
            "id": msg.id,
            "sender": sender,
            "message": msg.message,
            "attachments": msg.attachments,
            "created_at": msg.created_at.isoformat(),
        },
    )
    return {"ok": True, "id": msg.id}


@router.post("/chat/typing")
async def chat_typing(body: ChatSend, db: Session = Depends(get_db)):
    await chat.manager.send_to_conversation(
        body.conversation_id,
        {"type": "typing", "sender": "visitor"},
    )
    return {"ok": True}


@router.post("/chat/read")
async def chat_read(conversation_id: int, db: Session = Depends(get_db)):
    await chat.manager.send_to_conversation(
        conversation_id, {"type": "read", "conversation_id": conversation_id}
    )
    return {"ok": True}


@router.post("/chat/{conversation_id}/assign", response_model=WebsiteConversationOut)
def chat_assign(
    conversation_id: int,
    body: ChatAssign,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        return chat.assign_conversation(db, conversation_id, body.assigned_user)
    except LookupError as err:
        raise HTTPException(status_code=404, detail="Conversa não encontrada") from err


@router.post("/chat/{conversation_id}/close", response_model=WebsiteConversationOut)
def chat_close(
    conversation_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    try:
        return chat.close_conversation(db, conversation_id)
    except LookupError as err:
        raise HTTPException(status_code=404, detail="Conversa não encontrada") from err


@router.post("/chat/upload")
async def chat_upload(
    conversation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in _ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido")
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite")
    rel = os.path.join(
        settings.upload_dir, "chat", str(conversation_id), os.path.basename(file.filename or "file")
    )
    os.makedirs(os.path.dirname(rel), exist_ok=True)
    with open(rel, "wb") as fh:
        fh.write(data)
    return {
        "filename": os.path.basename(file.filename or "file"),
        "content_type": file.content_type,
        "size": len(data),
        "path": rel,
    }


@router.websocket("/chat/ws")
async def chat_ws(websocket: WebSocket, conversation_id: int = Query(...)):
    await chat.manager.connect(conversation_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        chat.manager.disconnect(conversation_id, websocket)
