from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from core.database import get_db
from core.deps import get_current_user
from models.models import Config, User
from schemas.schemas import ConfigOut, ConfigUpdate

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("")
def list_configs(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    configs = db.execute(select(Config)).scalars().all()
    return {c.key: c.value for c in configs}


@router.get("/{key}")
def get_config(key: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.execute(select(Config).where(Config.key == key)).scalar_one_or_none()
    if not c:
        raise HTTPException(404, f"Config '{key}' not found")
    return {"key": c.key, "value": c.value}


@router.put("/{key}")
def upsert_config(key: str, body: ConfigUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.execute(select(Config).where(Config.key == key)).scalar_one_or_none()
    if c:
        c.value = body.value
    else:
        c = Config(key=key, value=body.value)
        db.add(c)
    db.commit()
    return {"key": key, "value": body.value}


@router.delete("/{key}")
def delete_config(key: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.execute(select(Config).where(Config.key == key)).scalar_one_or_none()
    if not c:
        raise HTTPException(404, f"Config '{key}' not found")
    db.delete(c)
    db.commit()
    return {"ok": True}
