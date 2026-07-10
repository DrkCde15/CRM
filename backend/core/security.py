from datetime import UTC, datetime, timedelta

import bcrypt
from jose import JWTError, jwt

from core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def validate_password(password: str) -> None:
    if len(password) < 8:
        raise ValueError("A senha deve ter ao menos 8 caracteres")
    if not any(c.isupper() for c in password):
        raise ValueError("A senha deve conter ao menos uma letra maiúscula")
    if not any(c.islower() for c in password):
        raise ValueError("A senha deve conter ao menos uma letra minúscula")
    if not any(c.isdigit() for c in password):
        raise ValueError("A senha deve conter ao menos um número")


def create_access_token(subject: str | int) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except JWTError:
        return None
