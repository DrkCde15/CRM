from core.database import SessionLocal
from models.models import Notification, User
from services import realtime


def notify_all(company_id: int, title: str, body: str, link: str | None = None) -> None:
    db = SessionLocal()
    try:
        for user in db.query(User).filter_by(company_id=company_id).all():
            db.add(Notification(user_id=user.id, title=title, body=body, link=link))
        db.commit()
    finally:
        db.close()
    realtime.refresh("notifications", company_id)
