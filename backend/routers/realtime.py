from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from core.database import SessionLocal
from core.security import decode_access_token
from models.models import User
from services import realtime

router = APIRouter(tags=["realtime"])


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket, token: str = Query("")):
    user_id = None
    if token:
        sub = decode_access_token(token)
        if sub and sub.isdigit():
            user_id = int(sub)
    if user_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        company_id = user.company_id
    finally:
        db.close()

    await realtime.connect(user_id, company_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        realtime.disconnect(user_id, websocket)
