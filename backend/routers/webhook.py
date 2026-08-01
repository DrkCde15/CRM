import secrets

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from httpx import AsyncClient

from core.config import settings
from core.database import SessionLocal
from models.models import Client, Conversation
from schemas.schemas import WebhookPayload
from services import llm, realtime, whatsapp
from services.webhooks import emit as webhook_emit, EVENT_MESSAGE_RECEIVED, EVENT_CLIENT_CREATED

router = APIRouter(prefix="/api", tags=["webhook"])

WEBHOOK_AUTH_HEADER = "X-Webhook-Secret"


def _require_webhook_secret(secret: str | None) -> None:
    if not settings.webhook_secret:
        raise HTTPException(
            status_code=503,
            detail="WEBHOOK_SECRET não configurada no backend.",
        )
    if not secret or not secrets.compare_digest(secret, settings.webhook_secret):
        raise HTTPException(status_code=401, detail="Webhook não autorizado")


def _gateway_headers() -> dict[str, str]:
    if not settings.gateway_api_key:
        raise HTTPException(
            status_code=503,
            detail="GATEWAY_API_KEY não configurada no backend.",
        )
    return {"X-API-Key": settings.gateway_api_key}


async def _send_whatsapp(to: str, text: str) -> None:
    try:
        async with AsyncClient(base_url=settings.gateway_url, timeout=15) as http:
            await http.post("/send", json={"to": to, "text": text}, headers=_gateway_headers())
    except Exception:
        pass


async def _send_buttons(to: str, text: str, buttons: list[tuple[str, str]]) -> None:
    try:
        payload = {
            "to": to,
            "text": text,
            "buttons": [{"label": label, "value": value} for value, label in buttons],
        }
        async with AsyncClient(base_url=settings.gateway_url, timeout=15) as http:
            await http.post("/send-buttons", json=payload, headers=_gateway_headers())
    except Exception:
        pass


def _get_or_create_client(db, phone: str, company_id: int | None = None) -> Client:
    client = db.query(Client).filter_by(phone=phone).first()
    if not client:
        client = Client(phone=phone, estado="inicio", dados={}, company_id=company_id or 1)
        db.add(client)
        db.commit()
        db.refresh(client)
        webhook_emit(EVENT_CLIENT_CREATED, client.company_id, {
            "client_id": client.id,
            "phone": client.phone,
        })
    return client


def _save(db, client_id: int, message: str, response: str = "", type_: str = "texto") -> None:
    db.add(
        Conversation(
            client_id=client_id,
            message=message,
            response=response,
            type=type_,
            read=not bool(message),
        )
    )
    db.commit()


def _build_history(db, client_id: int, limit: int = 10) -> list:
    rows = (
        db.query(Conversation)
        .filter_by(client_id=client_id)
        .order_by(Conversation.id.desc())
        .limit(limit)
        .all()
    )
    history: list = []
    for row in reversed(rows):
        if row.message:
            history.append(llm.ChatMessage(role="user", content=row.message))
        if row.response:
            history.append(llm.ChatMessage(role="assistant", content=row.response))
    return history


async def _process(payload: WebhookPayload) -> None:
    db = SessionLocal()
    try:
        client = _get_or_create_client(db, payload.from_, payload.tenant_id)
        history = _build_history(db, client.id)
        _save(db, client.id, payload.text, type_=payload.type)
        webhook_emit(EVENT_MESSAGE_RECEIVED, client.company_id, {
            "client_id": client.id,
            "phone": payload.from_,
            "text": payload.text,
            "type": payload.type,
        })
        realtime.refresh("inbox", client.company_id)
        realtime.refresh("stats", client.company_id)

        reply, action = whatsapp.process_menu(payload.from_, payload.text, client, db)

        if action and action.get("ai"):
            reply = await llm.generate_reply(payload.text, history)

        if reply is None:
            reply = whatsapp.get_menu_text("inicio", client.dados)

        buttons = whatsapp.get_menu_buttons(client.estado)
        if buttons:
            await _send_buttons(payload.from_, reply, buttons)
        else:
            await _send_whatsapp(payload.from_, reply)
        _save(db, client.id, "", reply, "resposta")
    finally:
        db.close()


@router.post("/webhook")
async def webhook(
    request: Request,
    payload: WebhookPayload,
    background: BackgroundTasks,
    x_webhook_secret: str | None = Header(None, alias=WEBHOOK_AUTH_HEADER),
):
    _require_webhook_secret(x_webhook_secret)
    background.add_task(_process, payload)
    return {"ok": True, "queued": True}
