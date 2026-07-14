import asyncio
import imaplib
import os
import ssl
from datetime import datetime
from email import message_from_bytes
from email.header import decode_header, make_header

from sqlalchemy.orm import Session

from core.config import settings
from core.crypto import decrypt_secret
from models.models import Client, EmailAccount, EmailConversation, EmailMessage, Ticket

PROVIDER_DEFAULTS = {
    "gmail": ("imap.gmail.com", 993, "smtp.gmail.com", 587),
    "outlook": ("outlook.office365.com", 993, "smtp.office365.com", 587),
    "office365": ("outlook.office365.com", 993, "smtp.office365.com", 587),
}


def _decode(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return value


def resolve_account_params(account: EmailAccount) -> dict:
    provider = (account.provider or "imap").lower()
    if account.imap_host and account.smtp_host:
        return {
            "imap_host": account.imap_host,
            "imap_port": account.imap_port,
            "smtp_host": account.smtp_host,
            "smtp_port": account.smtp_port,
            "username": account.username or account.email,
            "password": decrypt_secret(account.encrypted_password),
        }
    imap_host, imap_port, smtp_host, smtp_port = PROVIDER_DEFAULTS.get(
        provider, (account.imap_host, account.imap_port, account.smtp_host, account.smtp_port)
    )
    return {
        "imap_host": imap_host,
        "imap_port": imap_port,
        "smtp_host": smtp_host,
        "smtp_port": smtp_port,
        "username": account.username or account.email,
        "password": decrypt_secret(account.encrypted_password),
    }


def _store_attachments(msg, message_id: str) -> list[dict]:
    attachments: list[dict] = []
    base = os.path.join(settings.upload_dir, "email", message_id)
    for part in msg.walk():
        if part.get_content_disposition() == "attachment":
            filename = part.get_filename()
            if not filename:
                continue
            data = part.get_payload(decode=True) or b""
            rel = os.path.join(base, os.path.basename(filename))
            os.makedirs(os.path.dirname(rel), exist_ok=True)
            with open(rel, "wb") as fh:
                fh.write(data)
            attachments.append(
                {
                    "filename": os.path.basename(filename),
                    "content_type": part.get_content_type(),
                    "size": len(data),
                    "path": rel,
                }
            )
    return attachments


def _parse_message(raw: bytes) -> dict | None:
    try:
        msg = message_from_bytes(raw)
    except Exception:
        return None
    sender = _decode(msg.get("From"))
    recipient = _decode(msg.get("To"))
    cc = _decode(msg.get("Cc"))
    bcc = _decode(msg.get("Bcc"))
    subject = _decode(msg.get("Subject"))
    message_id = (msg.get("Message-ID") or "").strip()
    in_reply_to = (msg.get("In-Reply-To") or "").strip()
    references = (msg.get("References") or "").strip()
    thread_id = (references.split() or [in_reply_to or message_id]).pop(0).strip("<>")

    body_text = ""
    body_html = ""
    for part in msg.walk():
        if part.get_content_type() == "text/plain" and not body_text:
            body_text = part.get_payload(decode=True).decode(errors="ignore")
        elif part.get_content_type() == "text/html" and not body_html:
            body_html = part.get_payload(decode=True).decode(errors="ignore")
    if not body_text:
        body_text = msg.get_payload(decode=True).decode(errors="ignore") if msg.get_payload(decode=True) else ""

    return {
        "sender": sender,
        "recipient": recipient,
        "cc": cc,
        "bcc": bcc,
        "subject": subject,
        "message_id": message_id,
        "in_reply_to": in_reply_to,
        "thread_id": thread_id,
        "body_html": body_html,
        "body_text": body_text,
        "attachments": _store_attachments(msg, message_id or str(datetime.now().timestamp())),
    }


def _fetch_imap(params: dict, seen_ids: set[str]) -> list[dict]:
    ctx = ssl.create_default_context()
    with imaplib.IMAP4_SSL(params["imap_host"], params["imap_port"], ssl_context=ctx) as imap:
        imap.login(params["username"], params["password"])
        imap.select("INBOX")
        _, data = imap.search(None, "ALL")
        ids = data[0].split() if data and data[0] else []
        parsed: list[dict] = []
        for mid in ids[-50:]:
            _, msg_data = imap.fetch(mid, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    raw = response_part[1]
                    parsed_msg = _parse_message(raw)
                    if parsed_msg and parsed_msg["message_id"] not in seen_ids:
                        parsed.append(parsed_msg)
        return parsed


def _find_client_by_email(db: Session, sender: str) -> Client | None:
    email_addr = sender.split("<")[-1].rstrip(">").strip().lower()
    if not email_addr:
        return None
    return db.query(Client).filter(Client.phone == email_addr).first()


def store_inbound(db: Session, account: EmailAccount, parsed: dict) -> EmailMessage:
    conv = (
        db.query(EmailConversation)
        .filter_by(account_id=account.id, thread_id=parsed["thread_id"])
        .first()
    )
    if not conv:
        client = _find_client_by_email(db, parsed["sender"])
        conv = EmailConversation(
            client_id=client.id if client else None,
            subject=parsed["subject"],
            thread_id=parsed["thread_id"],
            account_id=account.id,
        )
        db.add(conv)
        db.flush()
        ticket = Ticket(
            titulo=f"[E-mail] {parsed['subject'] or '(sem assunto)'}",
            descricao=parsed["body_text"][:1000],
            tipo="email",
            client_id=client.id if client else None,
        )
        db.add(ticket)
        db.flush()
        conv.ticket_id = ticket.id

    message = EmailMessage(
        conversation_id=conv.id,
        sender=parsed["sender"],
        recipient=parsed["recipient"],
        cc=parsed["cc"],
        bcc=parsed["bcc"],
        body_html=parsed["body_html"],
        body_text=parsed["body_text"],
        attachments=parsed["attachments"],
        message_id=parsed["message_id"],
        in_reply_to=parsed["in_reply_to"],
        direction="inbound",
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


async def sync_account(db: Session, account: EmailAccount) -> int:
    params = resolve_account_params(account)
    if not params["imap_host"] or not params["password"]:
        return 0
    seen = {m.message_id for m in db.query(EmailMessage).all()}
    try:
        parsed_list = await asyncio.to_thread(_fetch_imap, params, seen)
    except Exception:
        return 0
    count = 0
    for parsed in parsed_list:
        store_inbound(db, account, parsed)
        count += 1
    return count


async def send_reply(
    account: EmailAccount,
    to: str,
    subject: str,
    body_html: str,
    body_text: str,
    cc: str = "",
    bcc: str = "",
    in_reply_to: str = "",
) -> str:
    from core.config import settings
    from core.crypto import decrypt_secret
    from services import email

    provider = (account.provider or "").lower()
    script_url = account.google_script_url or (
        settings.email_google_script_url if provider in ("google", "gmail") else ""
    )

    if script_url:
        if not body_html and body_text:
            body_html = email.render_html(subject, body_text)
        secret = decrypt_secret(account.encrypted_script_secret) or (
            settings.email_google_script_secret if provider in ("google", "gmail") else ""
        )
        await email.send_via_google_script(
            script_url, secret, to, subject, body_html, from_name=account.display_name or account.email
        )
        return ""

    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    import aiosmtplib

    params = resolve_account_params(account)
    message = MIMEMultipart("alternative")
    message["From"] = account.email
    message["To"] = to
    message["Subject"] = subject
    if cc:
        message["Cc"] = cc
    if in_reply_to:
        message["In-Reply-To"] = in_reply_to
    if body_text:
        message.attach(MIMEText(body_text, "plain"))
    if body_html:
        message.attach(MIMEText(body_html, "html"))

    await aiosmtplib.send(
        message,
        hostname=params["smtp_host"],
        port=params["smtp_port"],
        username=params["username"],
        password=params["password"],
        start_tls=True,
    )
    return message["Message-ID"]
