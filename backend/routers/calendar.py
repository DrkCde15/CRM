import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import ScheduledJob, User
from services.scheduler import reload

router = APIRouter(prefix="/api/calendar", tags=["calendar"])
logger = logging.getLogger("mochi.calendar")


TASK_TYPE_LABELS = {
    "sla_check": "Verificação de SLA",
    "appointment_reminder": "Lembrete de agendamentos",
    "cleanup": "Limpeza de dados",
}

TASK_TYPE_LIST = list(TASK_TYPE_LABELS.keys())


class JobBody(BaseModel):
    name: str
    task_type: str
    interval_minutes: int = 60
    config: dict | None = None
    active: bool = True


@router.get("/jobs")
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = db.query(ScheduledJob).filter_by(company_id=current_user.company_id).all()
    return [
        {
            "id": j.id,
            "name": j.name,
            "task_type": j.task_type,
            "task_type_label": TASK_TYPE_LABELS.get(j.task_type, j.task_type),
            "interval_minutes": j.interval_minutes,
            "active": j.active,
            "last_run_at": j.last_run_at.isoformat() if j.last_run_at else None,
            "created_at": j.created_at.isoformat() if j.created_at else None,
        }
        for j in jobs
    ]


@router.post("/jobs")
def create_job(
    body: JobBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.task_type not in TASK_TYPE_LIST:
        raise HTTPException(status_code=400, detail="Tipo de tarefa inválido")
    if body.interval_minutes < 1:
        raise HTTPException(status_code=400, detail="Intervalo mínimo é 1 minuto")
    job = ScheduledJob(
        company_id=current_user.company_id,
        name=body.name,
        task_type=body.task_type,
        interval_minutes=body.interval_minutes,
        config=body.config,
        active=body.active,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    reload()
    return {"ok": True, "id": job.id}


@router.put("/jobs/{job_id}")
def update_job(
    job_id: int,
    body: JobBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(ScheduledJob).filter_by(
        id=job_id, company_id=current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    if body.task_type not in TASK_TYPE_LIST:
        raise HTTPException(status_code=400, detail="Tipo de tarefa inválido")
    if body.interval_minutes < 1:
        raise HTTPException(status_code=400, detail="Intervalo mínimo é 1 minuto")
    job.name = body.name
    job.task_type = body.task_type
    job.interval_minutes = body.interval_minutes
    job.config = body.config
    job.active = body.active
    db.commit()
    reload()
    return {"ok": True}


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(ScheduledJob).filter_by(
        id=job_id, company_id=current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    db.delete(job)
    db.commit()
    reload()
    return {"ok": True}


@router.post("/jobs/{job_id}/run-now")
def run_job_now(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from services.scheduler import TASK_HANDLERS

    job = db.query(ScheduledJob).filter_by(
        id=job_id, company_id=current_user.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    handler = TASK_HANDLERS.get(job.task_type)
    if not handler:
        raise HTTPException(status_code=400, detail="Tipo de tarefa sem handler")
    try:
        handler(job.company_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
