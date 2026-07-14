from csv import writer as csv_writer
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
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
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Client).filter_by(company_id=current_user.company_id)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter((Client.name.ilike(like)) | (Client.phone.ilike(like)))
    total = q.count()
    items = q.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/export")
def export_clients(
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Client).filter_by(company_id=current_user.company_id)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter((Client.name.ilike(like)) | (Client.phone.ilike(like)))
    clients = q.order_by(Client.created_at.desc()).all()

    buf = StringIO()
    w = csv_writer(buf)
    w.writerow(["id", "nome", "telefone", "tipo", "estado", "criado_em"])
    for c in clients:
        w.writerow([
            c.id,
            c.name,
            c.phone,
            (c.dados or {}).get("tipo", ""),
            c.estado,
            c.created_at.isoformat() if c.created_at else "",
        ])
    return Response(content=buf.getvalue(), media_type="text/csv",
                   headers={"Content-Disposition": "attachment; filename=clientes.csv"})


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter_by(id=client_id, company_id=current_user.company_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}/name", response_model=ClientOut)
def update_name(
    client_id: int,
    body: ClientNameUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = db.query(Client).filter_by(id=client_id, company_id=current_user.company_id).first()
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
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Conversation)
        .filter_by(client_id=client_id, company_id=current_user.company_id)
        .order_by(Conversation.created_at.asc())
        .limit(limit)
        .all()
    )
