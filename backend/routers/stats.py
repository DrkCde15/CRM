from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import (
    Appointment,
    Client,
    Conversation,
    EmailConversation,
    EmailMessage,
    Ticket,
    User,
)

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("")
def stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company_id = current_user.company_id
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    total_clients = db.query(Client).filter_by(company_id=company_id).count()
    total_conversations = db.query(Conversation).filter_by(company_id=company_id).count()
    total_tickets = db.query(Ticket).filter_by(company_id=company_id).count()
    total_appointments = db.query(Appointment).filter_by(company_id=company_id).count()

    conversations_today = (
        db.query(Conversation)
        .filter(
            Conversation.company_id == company_id,
            Conversation.created_at >= today_start,
            Conversation.created_at < today_end,
        )
        .count()
    )

    tickets_by_status: dict[str, int] = {}
    tickets_per_channel: dict[str, int] = {}
    resolved_tickets_hours: list[float] = []
    resolved_today = 0

    for t in db.query(Ticket).filter_by(company_id=company_id).all():
        tickets_by_status[t.status] = tickets_by_status.get(t.status, 0) + 1
        canal = t.tipo or "chamado"
        tickets_per_channel[canal] = tickets_per_channel.get(canal, 0) + 1

        if t.status in ("resolvido", "fechado"):
            diff = now - t.created_at.replace(tzinfo=None)
            resolved_tickets_hours.append(diff.total_seconds() / 3600)
            if t.created_at >= today_start:
                resolved_today += 1

    tickets_today = (
        db.query(Ticket)
        .filter(
            Ticket.company_id == company_id,
            Ticket.created_at >= today_start,
            Ticket.created_at < today_end,
        )
        .count()
    )

    total_emails = db.query(EmailMessage).filter_by(company_id=company_id).count()
    email_conversations = db.query(EmailConversation).filter_by(company_id=company_id).count()
    tickets_converted = (
        db.query(Ticket)
        .filter(Ticket.company_id == company_id, Ticket.tipo.in_(["email", "chat"]))
        .count()
    )

    avg_resolution_hours = (
        round(sum(resolved_tickets_hours) / len(resolved_tickets_hours), 1)
        if resolved_tickets_hours
        else None
    )

    return {
        "total_clients": total_clients,
        "total_conversations": total_conversations,
        "total_tickets": total_tickets,
        "total_appointments": total_appointments,
        "conversations_today": conversations_today,
        "tickets_today": tickets_today,
        "tickets_by_status": tickets_by_status,
        "tickets_per_channel": tickets_per_channel,
        "tickets_resolved_today": resolved_today,
        "avg_resolution_hours": avg_resolution_hours,
        "csat_score": None,
        "channels": {
            "whatsapp": {
                "conversations": total_conversations,
                "messages": total_conversations,
            },
            "email": {
                "conversations": email_conversations,
                "messages": total_emails,
            },
        },
        "tickets_converted": tickets_converted,
    }
