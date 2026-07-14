from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import CannedResponse, User
from schemas.schemas import (
    CannedResponseCreate,
    CannedResponseOut,
    CannedResponseUpdate,
)

_KINDS = {"quick_reply": "Resposta rápida", "macro": "Macro"}


def make_router(kind: str, prefix: str, tag: str) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])

    @router.get("", response_model=list[CannedResponseOut])
    def list_items(
        db: Session = Depends(get_db), _: User = Depends(get_current_user)
    ):
        return (
            db.query(CannedResponse)
            .filter_by(company_id=1, kind=kind)
            .order_by(CannedResponse.created_at.desc())
            .all()
        )

    @router.post("", response_model=CannedResponseOut, status_code=201)
    def create_item(
        body: CannedResponseCreate,
        db: Session = Depends(get_db),
        _: User = Depends(get_current_user),
    ):
        obj = CannedResponse(
            company_id=1,
            kind=kind,
            title=body.title,
            content=body.content,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @router.put("/{item_id}", response_model=CannedResponseOut)
    def update_item(
        item_id: int,
        body: CannedResponseUpdate,
        db: Session = Depends(get_db),
        _: User = Depends(get_current_user),
    ):
        obj = db.get(CannedResponse, item_id)
        if not obj or obj.kind != kind:
            raise HTTPException(status_code=404, detail="Não encontrado")
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        db.commit()
        db.refresh(obj)
        return obj

    @router.delete("/{item_id}")
    def delete_item(
        item_id: int,
        db: Session = Depends(get_db),
        _: User = Depends(get_current_user),
    ):
        obj = db.get(CannedResponse, item_id)
        if not obj or obj.kind != kind:
            raise HTTPException(status_code=404, detail="Não encontrado")
        db.delete(obj)
        db.commit()
        return {"ok": True}

    return router


router_quick_replies = make_router("quick_reply", "/quick-replies", "quick-replies")
router_macros = make_router("macro", "/macros", "macros")
