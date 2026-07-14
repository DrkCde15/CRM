import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.crypto import encrypt_secret
from core.database import get_db
from core.deps import get_current_user
from models.models import EmailAccount, EmailConversation, EmailMessage, User
from schemas.schemas import (
    EmailAccountCreate,
    EmailAccountOut,
    EmailAccountUpdate,
    EmailConversationOut,
    EmailSend,
    Paginated,
)
from services import email_channel

router = APIRouter(prefix="/email", tags=["email"])


def _admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")


@router.get("/accounts", response_model=list[EmailAccountOut])
def list_accounts(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(EmailAccount).order_by(EmailAccount.id.desc()).all()


@router.post("/accounts", response_model=EmailAccountOut)
def create_account(
    body: EmailAccountCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _admin(user)
    account = EmailAccount(
        company_id=body.company_id,
        provider=body.provider,
        email=body.email,
        display_name=body.display_name or body.email,
        smtp_host=body.smtp_host,
        smtp_port=body.smtp_port,
        imap_host=body.imap_host,
        imap_port=body.imap_port,
        username=body.username or body.email,
        encrypted_password=encrypt_secret(body.password),
        google_script_url=body.google_script_url,
        encrypted_script_secret=encrypt_secret(body.google_script_secret),
        active=body.active,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/accounts/{account_id}", response_model=EmailAccountOut)
def get_account(
    account_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    account = db.get(EmailAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return account


@router.put("/accounts/{account_id}", response_model=EmailAccountOut)
def update_account(
    account_id: int,
    body: EmailAccountUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _admin(user)
    account = db.get(EmailAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "password":
            if value:
                account.encrypted_password = encrypt_secret(value)
        elif field == "google_script_secret":
            if value:
                account.encrypted_script_secret = encrypt_secret(value)
        else:
            setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/accounts/{account_id}")
def delete_account(
    account_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _admin(user)
    account = db.get(EmailAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    db.delete(account)
    db.commit()
    return {"ok": True}


@router.get("/conversations", response_model=Paginated[EmailConversationOut])
def list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ticket_id: int | None = None,
    account_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(EmailConversation)
    if ticket_id:
        q = q.filter_by(ticket_id=ticket_id)
    if account_id:
        q = q.filter_by(account_id=account_id)
    total = q.count()
    items = q.order_by(EmailConversation.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/conversations/{conversation_id}", response_model=EmailConversationOut)
def get_conversation(
    conversation_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    conv = db.get(EmailConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    return conv


@router.post("/send")
async def send_email(
    body: EmailSend,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    account = None
    if body.conversation_id:
        conv = db.get(EmailConversation, body.conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversa não encontrada")
        account = db.get(EmailAccount, conv.account_id)
        if not body.subject:
            body.subject = conv.subject
        if not body.in_reply_to:
            last = (
                db.query(EmailMessage)
                .filter_by(conversation_id=conv.id, direction="inbound")
                .order_by(EmailMessage.created_at.desc())
                .first()
            )
            if last:
                body.in_reply_to = last.message_id
    elif body.account_id:
        account = db.get(EmailAccount, body.account_id)

    if not account:
        raise HTTPException(status_code=400, detail="Conta de e-mail não encontrada")

    message_id = await email_channel.send_reply(
        account,
        body.to,
        body.subject,
        body.body_html,
        body.body_text,
        body.cc,
        body.bcc,
        body.in_reply_to,
    )

    if body.conversation_id:
        msg = EmailMessage(
            conversation_id=body.conversation_id,
            sender=account.email,
            recipient=body.to,
            cc=body.cc,
            bcc=body.bcc,
            body_html=body.body_html,
            body_text=body.body_text,
            attachments=[],
            message_id=message_id or "",
            in_reply_to=body.in_reply_to,
            direction="outbound",
        )
        db.add(msg)
        db.commit()
    return {"ok": True, "message_id": message_id}


@router.post("/sync/{account_id}")
async def sync_account(
    account_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    account = db.get(EmailAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    count = await email_channel.sync_account(db, account)
    return {"ok": True, "synced": count}


@router.post("/sync")
def sync_all(
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    account_ids = [a.id for a in db.query(EmailAccount).filter_by(active=True).all()]

    def _run() -> None:
        from core.database import SessionLocal

        for acc_id in account_ids:
            session = SessionLocal()
            try:
                account = session.get(EmailAccount, acc_id)
                if account:
                    asyncio.run(email_channel.sync_account(session, account))
            finally:
                session.close()

    background.add_task(_run)
    return {"ok": True, "queued": len(account_ids)}
