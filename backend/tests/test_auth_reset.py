from core.database import SessionLocal
from models.models import PasswordReset


def _latest_token() -> str:
    db = SessionLocal()
    try:
        reset = db.query(PasswordReset).order_by(PasswordReset.created_at.desc()).first()
        return reset.token
    finally:
        db.close()


def test_forgot_and_reset_password(client):
    client.post(
        "/auth/register",
        json={"email": "reset@crm.com", "name": "R", "password": "Secret123", "role": "admin"},
    )

    r = client.post("/auth/forgot-password", json={"email": "reset@crm.com"})
    assert r.status_code == 200

    token = _latest_token()
    assert token

    r = client.post("/auth/reset-password", json={"token": token, "password": "NewSecret123"})
    assert r.status_code == 200

    r = client.post("/auth/login", data={"username": "reset@crm.com", "password": "NewSecret123"})
    assert r.status_code == 200

    r = client.post("/auth/reset-password", json={"token": token, "password": "Other456"})
    assert r.status_code == 400
