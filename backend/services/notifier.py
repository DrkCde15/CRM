import logging

from core.database import SessionLocal
from models.models import Notification, User

logger = logging.getLogger("mochi.notifier")


def notify_company(
    company_id: int,
    title: str,
    body: str = "",
    link: str | None = None,
    *,
    _exclude_user_id: int | None = None,
):
    """Cria uma notificação para todos os usuários de uma empresa."""
    db = SessionLocal()
    try:
        users = db.query(User).filter_by(company_id=company_id).all()
        for user in users:
            if _exclude_user_id is not None and user.id == _exclude_user_id:
                continue
            notif = Notification(
                user_id=user.id,
                company_id=company_id,
                title=title,
                body=body,
                link=link,
            )
            db.add(notif)
        db.commit()
        logger.info("Notificação enviada para company %d: %s", company_id, title)
    except Exception as e:
        logger.error("Erro ao criar notificação: %s", e)
    finally:
        db.close()


def notify_user(
    user_id: int,
    company_id: int,
    title: str,
    body: str = "",
    link: str | None = None,
):
    """Cria uma notificação para um usuário específico."""
    db = SessionLocal()
    try:
        notif = Notification(
            user_id=user_id,
            company_id=company_id,
            title=title,
            body=body,
            link=link,
        )
        db.add(notif)
        db.commit()
    except Exception as e:
        logger.error("Erro ao criar notificação: %s", e)
    finally:
        db.close()
