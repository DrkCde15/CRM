from core.database import SessionLocal
from models.models import Notification, User


def notify_all(title: str, body: str, link: str | None = None) -> None:
    db = SessionLocal()
    try:
        for user in db.query(User).all():
            db.add(Notification(user_id=user.id, title=title, body=body, link=link))
        db.commit()
    finally:
        db.close()
