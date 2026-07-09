from fastapi import APIRouter, BackgroundTasks, Request
from httpx import AsyncClient

from core.config import settings
from core.database import SessionLocal
from models.models import Client, Conversation
from schemas.schemas import WebhookPayload
from services import whatsapp

router = APIRouter(tags=["webhook"])


async def _send_whatsapp(to: str, text: str) -> None:
    try:
        async with AsyncClient(base_url=settings.gateway_url, timeout=15) as http:
            await http.post("/send", json={"to": to, "text": text})
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


async def _process(payload: WebhookPayload) -> None:
    db = SessionLocal()
    try:
        client = _get_or_create_client(db, payload.from_)
        _save(db, client.id, payload.text, type_=payload.type)

        reply, action = whatsapp.process_menu(payload.from_, payload.text, client, db)

        if action and action.get("ai"):
            reply = "🤖 (IA em breve) — digite 0 para o menu."

        if reply is None:
            reply = whatsapp.get_menu_text("inicio", client.dados)

        _save(db, client.id, "", reply, "resposta")
        await _send_whatsapp(payload.from_, reply)
    finally:
        db.close()


@router.post("/webhook")
async def webhook(request: Request, payload: WebhookPayload, background: BackgroundTasks):
    background.add_task(_process, payload)
    return {"ok": True, "queued": True}
