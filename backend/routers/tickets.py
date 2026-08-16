import asyncio
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import Client, Ticket, User
from schemas.schemas import Paginated, TicketCreate, TicketOut
from services import email, notifications, realtime, taky
from services.llm import chat_completion, classify_message, draft_reply
from services.webhooks import emit as webhook_emit
from services.workflows import run_workflows
from services import audit


SUMMARY_PROMPT = (
    "Com base no título e descrição do chamado abaixo, gere um resumo objetivo "
    "do problema e da solução (máximo 3 frases). "
    "Se não houver informações suficientes, responda apenas 'Resumo não disponível.'"
)


def _generate_summary(title: str, desc: str) -> str | None:
    try:
        import asyncio
        text = f"Título: {title}\nDescrição: {desc}" if desc else f"Título: {title}"
        messages = [
            {"role": "system", "content": SUMMARY_PROMPT},
            {"role": "user", "content": text},
        ]
        result = asyncio.run(chat_completion(messages=messages, tries=1))
        if result and "Resumo não disponível" not in result:
            return result
    except Exception:
        pass
    return None


def _run_summary(ticket_id: int) -> None:
    db = next(get_db())
    try:
        ticket = db.get(Ticket, ticket_id)
        if not ticket:
            return
        summary = _generate_summary(ticket.titulo, ticket.descricao)
        if summary:
            ticket.resumo = summary
            db.commit()
    finally:
        db.close()


class BatchStatusUpdate(BaseModel):
    ids: list[int]
    status: str


class BatchDelete(BaseModel):
    ids: list[int]

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


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
        current_user.company_id,
    )
    background.add_task(
        notifications.notify_all,
        current_user.company_id,
        f"Novo chamado #{ticket.id}",
        ticket.titulo,
        f"/tickets/{ticket.id}",
    )
    realtime.refresh("tickets", current_user.company_id)
    realtime.refresh("stats", current_user.company_id)
    webhook_emit("ticket.created", current_user.company_id, {
        "id": ticket.id,
        "titulo": ticket.titulo,
        "tipo": ticket.tipo,
        "status": ticket.status,
    })
    run_workflows("ticket.created", {
        "company_id": current_user.company_id,
        "ticket_id": ticket.id,
        "titulo": ticket.titulo,
        "tipo": ticket.tipo,
        "status": ticket.status,
    })
    return ticket


@router.post("/{ticket_id}/classify")
async def classify_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Classifica o ticket via IA (categoria, prioridade, sentimento) e persiste."""
    ticket = db.query(Ticket).filter_by(id=ticket_id, company_id=current_user.company_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    text = f"{ticket.titulo}\n{ticket.descricao}".strip()
    result = await classify_message(text)

    ticket.categoria = result.get("intent")
    ticket.prioridade = result.get("priority")
    ticket.sentimento = result.get("sentiment")
    ticket.classified_at = datetime.now()
    if not ticket.resumo and result.get("summary"):
        ticket.resumo = result.get("summary")
    db.commit()
    db.refresh(ticket)

    audit.log_action(
        db,
        action="ticket.classify",
        entity="ticket",
        entity_id=ticket_id,
        level="info",
        details={"categoria": ticket.categoria, "prioridade": ticket.prioridade, "sentimento": ticket.sentimento},
        user=current_user,
    )
    return {
        "id": ticket.id,
        "categoria": ticket.categoria,
        "prioridade": ticket.prioridade,
        "sentimento": ticket.sentimento,
        "resumo": ticket.resumo,
    }


@router.post("/{ticket_id}/suggest-reply")
async def suggest_ticket_reply(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gera uma resposta sugerida para o ticket via IA."""
    ticket = db.query(Ticket).filter_by(id=ticket_id, company_id=current_user.company_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    context = (
        f"Título: {ticket.titulo}\n"
        f"Descrição: {ticket.descricao or 'Sem descrição'}\n"
        f"Resumo: {ticket.resumo or ''}\n"
        f"Categoria: {ticket.categoria or 'n/d'}\n"
        f"Prioridade: {ticket.prioridade or 'n/d'}"
    )
    result = await draft_reply(context, channel="ticket")
    return {
        "id": ticket.id,
        "reply": result.get("reply", ""),
        "alternatives": result.get("alternatives", []),
    }


@router.put("/{ticket_id}/status", response_model=TicketOut)
def update_status(
    ticket_id: int,
    body: TicketStatusUpdate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter_by(id=ticket_id, company_id=current_user.company_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = body.status
    if body.status == "fechado" and not ticket.resumo:
        background.add_task(_run_summary, ticket_id)
    db.commit()
    db.refresh(ticket)
    realtime.refresh("tickets", current_user.company_id)
    realtime.refresh("stats", current_user.company_id)
    webhook_emit("ticket.updated", current_user.company_id, {
        "id": ticket.id,
        "titulo": ticket.titulo,
        "status": ticket.status,
    })
    run_workflows("ticket.updated", {
        "company_id": current_user.company_id,
        "ticket_id": ticket.id,
        "titulo": ticket.titulo,
        "tipo": ticket.tipo,
        "status": ticket.status,
    })
    if body.status == "fechado":
        webhook_emit("ticket.closed", current_user.company_id, {
            "id": ticket.id,
            "titulo": ticket.titulo,
        })
        run_workflows("ticket.closed", {
            "company_id": current_user.company_id,
            "ticket_id": ticket.id,
            "titulo": ticket.titulo,
        })
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


@router.post("/batch/status")
def batch_update_status(
    body: BatchStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tickets = (
        db.query(Ticket)
        .filter(Ticket.id.in_(body.ids), Ticket.company_id == current_user.company_id)
        .all()
    )
    for t in tickets:
        t.status = body.status
    db.commit()
    realtime.refresh("tickets", current_user.company_id)
    realtime.refresh("stats", current_user.company_id)
    return {"ok": True, "updated": len(tickets)}


@router.post("/batch/delete")
def batch_delete_tickets(
    body: BatchDelete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tickets = (
        db.query(Ticket)
        .filter(Ticket.id.in_(body.ids), Ticket.company_id == current_user.company_id)
        .all()
    )
    for t in tickets:
        db.delete(t)
    db.commit()
    realtime.refresh("tickets", current_user.company_id)
    realtime.refresh("stats", current_user.company_id)
    return {"ok": True, "deleted": len(tickets)}
