"""Logs de auditoria e erros do sistema.

Expoe a leitura dos registros de ``audit_logs`` com filtros basicos.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import AuditLog, User

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("")
def list_logs(
    level: str | None = None,
    entity: str | None = None,
    action: str | None = None,
    user_id: int | None = None,
    search: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(AuditLog).where(AuditLog.company_id == user.company_id)
    if level:
        stmt = stmt.where(AuditLog.level == level)
    if entity:
        stmt = stmt.where(AuditLog.entity == entity)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if user_id is not None:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            (AuditLog.action.ilike(like)) | (AuditLog.entity.ilike(like))
        )

    total = db.execute(
        select(func.count()).select_from(stmt.subquery())
    ).scalar_one()

    items = db.execute(
        stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    ).scalars().all()

    return {
        "total": total,
        "items": [
            {
                "id": l.id,
                "level": l.level,
                "action": l.action,
                "entity": l.entity,
                "entity_id": l.entity_id,
                "user_id": l.user_id,
                "details": l.details,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in items
        ],
    }


@router.get("/stats")
def log_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.execute(
        select(AuditLog.level, func.count())
        .where(AuditLog.company_id == user.company_id)
        .group_by(AuditLog.level)
    ).all()
    return {level: count for level, count in rows}
