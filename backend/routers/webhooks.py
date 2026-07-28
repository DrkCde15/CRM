from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import User, Webhook
from services.webhooks import emit

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


class WebhookCreate(BaseModel):
    name: str = ""
    url: str
    events: str = ""


class WebhookUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    events: str | None = None
    active: bool | None = None


@router.get("")
def list_webhooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Webhook)
        .filter_by(company_id=current_user.company_id)
        .order_by(Webhook.created_at.desc())
        .all()
    )


@router.post("")
def create_webhook(
    body: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hook = Webhook(
        company_id=current_user.company_id,
        name=body.name,
        url=body.url,
        events=body.events,
    )
    db.add(hook)
    db.commit()
    db.refresh(hook)
    return hook


@router.put("/{hook_id}")
def update_webhook(
    hook_id: int,
    body: WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hook = (
        db.query(Webhook)
        .filter_by(id=hook_id, company_id=current_user.company_id)
        .first()
    )
    if not hook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    if body.name is not None:
        hook.name = body.name
    if body.url is not None:
        hook.url = body.url
    if body.events is not None:
        hook.events = body.events
    if body.active is not None:
        hook.active = body.active
    db.commit()
    db.refresh(hook)
    return hook


@router.delete("/{hook_id}")
def delete_webhook(
    hook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hook = (
        db.query(Webhook)
        .filter_by(id=hook_id, company_id=current_user.company_id)
        .first()
    )
    if not hook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(hook)
    db.commit()
    return {"ok": True}
