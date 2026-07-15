import logging

import httpx

from core.config import settings
from core.database import SessionLocal
from models.models import User

log = logging.getLogger("email")

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family:Inter,Arial,sans-serif;background:#f6f7f9;padding:24px;color:#0f172a">
  <div style="max-width:520px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px">
    <div style="font-size:20px;font-weight:700;color:#059669">Convexo · Atendimento</div>
    <h1 style="font-size:18px">{title}</h1>
    <div style="font-size:14px;line-height:1.5">{body}</div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
    <div style="font-size:12px;color:#64748b">Esta é uma mensagem automática do Convexo.</div>
  </div>
</body>
</html>"""


def render_html(title: str, body: str) -> str:
    return HTML_TEMPLATE.format(title=title, body=body)


async def send_email(to: str, subject: str, html: str) -> None:
    url = settings.email_google_script_url
    if not url:
        log.info(
            "[email:skip] EMAIL_GOOGLE_SCRIPT_URL não configurado — to=%s subject=%s", to, subject
        )
        return
    payload: dict = {"to": to, "subject": subject, "html": html}
    if settings.email_from_name:
        payload["fromName"] = settings.email_from_name
    if settings.email_google_script_secret:
        payload["secret"] = settings.email_google_script_secret
    headers = (
        {"X-Script-Secret": settings.email_google_script_secret}
        if settings.email_google_script_secret
        else {}
    )
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(url, json=payload, headers=headers)


async def send_via_google_script(
    url: str,
    secret: str,
    to: str,
    subject: str,
    html: str,
    from_name: str = "",
) -> bool:
    if not url:
        return False
    payload: dict = {"to": to, "subject": subject, "html": html}
    if from_name:
        payload["fromName"] = from_name
    if secret:
        payload["secret"] = secret
    headers = {"X-Script-Secret": secret} if secret else {}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload, headers=headers)
        return resp.status_code < 300
    except Exception as e:  # noqa: BLE001 - não deve quebrar o fluxo de envio
        log.error("[email:script:error] falha ao enviar via Google Script: %s", e)
        return False


async def notify_all_users(subject: str, title: str, body: str, company_id: int | None = None) -> None:
    html = render_html(title, body)
    db = SessionLocal()
    try:
        q = db.query(User)
        if company_id is not None:
            q = q.filter_by(company_id=company_id)
        recipients = [u.email for u in q.all() if u.email]
    finally:
        db.close()
    for to in recipients:
        try:
            await send_email(to, subject, html)
        except Exception as e:  # noqa: BLE001 - não deve quebrar o fluxo principal
            log.error("[email:error] falha ao enviar para %s: %s", to, e)
