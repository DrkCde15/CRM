import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import Client, Ticket, User
from schemas.schemas import Paginated, TicketCreate, TicketOut
from services import email, notifications, taky

router = APIRouter(prefix="/tickets", tags=["tickets"])


class TicketStatusUpdate(BaseModel):
    status: str


def _push_to_taky(ticket_id: int) -> None:
    db = next(get_db())
    try:
        ticket = db.get(Ticket, ticket_id)
        if not ticket or ticket.taky_task_id:
            return
        client = db.get(Client, ticket.client_id)
        phone = client.phone if client else ""
        task_id = asyncio.run(taky.create_taky_task(ticket.titulo, ticket.descricao, phone))
        if task_id:
            ticket.taky_task_id = task_id
            ticket.status = "enviado_taky"
            db.commit()
    finally:
        db.close()


@router.get("", response_model=Paginated[TicketOut])
def list_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Ticket).filter_by(company_id=current_user.company_id)
    total = q.count()
    items = q.order_by(Ticket.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = db.query(Ticket).filter_by(id=ticket_id, company_id=current_user.company_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("", response_model=TicketOut)
def create_ticket(
    body: TicketCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = Ticket(
        titulo=body.titulo,
        descricao=body.descricao,
        tipo=body.tipo,
        client_id=body.client_id,
        company_id=current_user.company_id,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    body_html = (
        f"<b>#{ticket.id}</b> — {ticket.titulo}<br/>"
        f"Tipo: {ticket.tipo}<br/>"
        f"{ticket.descricao or 'Sem descrição'}"
    )
    background.add_task(
        email.notify_all_users,
        f"Novo chamado #{ticket.id}",
        "Novo chamado criado",
        body_html,
    )
    background.add_task(
        notifications.notify_all,
        f"Novo chamado #{ticket.id}",
        ticket.titulo,
        "/tickets",
    )
    return ticket


@router.put("/{ticket_id}/status", response_model=TicketOut)
def update_status(
    ticket_id: int,
    body: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter_by(id=ticket_id, company_id=current_user.company_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = body.status
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/push")
def push_ticket(
    ticket_id: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter_by(id=ticket_id, company_id=current_user.company_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.taky_task_id:
        return {"ok": True, "already_pushed": True}
    background.add_task(_push_to_taky, ticket_id)
    return {"ok": True, "queued": True}
