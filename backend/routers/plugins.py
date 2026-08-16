"""Catalogo de integracoes (Plugins).

Lista integracoes disponiveis (catalogo interno) mesclado com o estado
persistido em ``plugins`` (ativado/desativado + configuracoes).
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import get_db
from core.deps import get_current_user
from models.models import Plugin, User
from services import audit

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


PLUGIN_CATALOG = [
    {
        "key": "whatsapp",
        "name": "WhatsApp",
        "description": "Atendimento e notificacoes via WhatsApp (gateway).",
        "category": "Canais",
        "icon": "MessageCircle",
        "version": "1.0.0",
        "configSchema": [
            {"key": "gateway_url", "label": "URL do gateway", "type": "text", "placeholder": "http://localhost:3001"},
            {"key": "default_channel", "label": "Canal padrao", "type": "text", "placeholder": "whatsapp"},
        ],
    },
    {
        "key": "email",
        "name": "E-mail (IMAP/SMTP)",
        "description": "Recebimento e envio de e-mails como canal de atendimento.",
        "category": "Canais",
        "icon": "Mail",
        "version": "1.0.0",
        "configSchema": [
            {"key": "imap_host", "label": "Servidor IMAP", "type": "text"},
            {"key": "smtp_host", "label": "Servidor SMTP", "type": "text"},
            {"key": "username", "label": "Usuario", "type": "text"},
            {"key": "password", "label": "Senha", "type": "password"},
        ],
    },
    {
        "key": "telegram",
        "name": "Telegram",
        "description": "Atendimento via bot do Telegram.",
        "category": "Canais",
        "icon": "Send",
        "version": "1.0.0",
        "configSchema": [
            {"key": "bot_token", "label": "Token do bot", "type": "password"},
        ],
    },
    {
        "key": "ai_llm",
        "name": "IA / LLM",
        "description": "Provedor de IA para respostas, classificacao e resumos.",
        "category": "Inteligencia",
        "icon": "Sparkles",
        "version": "1.0.0",
        "configSchema": [
            {"key": "provider", "label": "Provedor", "type": "select", "options": ["groq", "openai", "anthropic", "gemini", "ollama"]},
            {"key": "model", "label": "Modelo", "type": "text"},
        ],
    },
    {
        "key": "n8n_mcp",
        "name": "n8n / MCP",
        "description": "Servidores MCP expostos como workflows no n8n.",
        "category": "Automacao",
        "icon": "Workflow",
        "version": "1.0.0",
        "configSchema": [
            {"key": "n8n_base_url", "label": "URL base do n8n", "type": "text", "placeholder": "http://localhost:5678"},
        ],
    },
    {
        "key": "calendar",
        "name": "Calendario / Agenda",
        "description": "Sincronizacao de compromissos e agendamentos.",
        "category": "Automacao",
        "icon": "Calendar",
        "version": "1.0.0",
        "configSchema": [
            {"key": "provider", "label": "Provedor", "type": "select", "options": ["google", "outlook", "local"]},
        ],
    },
    {
        "key": "documents",
        "name": "Documentos",
        "description": "Indexacao e busca semantica de documentos.",
        "category": "Armazenamento",
        "icon": "FileText",
        "version": "1.0.0",
        "configSchema": [
            {"key": "storage", "label": "Armazenamento", "type": "select", "options": ["local", "s3"]},
        ],
    },
    {
        "key": "slack",
        "name": "Slack",
        "description": "Notificacoes e alertas no Slack.",
        "category": "Notificacoes",
        "icon": "Bell",
        "version": "1.0.0",
        "configSchema": [
            {"key": "webhook_url", "label": "Webhook URL", "type": "password"},
        ],
    },
    {
        "key": "webhooks",
        "name": "Webhooks",
        "description": "Disparo de eventos para URLs externas.",
        "category": "Automacao",
        "icon": "Webhook",
        "version": "1.0.0",
        "configSchema": [],
    },
]


class PluginUpdate(BaseModel):
    enabled: bool | None = None
    config: dict | None = None


def _merged(user: User, db: Session) -> list[dict]:
    rows = db.execute(select(Plugin).where(Plugin.company_id == user.company_id)).scalars().all()
    by_key = {p.key: p for p in rows}
    result = []
    for item in PLUGIN_CATALOG:
        row = by_key.get(item["key"])
        result.append(
            {
                **item,
                "enabled": bool(row.enabled) if row else False,
                "config": (row.config or {}) if row else {},
                "builtin": True,
            }
        )
    return result


@router.get("")
def list_plugins(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _merged(user, db)


@router.get("/{key}")
def get_plugin(key: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    catalog = next((c for c in PLUGIN_CATALOG if c["key"] == key), None)
    if not catalog:
        raise HTTPException(404, "Plugin nao encontrado")
    row = db.execute(
        select(Plugin).where(Plugin.company_id == user.company_id, Plugin.key == key)
    ).scalars().first()
    return {
        **catalog,
        "enabled": bool(row.enabled) if row else False,
        "config": (row.config or {}) if row else {},
        "builtin": True,
    }


@router.put("/{key}")
def update_plugin(
    key: str,
    body: PluginUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    catalog = next((c for c in PLUGIN_CATALOG if c["key"] == key), None)
    if not catalog:
        raise HTTPException(404, "Plugin nao encontrado")

    row = db.execute(
        select(Plugin).where(Plugin.company_id == user.company_id, Plugin.key == key)
    ).scalars().first()
    if row is None:
        row = Plugin(
            company_id=user.company_id,
            key=key,
            name=catalog["name"],
            description=catalog["description"],
            category=catalog["category"],
            icon=catalog["icon"],
            version=catalog["version"],
            builtin=True,
        )
        db.add(row)

    if body.enabled is not None:
        row.enabled = body.enabled
    if body.config is not None:
        schema_keys = {f["key"] for f in catalog.get("configSchema", [])}
        row.config = {k: v for k, v in body.config.items() if k in schema_keys} if schema_keys else body.config

    db.commit()
    db.refresh(row)
    audit.log_action(
        db,
        action="plugin.toggle",
        entity="plugin",
        entity_id=key,
        level="info",
        details={"enabled": row.enabled},
        user=user,
    )
    return {
        **catalog,
        "enabled": bool(row.enabled),
        "config": row.config or {},
        "builtin": True,
    }
