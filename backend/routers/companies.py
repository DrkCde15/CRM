from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import Client, Company, Conversation, Ticket, User

router = APIRouter(prefix="/api/companies", tags=["companies"])


class CompanyOut(BaseModel):
    id: int
    name: str
    sso_provider: str | None
    created_at: datetime | None

    class Config:
        from_attributes = True


class CompanyStats(BaseModel):
    users: int
    clients: int
    tickets: int
    conversations: int


@router.get("")
def list_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    return [{"id": c.id, "name": c.name, "sso_provider": c.sso_provider, "created_at": c.created_at.isoformat() if c.created_at else None} for c in db.query(Company).all()]


@router.get("/{company_id}")
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    company = db.query(Company).filter_by(id=company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return {"id": company.id, "name": company.name, "sso_provider": company.sso_provider, "created_at": company.created_at.isoformat() if company.created_at else None}


@router.get("/{company_id}/stats", response_model=CompanyStats)
def company_stats(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    return CompanyStats(
        users=db.query(User).filter_by(company_id=company_id).count(),
        clients=db.query(Client).filter_by(company_id=company_id).count(),
        tickets=db.query(Ticket).filter_by(company_id=company_id).count(),
        conversations=db.query(Conversation).filter_by(company_id=company_id).count(),
    )


class CompanyUpdate(BaseModel):
    name: str | None = None


@router.put("/{company_id}")
def update_company(
    company_id: int,
    body: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    company = db.query(Company).filter_by(id=company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    if body.name is not None:
        company.name = body.name
    db.commit()
    db.refresh(company)
    return {"id": company.id, "name": company.name, "sso_provider": company.sso_provider, "created_at": company.created_at.isoformat() if company.created_at else None}
