from collections import defaultdict
from time import time

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from core.database import SessionLocal
from core.deps import get_current_user, optional_current_user
from core.security import create_access_token, hash_password, validate_password, verify_password
from models.models import User
from schemas.schemas import Token, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

_login_attempts: dict[str, list[float]] = defaultdict(list)
_MAX_ATTEMPTS = 5
_LOCKOUT_SECONDS = 300


def _check_lockout(key: str) -> None:
    now = time()
    attempts = _login_attempts[key]
    attempts[:] = [t for t in attempts if now - t < _LOCKOUT_SECONDS]
    if len(attempts) >= _MAX_ATTEMPTS:
        retry = int(_LOCKOUT_SECONDS - (now - attempts[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Muitas tentativas. Tente novamente em {retry}s",
        )


def _register_failure(key: str) -> None:
    _login_attempts[key].append(time())


def _get_user_by_email(db, email):
    return db.query(User).filter_by(email=email).first()


def _list_users(db):
    return db.query(User).order_by(User.created_at.asc()).all()


@router.post("/register", response_model=UserOut)
def register(body: UserCreate, current: User | None = Depends(optional_current_user)):
    db = SessionLocal()
    try:
        exists = db.query(User).first() is not None
        if exists and (current is None or current.role != "admin"):
            raise HTTPException(status_code=403, detail="Only an admin can register users")
        if _get_user_by_email(db, body.email):
            raise HTTPException(status_code=400, detail="Email already registered")
        try:
            validate_password(body.password)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e)) from None
        user = User(
            email=body.email,
            name=body.name,
            hashed_password=hash_password(body.password),
            role=body.role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends()):
    key = form.username.lower()
    db = SessionLocal()
    try:
        user = _get_user_by_email(db, form.username)
        if not user or not verify_password(form.password, user.hashed_password):
            _register_failure(key)
            _check_lockout(key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )
        _login_attempts[key].clear()
        return Token(access_token=create_access_token(user.id))
    finally:
        db.close()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can list users")
    db = SessionLocal()
    try:
        return _list_users(db)
    finally:
        db.close()
