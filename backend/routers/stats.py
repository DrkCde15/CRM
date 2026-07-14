from datetime import datetime, timedelta

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
    WebsiteConversation,
    WebsiteMessage,
)

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

    total_emails = db.query(EmailMessage).count()
    email_conversations = db.query(EmailConversation).count()
    total_chats = db.query(WebsiteMessage).count()
    website_conversations = db.query(WebsiteConversation).count()
    open_chats = (
        db.query(WebsiteConversation).filter_by(status="open").count()
    )
    closed_chats = (
        db.query(WebsiteConversation).filter_by(status="closed").count()
    )
    tickets_converted = (
        db.query(Ticket)
        .filter(Ticket.tipo.in_(["email", "chat"]))
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
        "channels": {
            "whatsapp": {
                "conversations": total_conversations,
                "messages": db.query(Conversation).count(),
            },
            "email": {
                "conversations": email_conversations,
                "messages": total_emails,
            },
            "website": {
                "conversations": website_conversations,
                "messages": total_chats,
                "open": open_chats,
                "closed": closed_chats,
            },
        },
        "tickets_converted": tickets_converted,
    }
