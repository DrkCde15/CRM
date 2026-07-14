import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from core.config import settings
from core.database import Base, engine

logger = logging.getLogger("convexo")
from routers import (
    appointments,
    auth,
    canned,
    clients,
    email_channel,
    inbox,
    notifications,
    stats,
    tickets,
    webhook,
    website_chat,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    issues = settings.validate()
    if issues:
        for msg in issues:
            logger.warning("CONFIG: %s", msg)
    else:
        logger.info("Configuração validada: OK")
    # Garante que as tabelas existam mesmo sem rodar `alembic upgrade head`
    # antes (ex.: ao subir de um diretório diferente e criar um crm.db novo).
    Base.metadata.create_all(engine)
    logger.info("Banco de dados: %s", engine.url)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    # Permite os próprios recursos do SPA/widget (same-origin) e scripts/styles
    # inline (o exemplo do widget injeta token/api via <script> inline). Sem
    # 'unsafe-inline' o app e o widget não carregam (tela em branco).
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "object-src 'none'"
    ),
}


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(tickets.router)
app.include_router(appointments.router)
app.include_router(stats.router)
app.include_router(webhook.router)
app.include_router(notifications.router)
app.include_router(email_channel.router)
app.include_router(website_chat.router)
app.include_router(inbox.router)
app.include_router(canned.router_quick_replies)
app.include_router(canned.router_macros)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}


# ───────────────────── Serviço de estáticos (rodar só com o backend) ─────────────────────
# O build do frontend (frontend/dist) é servido na raiz e o widget na pasta /widget,
# permitindo operar toda a plataforma apenas com `uvicorn main:app` (o gateway
# de WhatsApp continua opcional).
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_FRONTEND_DIST = os.path.normpath(os.path.join(_BASE_DIR, "..", "frontend", "dist"))
_WIDGET_DIR = os.path.normpath(os.path.join(_BASE_DIR, "..", "widget"))

if os.path.isdir(_WIDGET_DIR):
    app.mount(
        "/widget",
        StaticFiles(directory=_WIDGET_DIR, html=True),
        name="widget-static",
    )

if os.path.isdir(_FRONTEND_DIST):

    @app.get("/{full_path:path}", include_in_schema=False)
    async def _spa_fallback(full_path: str):
        # Serve arquivos reais do build; rotas do SPA caem no index.html.
        candidate = os.path.join(_FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))
