# CRM — Sistema de Atendimento

CRM completo com gestão de clientes, conversas, chamados (tickets) e agendamentos, com integração WhatsApp.

## Estrutura

```
.
├── backend/          # API FastAPI (Python)
│   ├── alembic/      # Migrations do banco
│   ├── core/         # Config, database, auth, security
│   ├── models/       # SQLAlchemy models
│   ├── routers/      # Endpoints (auth, clients, tickets, appointments, stats, webhook)
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Lógica de negócio
│   └── tests/        # Testes (pytest)
├── frontend/         # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── components/   # Layout, ChatBubble, Toaster
│       ├── pages/        # Login, Register, Inbox, Tickets, Appointments, Dashboard, Users
│       ├── utils/        # Validações
│       ├── api.ts        # Axios client
│       ├── store.ts      # Zustand (auth + toasts)
│       └── types.ts
└── gateway/          # Gateway WhatsApp (Node.js + Baileys)
    ├── index.js      # Servidor Express + Baileys WebSocket
    └── .env.example
```

## Como rodar

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env          # edite as variáveis
alembic upgrade head          # cria/atualiza o schema do banco
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Gateway (WhatsApp)

```bash
cd gateway
npm install
cp .env.example .env          # edite WEBHOOK_URL
node index.js                 # escaneie o QR code com o WhatsApp
```

## Qualidade & Testes

| Camada | Ferramentas | Comando |
|---|---|---|
| Backend | ruff + black + pytest | `ruff check .` · `black .` · `pytest -q` |
| Frontend | eslint + prettier + vitest | `npm run lint` · `npm run format` · `npm test` |

### Migrations (Alembic)

O schema não é criado automaticamente. Sempre rode `alembic upgrade head` ao subir o projeto ou após mudanças nos models.

Atalho (`backend/db.py`) para os comandos mais usados:

```bash
python db.py revision -m "descrição"   # gera migration (autogenerate)
python db.py upgrade                   # aplica até head
python db.py downgrade -1              # reverte 1 migration
python db.py stamp head                # marca versão sem rodar
```

Ou direto com o Alembic:

```bash
alembic revision --autogenerate -m "descrição"
alembic upgrade head
```

## Segurança & Contas

- **Primeiro cadastro** cria o admin inicial (tela de registro).
- **Novos usuários** só podem ser criados por um admin (tela "Usuários", visível só para admin).
- **Tipos de conta**: `admin` (gestão completa) e `agent` (operação).
- **Política de senha**: mín. 8 caracteres, com maiúscula, minúscula e número.
- **Rate limit de login**: 5 tentativas falhas → bloqueio de 5 min (HTTP 429).
- **Tokens JWT** com expiração (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`, etc.

## Gateway WhatsApp

Microserviço Node.js que conecta o CRM ao WhatsApp via [Baileys](https://github.com/WhiskeySockets/Baileys) (WebSocket não-oficial).

```
WhatsApp <──> Gateway (porta 3001) <──> Backend CRM (porta 8000)
```

- **Entrada** (WhatsApp → CRM): mensagens recebidas via WebSocket são enfileiradas e enviadas via webhook (`POST /webhook`) para o backend
- **Saída** (CRM → WhatsApp): backend chama as APIs REST do gateway para enviar mensagens

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status da conexão WhatsApp |
| `POST` | `/send` | Enviar texto |
| `POST` | `/send-buttons` | Enviar botões interativos |
| `POST` | `/send-image` | Enviar imagem |

Recursos: reconexão automática, retry com backoff no webhook, suporte a texto/imagem/áudio, persistência de sessão e rate limit de 30 req/min.

## Variáveis de ambiente

### Backend

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | SQLite ou PostgreSQL |
| `SECRET_KEY` | Chave JWT |
| `ALLOWED_ORIGINS` | Origens CORS |
| `GATEWAY_URL` | URL base do gateway |
| `WHATSAPP_WEBHOOK_URL` | URL para onde o gateway envia as mensagens |

### Gateway

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão: 3001) |
| `WEBHOOK_URL` | Endpoint do backend para receber mensagens |
| `LOG_LEVEL` | Nível de log (info, debug, etc.) |
