from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import Appointment, User
from schemas.schemas import AppointmentCreate, AppointmentOut

router = APIRouter(prefix="/appointments", tags=["appointments"])


class AppointmentStatusUpdate(BaseModel):
    status: str


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Appointment).filter_by(company_id=current_user.company_id)
        .order_by(Appointment.data_hora.desc()).offset(skip).limit(limit).all()
    )


@router.post("", response_model=AppointmentOut)
def create_appointment(
    client_id: int,
    body: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = Appointment(client_id=client_id, company_id=current_user.company_id, **body.model_dump())
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


@router.put("/{appointment_id}/status", response_model=AppointmentOut)
def update_status(
    appointment_id: int,
    body: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = db.query(Appointment).filter_by(id=appointment_id, company_id=current_user.company_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = body.status
    db.commit()
    db.refresh(appt)
    return appt
