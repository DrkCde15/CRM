from core.config import settings
from core.database import SessionLocal
from models.models import Config


def _get_config(db, key: str, default: str = "") -> str:
    row = db.query(Config).filter_by(key=key).first()
    return row.value if row else default


def _set_config(db, key: str, value: str) -> None:
    row = db.query(Config).filter_by(key=key).first()
    if row:
        row.value = value
    else:
        db.add(Config(key=key, value=value))
    db.commit()


def taky_configured() -> bool:
    return bool(settings.taky_api_url and settings.taky_email and settings.taky_password)


async def create_taky_task(titulo: str, descricao: str, client_phone: str) -> int | None:
    from httpx import AsyncClient

    if not taky_configured():
        return None

    async with AsyncClient(base_url=settings.taky_api_url, timeout=15) as http:
        login = await http.post(
            "/auth/login",
            json={"email": settings.taky_email, "password": settings.taky_password},
        )
        if login.status_code != 200:
            return None
        token = login.json().get("access_token")
        if not token:
            return None

        payload = {
            "titulo": titulo,
            "descricao": descricao,
            "cliente": client_phone,
            "project_id": settings.taky_default_project_id,
            "responsavel_id": settings.taky_default_user_id,
        }
        resp = await http.post(
            "/tasks",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        if resp.status_code not in (200, 201):
            return None
        return resp.json().get("id")
