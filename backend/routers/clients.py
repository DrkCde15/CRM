from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import Client, Conversation, User
from schemas.schemas import ClientOut, ConversationOut

router = APIRouter(prefix="/clients", tags=["clients"])


class ClientNameUpdate(BaseModel):
    name: str


@router.get("", response_model=list[ClientOut])
def list_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Client).order_by(Client.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}/name", response_model=ClientOut)
def update_name(client_id: int, body: ClientNameUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.name = body.name
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}/conversations", response_model=list[ConversationOut])
def client_conversations(client_id: int, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return (
        db.query(Conversation)
        .filter_by(client_id=client_id)
        .order_by(Conversation.created_at.asc())
        .limit(limit)
        .all()
    )
