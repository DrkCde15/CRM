from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from core.database import SessionLocal
from core.security import create_access_token, hash_password, verify_password
from core.deps import get_current_user, optional_current_user
from models.models import User
from schemas.schemas import Token, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_user_by_email(db, email):
    return db.query(User).filter_by(email=email).first()


@router.post("/register", response_model=UserOut)
def register(body: UserCreate, current: User | None = Depends(optional_current_user)):
    db = SessionLocal()
    try:
        exists = db.query(User).first() is not None
        if exists and (current is None or current.role != "admin"):
            raise HTTPException(status_code=403, detail="Only an admin can register users")
        if _get_user_by_email(db, body.email):
            raise HTTPException(status_code=400, detail="Email already registered")
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
    db = SessionLocal()
    try:
        user = _get_user_by_email(db, form.username)
        if not user or not verify_password(form.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        return Token(access_token=create_access_token(user.id))
    finally:
        db.close()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
