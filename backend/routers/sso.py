from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from core.security import create_access_token
from models.models import Company, User

router = APIRouter(prefix="/api/sso", tags=["SSO"])


class SSOConfigUpdate(BaseModel):
    provider: str | None = None
    client_id: str | None = None
    client_secret: str | None = None
    issuer: str | None = None
    metadata_url: str | None = None


@router.get("/config")
def get_sso_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.query(Company).filter_by(id=current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return {
        "sso_provider": company.sso_provider,
        "sso_client_id": company.sso_client_id and company.sso_client_id[:20] + "...",
        "sso_issuer": company.sso_issuer,
        "sso_metadata_url": company.sso_metadata_url,
        "configured": bool(company.sso_provider and company.sso_client_id),
    }


@router.put("/config")
def update_sso_config(
    body: SSOConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    company = db.query(Company).filter_by(id=current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    if body.provider is not None:
        company.sso_provider = body.provider
    if body.client_id is not None:
        company.sso_client_id = body.client_id
    if body.client_secret is not None:
        company.sso_client_secret = body.client_secret
    if body.issuer is not None:
        company.sso_issuer = body.issuer
    if body.metadata_url is not None:
        company.sso_metadata_url = body.metadata_url
    db.commit()
    return {"ok": True}


@router.post("/login")
def sso_login(
    email: str,
    token: str,
    db: Session = Depends(get_db),
):
    """Endpoint para login via SSO. O provedor externo redireciona para cá com email + token."""
    user = db.query(User).filter_by(email=email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    company = db.query(Company).filter_by(id=user.company_id).first()
    if not company or not company.sso_provider or not company.sso_client_secret:
        raise HTTPException(status_code=401, detail="SSO não configurado")
    try:
        payload = jwt.decode(
            token,
            company.sso_client_secret,
            algorithms=["HS256"],
            audience=company.sso_client_id,
            issuer=company.sso_issuer,
            options={"require_exp": True},
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    if payload.get("email") != email:
        raise HTTPException(status_code=401, detail="Email não confere com o token")
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer", "user": {"email": user.email, "nome": user.name, "role": user.role}}
