from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import User, Workflow

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


class WorkflowCreate(BaseModel):
    name: str
    event: str
    conditions: dict | None = None
    actions: dict | list[dict]


class WorkflowUpdate(BaseModel):
    name: str | None = None
    event: str | None = None
    conditions: dict | None = None
    actions: dict | list[dict] | None = None
    active: bool | None = None


class WorkflowOut(BaseModel):
    id: int
    company_id: int
    name: str
    event: str
    conditions: dict | None
    actions: dict | list[dict]
    active: bool
    created_at: datetime | None

    class Config:
        from_attributes = True


@router.get("", response_model=list[WorkflowOut])
def list_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Workflow).filter_by(company_id=current_user.company_id).order_by(Workflow.created_at.desc()).all()


@router.get("/schema")
def workflow_schema(user: User = Depends(get_current_user)):
    """Esquema de opcoes para o editor visual de workflows."""
    return {
        "events": [
            {"value": "ticket.created", "label": "Ticket criado"},
            {"value": "ticket.updated", "label": "Ticket atualizado"},
            {"value": "ticket.closed", "label": "Ticket fechado"},
            {"value": "message.received", "label": "Mensagem recebida"},
            {"value": "client.created", "label": "Cliente criado"},
            {"value": "appointment.created", "label": "Compromisso criado"},
        ],
        "conditionFields": [
            {"value": "titulo", "label": "Título", "type": "text"},
            {"value": "tipo", "label": "Tipo", "type": "text"},
            {"value": "status", "label": "Status", "type": "text"},
            {"value": "categoria", "label": "Categoria", "type": "text"},
            {"value": "prioridade", "label": "Prioridade", "type": "text"},
            {"value": "sentimento", "label": "Sentimento", "type": "text"},
            {"value": "client_id", "label": "ID do cliente", "type": "number"},
        ],
        "operators": [
            {"value": "equals", "label": "="},
            {"value": "not_equals", "label": "≠"},
            {"value": "contains", "label": "contém"},
            {"value": "not_contains", "label": "não contém"},
            {"value": "gt", "label": ">"},
            {"value": "lt", "label": "<"},
        ],
        "actionTypes": [
            {"value": "notify", "label": "Notificar usuários", "params": [
                {"key": "message", "label": "Mensagem", "type": "text"},
            ]},
            {"value": "webhook", "label": "Disparar webhook", "params": [
                {"key": "url", "label": "URL", "type": "text"},
            ]},
            {"value": "email", "label": "Enviar e-mail", "params": [
                {"key": "to", "label": "Para", "type": "text"},
                {"key": "subject", "label": "Assunto", "type": "text"},
                {"key": "body", "label": "Corpo", "type": "textarea"},
            ]},
            {"value": "set_field", "label": "Definir campo do ticket", "params": [
                {"key": "field", "label": "Campo", "type": "text"},
                {"key": "value", "label": "Valor", "type": "text"},
            ]},
            {"value": "create_task", "label": "Criar tarefa (Taky)", "params": [
                {"key": "title", "label": "Título", "type": "text"},
            ]},
        ],
    }


@router.post("", response_model=WorkflowOut)
def create_workflow(
    body: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wf = Workflow(
        company_id=current_user.company_id,
        name=body.name,
        event=body.event,
        conditions=body.conditions,
        actions=body.actions,
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return wf


@router.put("/{workflow_id}", response_model=WorkflowOut)
def update_workflow(
    workflow_id: int,
    body: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wf = db.query(Workflow).filter_by(id=workflow_id, company_id=current_user.company_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if body.name is not None:
        wf.name = body.name
    if body.event is not None:
        wf.event = body.event
    if body.conditions is not None:
        wf.conditions = body.conditions
    if body.actions is not None:
        wf.actions = body.actions
    if body.active is not None:
        wf.active = body.active
    db.commit()
    db.refresh(wf)
    return wf


@router.delete("/{workflow_id}")
def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wf = db.query(Workflow).filter_by(id=workflow_id, company_id=current_user.company_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()
    return {"ok": True}
