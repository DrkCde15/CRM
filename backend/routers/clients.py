from io import StringIO

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import Client, Conversation, User
from schemas.schemas import ClientOut, ConversationOut, Paginated
from services.export import export_response
from services.webhooks import emit as webhook_emit, EVENT_CLIENT_CREATED


class BatchDelete(BaseModel):
    ids: list[int]

router = APIRouter(prefix="/api/clients", tags=["clients"])


class ClientNameUpdate(BaseModel):
    name: str


@router.get("", response_model=Paginated[ClientOut])
def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Client).filter_by(company_id=current_user.company_id)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter((Client.name.ilike(like)) | (Client.phone.ilike(like)))
    total = q.count()
    items = q.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/export")
def export_clients(
    format: str = Query("csv", alias="formato"),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Client).filter_by(company_id=current_user.company_id)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter((Client.name.ilike(like)) | (Client.phone.ilike(like)))
    clients = q.order_by(Client.created_at.desc()).all()

    rows = [
        {
            "id": c.id,
            "nome": c.name,
            "telefone": c.phone,
            "tipo": (c.dados or {}).get("tipo", ""),
            "estado": c.estado,
            "criado_em": c.created_at.isoformat() if c.created_at else "",
        }
        for c in clients
    ]
    return export_response(rows, format, "clientes")


@router.post("/import")
async def import_clients(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Formato não suportado. Use CSV ou XLSX.")

    content = await file.read()

    if ext == "csv":
        df = pd.read_csv(StringIO(content.decode("utf-8", errors="replace")))
    else:
        df = pd.read_excel(content, engine="openpyxl")

    col_map: dict[str, str] = {}
    for c in df.columns:
        cl = c.strip().lower().replace(" ", "_").replace("-", "_")
        if cl in ("nome", "name", "cliente", "contato", "nome_do_cliente"):
            col_map[c] = "name"
        elif cl in ("telefone", "phone", "celular", "whatsapp", "tel"):
            col_map[c] = "phone"
        elif cl in ("email", "e_mail"):
            col_map[c] = "email"
        elif cl in ("tipo", "type", "categoria"):
            col_map[c] = "tipo"
        elif cl in ("observacao", "obs", "notes", "nota"):
            col_map[c] = "obs"
        elif cl in ("cidade", "city"):
            col_map[c] = "cidade"
        elif cl in ("estado", "state", "uf"):
            col_map[c] = "estado"

    imported = 0
    errors: list[dict] = []

    for idx, row in df.iterrows():
        try:
            name = str(row.get([k for k, v in col_map.items() if v == "name"][0], "")).strip() if "name" in col_map.values() else ""
            if not name or name == "nan":
                continue
            phone = str(row.get([k for k, v in col_map.items() if v == "phone"][0], "")).strip() if "phone" in col_map.values() else ""
            if phone == "nan":
                phone = ""
            dados: dict = {}
            for k, v in col_map.items():
                if v in ("name", "phone"):
                    continue
                val = row.get(k)
                if pd.isna(val):
                    continue
                dados[v] = str(val)

            client = Client(
                company_id=current_user.company_id,
                name=name,
                phone=phone,
                dados=dados or None,
            )
            db.add(client)
            db.flush()
            webhook_emit(EVENT_CLIENT_CREATED, current_user.company_id, {
                "client_id": client.id,
                "name": client.name,
                "phone": client.phone,
            })
            imported += 1
        except Exception as e:
            errors.append({"linha": int(idx) + 2, "erro": str(e)})

    db.commit()
    return {"imported": imported, "errors": errors}


@router.post("/batch/delete")
def batch_delete_clients(
    body: BatchDelete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clients = (
        db.query(Client)
        .filter(Client.id.in_(body.ids), Client.company_id == current_user.company_id)
        .all()
    )
    for c in clients:
        db.delete(c)
    db.commit()
    return {"ok": True, "deleted": len(clients)}


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter_by(id=client_id, company_id=current_user.company_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}/name", response_model=ClientOut)
def update_name(
    client_id: int,
    body: ClientNameUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = db.query(Client).filter_by(id=client_id, company_id=current_user.company_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.name = body.name
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}/conversations", response_model=list[ConversationOut])
def client_conversations(
    client_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Conversation)
        .filter_by(client_id=client_id, company_id=current_user.company_id)
        .order_by(Conversation.created_at.asc())
        .limit(limit)
        .all()
    )
