from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import Appointment, Client, Conversation, Ticket, User

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
def stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    total_clients = db.query(Client).count()
    total_conversations = db.query(Conversation).count()
    total_tickets = db.query(Ticket).count()
    total_appointments = db.query(Appointment).count()

    conversations_today = (
        db.query(Conversation)
        .filter(
            Conversation.created_at >= today_start,
            Conversation.created_at < today_end,
        )
        .count()
    )

    tickets_by_status = {}
    for row in db.query(Ticket.status, Ticket.id).all():
        tickets_by_status[row.status] = tickets_by_status.get(row.status, 0) + 1

    tickets_today = (
        db.query(Ticket)
        .filter(
            Ticket.created_at >= today_start,
            Ticket.created_at < today_end,
        )
        .count()
    )

    return {
        "total_clients": total_clients,
        "total_conversations": total_conversations,
        "total_tickets": total_tickets,
        "total_appointments": total_appointments,
        "conversations_today": conversations_today,
        "tickets_today": tickets_today,
        "tickets_by_status": tickets_by_status,
    }
