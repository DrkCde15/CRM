from fastapi import APIRouter, BackgroundTasks, Request
from httpx import AsyncClient

from core.config import settings
from core.database import SessionLocal
from models.models import Client, Conversation
from schemas.schemas import WebhookPayload
from services import llm, whatsapp

router = APIRouter(tags=["webhook"])


async def _send_whatsapp(to: str, text: str) -> None:
    try:
        async with AsyncClient(base_url=settings.gateway_url, timeout=15) as http:
            await http.post("/send", json={"to": to, "text": text})
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
            await http.post("/send-buttons", json=payload)
    except Exception:
        pass


def _get_or_create_client(db, phone: str) -> Client:
    client = db.query(Client).filter_by(phone=phone).first()
    if not client:
        client = Client(phone=phone, estado="inicio", dados={})
        db.add(client)
        db.commit()
        db.refresh(client)
    return client


def _save(db, client_id: int, message: str, response: str = "", type_: str = "texto") -> None:
    db.add(Conversation(client_id=client_id, message=message, response=response, type=type_))
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
        client = _get_or_create_client(db, payload.from_)
        history = _build_history(db, client.id)
        _save(db, client.id, payload.text, type_=payload.type)

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
async def webhook(request: Request, payload: WebhookPayload, background: BackgroundTasks):
    background.add_task(_process, payload)
    return {"ok": True, "queued": True}
