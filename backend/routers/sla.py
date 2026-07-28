from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import SLARule, Ticket, User
from services.sla import check_and_escalate

router = APIRouter(prefix="/api/sla", tags=["SLA"])


class SLARuleCreate(BaseModel):
    name: str
    priority: str = "media"
    max_response_hours: float = 24.0
    max_resolution_hours: float = 72.0
    escalate_after_hours: float = 0
    escalate_action: str = ""


class SLARuleOut(BaseModel):
    id: int
    name: str
    priority: str
    max_response_hours: float
    max_resolution_hours: float
    escalate_after_hours: float
    escalate_action: str
    active: bool

    class Config:
        from_attributes = True


@router.get("/rules", response_model=list[SLARuleOut])
def list_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(SLARule).filter_by(company_id=current_user.company_id).all()


@router.post("/rules", response_model=SLARuleOut)
def create_rule(
    body: SLARuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = SLARule(company_id=current_user.company_id, **body.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/rules/{rule_id}", response_model=SLARuleOut)
def update_rule(
    rule_id: int,
    body: SLARuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = db.query(SLARule).filter_by(id=rule_id, company_id=current_user.company_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    for k, v in body.model_dump().items():
        setattr(rule, k, v)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = db.query(SLARule).filter_by(id=rule_id, company_id=current_user.company_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    db.delete(rule)
    db.commit()
    return {"ok": True}


@router.post("/check")
def run_sla_check(
    current_user: User = Depends(get_current_user),
):
    check_and_escalate()
    return {"ok": True}


@router.get("/breached")
def list_breached(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tickets = db.query(Ticket).filter_by(
        company_id=current_user.company_id,
        sla_breached=True,
    ).order_by(Ticket.created_at.desc()).limit(50).all()
    return [{
        "id": t.id,
        "titulo": t.titulo,
        "status": t.status,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    } for t in tickets]
