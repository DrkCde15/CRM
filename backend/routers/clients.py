from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import Client, Conversation, User
from schemas.schemas import ClientOut, ConversationOut, Paginated

router = APIRouter(prefix="/clients", tags=["clients"])


class ClientNameUpdate(BaseModel):
    name: str


@router.get("", response_model=Paginated[ClientOut])
def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Client)
    total = q.count()
    items = q.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}/name", response_model=ClientOut)
def update_name(
    client_id: int,
    body: ClientNameUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.name = body.name
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}/conversations", response_model=list[ConversationOut])
def client_conversations(
    client_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Conversation)
        .filter_by(client_id=client_id)
        .order_by(Conversation.created_at.asc())
        .limit(limit)
        .all()
    )
