import asyncio
import hashlib
import hmac
import json
import logging
import threading
import time

import httpx

from core.database import SessionLocal
from models.models import Webhook

logger = logging.getLogger("mochi.webhooks")

EVENT_TICKET_CREATED = "ticket.created"
EVENT_TICKET_UPDATED = "ticket.updated"
EVENT_TICKET_CLOSED = "ticket.closed"
EVENT_MESSAGE_RECEIVED = "message.received"
EVENT_CLIENT_CREATED = "client.created"


def _sign_payload(payload: dict, secret: str) -> str:
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()


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
            _dispatch(hook.url, payload, hook.secret or "")
    finally:
        db.close()


def _dispatch(url: str, payload: dict, secret: str) -> None:
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_deliver(url, payload, secret))
            return
    except RuntimeError:
        pass
    threading.Thread(target=_deliver_sync, args=(url, payload, secret), daemon=True).start()


def _make_headers(payload: dict, secret: str) -> dict:
    headers = {"Content-Type": "application/json"}
    if secret:
        signature = _sign_payload(payload, secret)
        headers["X-Webhook-Signature"] = signature
    return headers


async def _deliver(url: str, payload: dict, secret: str, max_retries: int = 3) -> None:
    headers = _make_headers(payload, secret)
    for attempt in range(1, max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                resp = await http.post(url, json=payload, headers=headers)
                if resp.status_code < 400:
                    logger.info("Webhook %s entregue (status %s)", url, resp.status_code)
                    return
                logger.warning(
                    "Webhook %s retornou %s (tentativa %d/%d)",
                    url, resp.status_code, attempt, max_retries,
                )
        except Exception as e:
            logger.warning(
                "Webhook %s falhou (tentativa %d/%d): %s",
                url, attempt, max_retries, e,
            )
        if attempt < max_retries:
            await asyncio.sleep(2 ** attempt)
    logger.error("Webhook %s falhou após %d tentativas", url, max_retries)


def _deliver_sync(url: str, payload: dict, secret: str, max_retries: int = 3) -> None:
    headers = _make_headers(payload, secret)
    for attempt in range(1, max_retries + 1):
        try:
            with httpx.Client(timeout=10) as http:
                resp = http.post(url, json=payload, headers=headers)
                if resp.status_code < 400:
                    logger.info("Webhook %s entregue (status %s)", url, resp.status_code)
                    return
                logger.warning(
                    "Webhook %s retornou %s (tentativa %d/%d)",
                    url, resp.status_code, attempt, max_retries,
                )
        except Exception as e:
            logger.warning(
                "Webhook %s falhou (tentativa %d/%d): %s",
                url, attempt, max_retries, e,
            )
        if attempt < max_retries:
            time.sleep(2 ** attempt)
    logger.error("Webhook %s falhou após %d tentativas", url, max_retries)
