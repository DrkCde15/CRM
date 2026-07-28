from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.deps import get_current_user, get_db
from core.database import Base
from sqlalchemy import text

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("")
async def search(
    q: str = Query(min_length=1),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not q.strip():
        return []

    results = []
    like = f"%{q}%"
    company_id = user.company_id

    try:
        clients = db.execute(
            text("SELECT id, name, phone FROM clients WHERE company_id = :cid AND (name LIKE :q OR phone LIKE :q)"),
            {"cid": company_id, "q": like},
        ).fetchall()
        for c in clients:
            results.append({
                "id": f"client-{c[0]}",
                "type": "client",
                "label": c[1],
                "description": c[2],
                "path": f"/clients",
            })

        tickets = db.execute(
            text("SELECT id, titulo, status FROM tickets WHERE company_id = :cid AND titulo LIKE :q"),
            {"cid": company_id, "q": like},
        ).fetchall()
        for t in tickets:
            results.append({
                "id": f"ticket-{t[0]}",
                "type": "ticket",
                "label": t[1],
                "description": f"Status: {t[2]}",
                "path": f"/tickets",
            })

        users = db.execute(
            text("SELECT id, name, email FROM users WHERE company_id = :cid AND name LIKE :q"),
            {"cid": company_id, "q": like},
        ).fetchall()
        for u in users:
            results.append({
                "id": f"user-{u[0]}",
                "type": "user",
                "label": u[1],
                "description": u[2],
                "path": f"/users",
            })
    except Exception:
        pass

    return results[:20]
