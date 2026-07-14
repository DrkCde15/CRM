from fastapi import APIRouter, Depends, HTTPException, status

from core.database import SessionLocal
from core.deps import get_current_user
from models.models import Notification, User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        items = (
            db.query(Notification)
            .filter_by(user_id=user.id, company_id=user.company_id)
            .order_by(Notification.created_at.desc())
            .limit(30)
            .all()
        )
        unread = db.query(Notification).filter_by(user_id=user.id, company_id=user.company_id, read=False).count()
        return {"items": items, "unread_count": unread}
    finally:
        db.close()


@router.post("/{notif_id}/read")
def mark_read(notif_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        notif = db.query(Notification).filter_by(id=notif_id, company_id=user.company_id).first()
        if not notif or notif.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada"
            )
        notif.read = True
        db.commit()
        return {"ok": True}
    finally:
        db.close()


@router.post("/read-all")
def mark_all_read(user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        db.query(Notification).filter_by(user_id=user.id, company_id=user.company_id, read=False).update(
            {Notification.read: True}
        )
        db.commit()
        return {"ok": True}
    finally:
        db.close()
