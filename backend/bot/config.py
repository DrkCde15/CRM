# Configurações centralizadas: variáveis de ambiente + logging estruturado
import os
import structlog
from dotenv import load_dotenv

# Carrega SÓ o .env da pasta do bot (se existir), para não herdar o .env do
# backend quando o processo é iniciado a partir de backend/. Com override=False,
# variáveis já definidas no ambiente (ex.: BOT_PORT/DATABASE_URL passados pelo
# backend em auto-start) prevalecem.
_BOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_BOT_DIR, '.env'))

GATEWAY_URL = os.getenv('GATEWAY_URL', 'http://localhost:3001')
# O bot não tem mais banco próprio: compartilha o crm.db do CRM (um diretório
# acima de backend/bot). Tabelas do bot (clientes, respostas_cache, etc.)
# convivem com as do CRM no mesmo arquivo.
_DEFAULT_CRM_DB = os.path.abspath(os.path.join(_BOT_DIR, '..', 'crm.db'))
DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{_DEFAULT_CRM_DB}')

# API do bot (Groq) — lida do ambiente / backend/bot/.env. Substitui a
# configuração que antes ficava no banco (dashboard). Precedência: ambiente.
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
GROQ_BASE_URL = os.getenv('GROQ_BASE_URL', 'https://api.groq.com/openai/v1')
GROQ_MODEL = os.getenv('GROQ_MODEL', 'grok-2-1212')

# Whitelist e grupos — quando definidas no ambiente, PRECEDEM as configurações
# do banco/dashboard. Comente ou deixe em branco para usar o valor do banco.
#   WHITELIST_ENABLED=true
#   WHITELIST=5511982553849,116578431590552
#   GROUP_ENABLED=true
WHITELIST_ENABLED = os.getenv('WHITELIST_ENABLED')  # 'true'/'false' ou None
WHITELIST = os.getenv('WHITELIST', '') or ''  # números separados por vírgula
GROUP_ENABLED = os.getenv('GROUP_ENABLED')  # 'true'/'false' ou None

# Configura o structlog com timestamps ISO, nome do logger, nível e formato colorido no console
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt='iso'),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)
