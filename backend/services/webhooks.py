import json
import logging

import httpx
from sqlalchemy.orm import Session

from core.database import SessionLocal
from models.models import Webhook

logger = logging.getLogger("mochi.webhooks")

EVENT_TICKET_CREATED = "ticket.created"
EVENT_TICKET_UPDATED = "ticket.updated"
EVENT_TICKET_CLOSED = "ticket.closed"
EVENT_MESSAGE_RECEIVED = "message.received"
EVENT_CLIENT_CREATED = "client.created"


def emit(event: str, company_id: int, data: dict) -> None:
    db = SessionLocal()
    try:
        hooks = (
            db.query(Webhook)
            .filter(
                Webhook.company_id == company_id,
                Webhook.active.is_(True),
                Webhook.events.contains(event),
            )
            .all()
        )
        if not hooks:
            return

        payload = {
            "event": event,
            "tenant_id": company_id,
            "timestamp": __import__("datetime").datetime.now().isoformat(),
            "data": data,
        }

        for hook in hooks:
            _send(hook.url, payload)
    finally:
        db.close()


def _send(url: str, payload: dict) -> None:
    try:
        import asyncio
        asyncio.create_task(_post(url, payload))
    except Exception as e:
        logger.warning("Falha ao disparar webhook %s: %s", url, e)


async def _post(url: str, payload: dict) -> None:
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.post(url, json=payload, headers={"Content-Type": "application/json"})
            if resp.status_code >= 400:
                logger.warning("Webhook %s retornou %s", url, resp.status_code)
    except Exception as e:
        logger.warning("Webhook %s falhou: %s", url, e)
