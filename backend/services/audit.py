"""Servico de auditoria (Logs).

Registra acoes de usuario e erros do sistema em ``audit_logs`` para
fins de rastreabilidade e exibicao no modulo de Logs do CRM.
"""

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from core.database import SessionLocal
from models.models import AuditLog


def log_action(
    db: Session,
    *,
    action: str,
    entity: str | None = None,
    entity_id: Any | None = None,
    level: str = "info",
    details: dict | None = None,
    user=None,
    company_id: int = 1,
) -> AuditLog:
    """Registra uma acao de auditoria.

    ``user`` pode ser uma instancia de ``User`` (usa company_id/user_id) ou None.
    Faz commit imediato do registro.
    """
    cid = company_id
    uid = None
    if user is not None:
        cid = getattr(user, "company_id", cid) or cid
        uid = getattr(user, "id", None)

    record = AuditLog(
        company_id=cid,
        user_id=uid,
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id is not None else None,
        level=level,
        details=details,
        created_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def log_error_from_request(path: str, method: str, error: str, status_code: int = 500) -> None:
    """Registra um erro de API em uma sessao propria (usado no handler global)."""
    try:
        db = SessionLocal()
        try:
            db.add(
                AuditLog(
                    company_id=1,
                    user_id=None,
                    action="api_error",
                    entity="api",
                    entity_id=path,
                    level="error",
                    details={"method": method, "status_code": status_code, "error": error[:500]},
                    created_at=datetime.now(),
                )
            )
            db.commit()
        finally:
            db.close()
    except Exception:
        pass
