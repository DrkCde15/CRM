import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import Client, Ticket, User
from schemas.schemas import TicketCreate, TicketOut
from services import taky

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
        task_id = asyncio.run(
            taky.create_taky_task(ticket.titulo, ticket.descricao, phone)
        )
        if task_id:
            ticket.taky_task_id = task_id
            ticket.status = "enviado_taky"
            db.commit()
    finally:
        db.close()


@router.get("", response_model=list[TicketOut])
def list_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Ticket).order_by(Ticket.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("", response_model=TicketOut)
def create_ticket(body: TicketCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ticket = Ticket(titulo=body.titulo, descricao=body.descricao, tipo=body.tipo)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.put("/{ticket_id}/status", response_model=TicketOut)
def update_status(ticket_id: int, body: TicketStatusUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = body.status
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/push")
def push_ticket(ticket_id: int, background: BackgroundTasks, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.taky_task_id:
        return {"ok": True, "already_pushed": True}
    background.add_task(_push_to_taky, ticket_id)
    return {"ok": True, "queued": True}
