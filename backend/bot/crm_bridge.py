# Bridge do Bot → CRM (crm.db)
# Espelha as mensagens do bot no banco do CRM para manter o Inbox unificado
# (/api/inbox) funcionando mesmo após substituirmos o atendimento interno.
import os
import sys
from pathlib import Path

BOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BOT_DIR.parent

# O bot roda como subprocesso do backend (mesmo venv), então os modelos do
# CRM (core.database / models.models) estão importáveis a partir daqui.
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from models.models import Client as CrmClient, Conversation as CrmConversation  # noqa: E402

# Usa o crm.db do projeto (ao lado de backend/). Pode ser sobrescrito por
# CRM_DATABASE_URL (ex.: quando o bot roda isolado de outro diretório).
_DEFAULT_CRM_DB = f"sqlite:///{os.path.join(BACKEND_DIR, 'crm.db')}"
CRM_DB_URL = os.getenv("CRM_DATABASE_URL", _DEFAULT_CRM_DB)

_engine = create_engine(
    CRM_DB_URL,
    connect_args={"check_same_thread": False, "timeout": 30},
)
Session = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)

# Empresa padrão do seed (a Inbox filtra por company_id do usuário logado).
_DEFAULT_COMPANY_ID = 1


def bridge_to_crm(telefone: str, mensagem: str, resposta: str = "", tipo: str = "texto") -> None:
    """Grava a mensagem recebida e a resposta no crm.db para o Inbox.

    Cada troca vira uma única linha em `conversations` (message + response),
    espelhando o comportamento do antigo atendimento interno, de modo que o
    Inbox mostra um item por exchange. O telefone é salvo como JID
    (ex.: 55...@s.whatsapp.net). Falhas nunca devem quebrar o fluxo do bot.
    """
    try:
        db = Session()
        try:
            client = db.query(CrmClient).filter_by(phone=telefone).first()
            if client is None:
                client = CrmClient(
                    phone=telefone,
                    company_id=_DEFAULT_COMPANY_ID,
                    estado="inicio",
                    dados={},
                )
                db.add(client)
                db.commit()
                db.refresh(client)

            db.add(
                CrmConversation(
                    client_id=client.id,
                    company_id=_DEFAULT_COMPANY_ID,
                    message=mensagem or "",
                    response=resposta or "",
                    type=tipo,
                    read=False,
                )
            )
            db.commit()
        finally:
            db.close()
    except Exception as exc:  # never break the bot on CRM issues
        try:
            import structlog

            structlog.get_logger().warning("crm_bridge_failed", error=str(exc))
        except Exception:
            pass
