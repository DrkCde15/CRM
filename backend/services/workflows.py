from sqlalchemy.orm import Session

from core.database import SessionLocal
from models.models import Ticket, Webhook, Workflow
from services.webhooks import emit as webhook_emit


def evaluate_conditions(conditions: dict | None, context: dict) -> bool:
    if not conditions:
        return True
    field = conditions.get("field")
    op = conditions.get("op", "eq")
    value = conditions.get("value")
    actual = context.get(field)
    if op == "eq":
        return actual == value
    elif op == "neq":
        return actual != value
    elif op == "contains":
        return value in (actual or "")
    elif op == "in":
        return actual in (value if isinstance(value, list) else [value])
    return True


def execute_action(action: dict, context: dict, db: Session):
    action_type = action.get("type")
    if action_type == "change_status":
        ticket_id = context.get("ticket_id")
        if ticket_id:
            ticket = db.query(Ticket).filter_by(id=ticket_id).first()
            if ticket:
                ticket.status = action.get("value", "aberto")
                db.commit()
    elif action_type == "webhook":
        webhook_emit(action.get("event", "workflow.triggered"), context.get("company_id"), context)


def run_workflows(event: str, context: dict):
    db = SessionLocal()
    try:
        workflows = db.query(Workflow).filter_by(
            event=event,
            active=True,
            company_id=context.get("company_id"),
        ).all()
        for wf in workflows:
            if evaluate_conditions(wf.conditions, context):
                for action in (wf.actions if isinstance(wf.actions, list) else [wf.actions]):
                    execute_action(action, context, db)
    finally:
        db.close()
