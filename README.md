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
│       ├── pages/        # Login, Register, ForgotPassword, ResetPassword, Inbox, Tickets, Appointments, Dashboard, Users
│       ├── utils/        # Validações
│       ├── api.ts        # Axios client
│       ├── store.ts      # Zustand (auth + toasts)
│       └── types.ts
└── gateway/          # Gateway WhatsApp (Node.js + Baileys)
    ├── index.js      # Servidor Express + Baileys WebSocket
    └── .env.example
```

## Como rodar

**Pré-requisitos:** Python 3.11+, Node.js 18+ e (opcional) um número de WhatsApp para o gateway.

### 1. Backend (API — porta 8000)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows — no Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # edite as variáveis (ver abaixo)
alembic upgrade head              # cria/atualiza o schema do banco
uvicorn main:app --reload         # http://localhost:8000  (docs em /docs)
```

Variáveis mínimas em `backend/.env`:
- `SECRET_KEY` — gere com `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `EMAIL_GOOGLE_SCRIPT_URL` + `EMAIL_GOOGLE_SCRIPT_SECRET` — necessárias para envio de e-mails (tickets e reset de senha). Sem elas, o envio é ignorado (apenas log).
- `FRONTEND_URL` — usada nos links de redefinição de senha (padrão `http://localhost:5173`).

O primeiro cadastro pela tela de Registro cria o usuário **admin** inicial.

### 2. Frontend (React — porta 5173)

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

### 3. Gateway WhatsApp (opcional — porta 3001)

```bash
cd gateway
npm install
cp .env.example .env              # edite WEBHOOK_URL (ponte para o backend)
node index.js                     # escaneie o QR code com o WhatsApp
```

> O frontend se comunica com o backend em `http://localhost:8000` (configure `VITE_API_URL` para outro endereço). O gateway é independente e só é necessário se quiser o canal WhatsApp.

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
- **Redefinição de senha**: `/auth/forgot-password` gera um token (1h) e envia link por e-mail; `/auth/reset-password` aplica a nova senha (com a mesma política) e invalida o token.
- **Cabeçalhos de segurança**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`, etc.

## Notificações por e-mail

Ao criar um chamado (`POST /tickets`), o backend dispara e-mails HTML para **todos os usuários cadastrados** (admins e agentes), em background (`services/email.py`).

O envio é feito **sempre via Google Apps Script**: o backend faz um `POST` JSON `{to, subject, html, fromName?}` para a `EMAIL_GOOGLE_SCRIPT_URL` (um web app deployado que envia o e-mail via `GmailApp`). Se a URL não estiver configurada, o envio é ignorado silenciosamente (apenas log).

## Notificações push (navegador)

A página de **Chamados** (`frontend/src/pages/Tickets.tsx`) faz polling a cada 5s. Quando surge um **novo chamado**, ela exibe uma **notificação nativa do navegador** (via [`react-push-notification`](https://github.com/yetanotherreactlibrary/react-push-notification), usando a Notification API) e um toast in-app.

> Requer que a aba esteja aberta e que o usuário conceda permissão de notificação ao navegador. Não é push em segundo plano (VAPID/Service Worker) — para isso seria necessário um backend de push separado.

## Central de notificações (in-app)

Além do e-mail e do push do navegador, cada usuário tem um **centro de notificações persistido** no backend. Na criação de um chamado, é gerada uma notificação para **todos os usuários**.

- Ícone de **sino** no navbar com **contador de não lidas** (atualizado a cada 15s).
- **Dropdown** com a lista de notificações e ação **"Marcar todas como lidas"**; cada item pode ser marcado como lido (e leva ao link do chamado).

Endpoints (`routers/notifications.py`):

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/notifications` | Lista do usuário + `unread_count` |
| `POST` | `/notifications/{id}/read` | Marca uma como lida |
| `POST` | `/notifications/read-all` | Marca todas como lidas |

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
| `FRONTEND_URL` | URL do frontend (usada nos links de redefinição de senha) |
| `EMAIL_GOOGLE_SCRIPT_URL` | URL do web app Google Apps Script (envio de e-mail) |
| `EMAIL_GOOGLE_SCRIPT_SECRET` | Segredo compartilhado enviado ao web app (header `X-Script-Secret` e campo `secret`) |
| `EMAIL_FROM_NAME` | Nome de exibição do remetente |

### Gateway

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão: 3001) |
| `WEBHOOK_URL` | Endpoint do backend para receber mensagens |
| `LOG_LEVEL` | Nível de log (info, debug, etc.) |
