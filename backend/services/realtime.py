import asyncio
from dataclasses import dataclass

from fastapi import WebSocket


@dataclass
class _Conn:
    ws: WebSocket
    loop: asyncio.AbstractEventLoop


_connections: dict[int, list[_Conn]] = {}  # user_id -> conexões
_company: dict[int, int] = {}  # user_id -> company_id


async def connect(user_id: int, company_id: int, ws: WebSocket) -> None:
    await ws.accept()
    loop = asyncio.get_event_loop()
    _connections.setdefault(user_id, []).append(_Conn(ws, loop))
    _company[user_id] = company_id


def disconnect(user_id: int, ws: WebSocket) -> None:
    conns = _connections.get(user_id, [])
    for c in list(conns):
        if c.ws is ws:
            conns.remove(c)
    if not conns:
        _connections.pop(user_id, None)
        _company.pop(user_id, None)


async def _send(ws: WebSocket, event: dict) -> None:
    try:
        await ws.send_json(event)
    except Exception:
        pass


def emit_to_user(user_id: int, event: dict) -> None:
    for c in list(_connections.get(user_id, [])):
        asyncio.run_coroutine_threadsafe(_send(c.ws, event), c.loop)


def emit_to_company(company_id: int, event: dict) -> None:
    for uid, cid in list(_company.items()):
        if cid == company_id:
            emit_to_user(uid, event)


def refresh(resource: str, company_id: int) -> None:
    """Sinaliza os clientes de uma empresa para re-buscar um recurso."""
    emit_to_company(company_id, {"type": "refresh", "resource": resource})
