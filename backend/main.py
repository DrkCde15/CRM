from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import Base, engine
import models.models
from routers import auth, clients, stats, tickets, appointments, webhook

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name, version="0.1.0")

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


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
