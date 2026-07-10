from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import appointments, auth, clients, notifications, stats, tickets, webhook

app = FastAPI(title=settings.app_name, version="0.1.0")

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
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


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
