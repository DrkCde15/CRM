<div align="center">
  <img src="frontend/public/logo.png" alt="Convexo" width="120" />
</div>

# Convexo — Sistema de Atendimento Omnichannel

Convexo é um CRM completo com gestão de clientes, conversas, chamados (tickets) e agendamentos, com atendimento **omnichannel**: **WhatsApp**, **E-mail** e **Chat do site (widget)**, tudo unificado na **Inbox**.

## Estrutura

```
.
├── backend/          # API FastAPI (Python)
│   ├── alembic/      # Migrations do banco
│   ├── core/         # Config, database, auth, security
│   ├── models/       # SQLAlchemy models
│   ├── routers/      # Endpoints (auth, clients, tickets, appointments, stats, webhook, email_channel, website_chat, inbox)
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Lógica de negócio (chat, email)
│   └── tests/        # Testes (pytest)
├── frontend/         # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── components/   # Layout, ChatBubble, Toaster
│       ├── pages/        # Login, Register, ForgotPassword, ResetPassword, Inbox, Tickets, Appointments, Dashboard, Users
│       ├── utils/        # Validações
│       ├── api.ts        # Axios client
│       ├── store.ts      # Zustand (auth + toasts)
│       └── types.ts
├── widget/           # Chat widget do site (Vite + React, bundle IIFE/Shadow DOM)
│   ├── src/             # api.ts, widget.tsx, main.tsx, styles.css
│   ├── dist/            # bundle gerado (widget.iife.js)
│   └── example.html     # página de exemplo para testar o widget
└── gateway/          # Gateway WhatsApp (Node.js + Baileys)
    ├── index.js      # Servidor Express + Baileys WebSocket
    └── .env.example
```

## Canais de atendimento

| Canal | Origem | Como aparece no CRM |
|---|---|---|
| **WhatsApp** | Gateway Node (Baileys) | Tabela `conversations` → Inbox (canal `whatsapp`) |
| **E-mail** | Conta IMAP/SMTP ou Google Apps Script | Tabela `email_conversations` → Inbox (canal `email`) |
| **Chat do site** | Widget embarcado no site do cliente | Tabela `website_conversations` → Inbox (canal `website`) |

**Toda interação iniciada pelo widget vira uma conversa listável na Inbox**, independente do canal escolhido pelo visitante:

- **💬 Chat no site** — abre o chat em tempo real (WebSocket `/chat/ws`). Cria `WebsiteConversation` + `WebsiteMessage`.
- **📱 WhatsApp** — abre o `wa.me` e, antes, registra um *lead* (`POST /widget/lead`) criando uma `WebsiteConversation`.
- **✉️ E-mail** — formulário que (1) envia um e-mail externo para o `contact_email` da empresa via Google Apps Script e (2) cria uma `WebsiteConversation` com os dados do lead.

---

## Como rodar

**Pré-requisitos:** Python 3.11+, Node.js 18+ e (opcional) um número de WhatsApp para o gateway.

> ⚠️ **WSL + PowerShell + SQLite:** rodar o backend a partir do Windows acessando o WSL via mount (`\\wsl.localhost\...`) causa `database is locked`. Use sempre um **venv nativo do Linux** (`.venv-linux`) e mantenha o `crm.db` **dentro** do filesystem do WSL (não em `/mnt/c/...`). Todos os comandos abaixo são rodados dentro do WSL (`wsl.exe -e bash -lc "..."`).

### 1. Backend (API — porta 8000)

```bash
cd backend
python -m venv .venv-linux
source .venv-linux/bin/activate          # venv Linux nativo (evita "database is locked")
pip install -r requirements.txt
cp .env.example .env                     # edite as variáveis (ver abaixo)
alembic upgrade head                     # cria/atualiza o schema do banco
uvicorn main:app --reload --host 0.0.0.0 --port 8000   # http://localhost:8000  (docs em /docs)
```

Variáveis mínimas em `backend/.env`:
- `SECRET_KEY` — gere com `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `ALLOWED_ORIGINS` — lista de origens CORS. Inclua `http://localhost:5173` (frontend), `http://localhost:3000`, `http://localhost:8080` (página de exemplo do widget) e `http://localhost:5174`.
- `EMAIL_GOOGLE_SCRIPT_URL` + `EMAIL_GOOGLE_SCRIPT_SECRET` — necessárias para envio de e-mails (tickets, reset de senha e formulário do widget). Sem elas, o envio é ignorado (apenas log).
- `FRONTEND_URL` — usada nos links de redefinição de senha (padrão `http://localhost:5173`).

O primeiro cadastro pela tela de Registro cria o usuário **admin** inicial.

**Subir em background (recomendado para testes):**

```bash
# Backend
cd backend && source .venv-linux/bin/activate
setsid nohup python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 > /tmp/crm_uvicorn.log 2>&1 < /dev/null &

# Frontend
cd frontend && setsid nohup npm run dev -- --host > /tmp/crm_frontend.log 2>&1 < /dev/null &

# Página de exemplo do widget (sirva a pasta /widget em :8080)
cd widget && setsid nohup python3 -m http.server 8080 > /tmp/crm_widget.log 2>&1 < /dev/null &
```

### 2. Frontend (React — porta 5173)

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

### 3. Widget de chat do site (porta 8080 = exemplo)

```bash
cd widget
npm install
npm run build                     # gera dist/widget.iife.js
python3 -m http.server 8080       # serve example.html (ou hospede dist/ no site do cliente)
```

Para testar: `http://localhost:8080/example.html?token=SEU_TOKEN&api=http://localhost:8000`.

### 4. Gateway WhatsApp (opcional — porta 3001)

```bash
cd gateway
npm install
cp .env.example .env              # edite WEBHOOK_URL (ponte para o backend)
node index.js                     # escaneie o QR code com o WhatsApp
```

> O frontend se comunica com o backend em `http://localhost:8000` (configure `VITE_API_URL` para outro endereço). O gateway é independente e só é necessário se quiser o canal WhatsApp.

---

## Widget de chat do site (`widget/`)

Widget autocontido em **React**, empacotado como **IIFE** (`dist/widget.iife.js`) e montado dentro de um **Shadow DOM** — isolado do CSS do site do cliente.

### Como embarcar em um site

```html
<!-- Elemento onde o widget é montado -->
<div id="convexo-chat" data-token="SEU_TOKEN" data-api="https://api.convexo.com"></div>

<!-- Bundle do widget (após npm install && npm run build) -->
<script src="https://SEU_CDN/widget.iife.js"></script>
```

- `data-token` — `api_token` da `WidgetConfig` (gerado no admin).
- `data-api` — URL base da API (`https://api.convexo.com`). Também aceito via `window.CONVEXO_API`.
- A `example.html` lê `?token=` e `?api=` da query string e injeta nos atributos automaticamente.

### Telas do widget

1. **Balão (💬)** → abre o menu de canais: Chat no site / WhatsApp / E-mail.
2. **Chat no site** → chat em tempo real via WebSocket (`/chat/ws`). Suporta envio de arquivos (`/chat/upload`).
3. **WhatsApp** → registra o lead no CRM e abre `https://wa.me/<numero>?text=...` numa nova aba.
4. **E-mail** → formulário (nome, e-mail, mensagem) que dispara e-mail externo **e** cria o lead no CRM.

### Endpoints do widget (backend)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/widget/config?token=` | público | Config pública do widget (nome, cor, mensagens, `whatsapp_number`, `contact_email`) |
| `POST` | `/widget/config` | admin | Cria config de widget (gera `api_token`) |
| `PUT` | `/widget/config/{id}` | admin | Atualiza config (cor, `whatsapp_number`, `contact_email`, etc.) |
| `POST` | `/widget/email?token=` | público | Recebe o formulário de e-mail: envia e-mail externo + cria `WebsiteConversation` |
| `POST` | `/widget/lead?token=` | público | Registra um lead (ex.: clique em WhatsApp) criando `WebsiteConversation` |
| `POST` | `/chat/connect` | público | Cria/recupera visitante + `WebsiteConversation` (retorna `id`) |
| `GET` | `/chat/history/{id}` | usuário | Histórico de mensagens do chat |
| `POST` | `/chat/send` | público/usuário | Envia mensagem (visitante ou agente); difunde via WebSocket |
| `POST` | `/chat/{id}/assign` | usuário | Atribui conversa a um agente |
| `POST` | `/chat/{id}/close` | usuário | Fecha a conversa |
| `WS` | `/chat/ws?conversation_id=` | — | WebSocket de tempo real do chat |

Rate limit: 30 req/min por chave (token/sessão/conversa).

---

## Inbox unificada

Todos os canais aparecem numa única lista (`frontend/src/pages/Inbox.tsx`), com auto-refresh a cada 6s e filtro por canal.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/inbox?channel=whatsapp\|email\|website` | Lista unificada (`InboxItem`: canal, assunto, última mensagem, status, `ticket_id`) |
| `GET` | `/inbox/channels` | Status de quais canais estão configurados |

- **WhatsApp** → lê `conversations`.
- **E-mail** → lê `email_conversations` (com `emailChannel.conversation` para o detalhe e resposta por e-mail).
- **Website** → lê `website_conversations` (com `websiteChat.history` para o detalhe e resposta via chat).

Ao responder no canal **Website** pela Inbox, a mensagem é enviada ao visitante via WebSocket (`/chat/send`). Ao responder no canal **E-mail**, usa `emailChannel.send` (requer uma `EmailAccount` ativa).

---

## Qualidade & Testes

| Camada | Ferramentas | Comando |
|---|---|---|
| Backend | ruff + black + pytest | `ruff check .` · `black .` · `pytest -q` |
| Frontend | eslint + prettier + vitest | `npm run lint` · `npm run format` · `npm test` |
| Widget | eslint + build | `npm run build` |

Os testes do backend usam um banco temporário (via `conftest`), então não tocam no `crm.db` de desenvolvimento.

### Migrations (Alembic)

O schema não é criado automaticamente. Sempre rode `alembic upgrade head` ao subir o projeto ou após mudanças nos models.

Atalho (`backend/db.py`):

```bash
python db.py revision -m "descrição"   # gera migration (autogenerate)
python db.py upgrade                   # aplica até head
python db.py downgrade -1              # reverte 1 migration
python db.py stamp head                # marca versão sem rodar
```

---

## Segurança & Contas

- **Primeiro cadastro** cria o admin inicial (tela de registro).
- **Novos usuários** só podem ser criados por um admin (tela "Usuários", visível só para admin).
- **Tipos de conta**: `admin` (gestão completa) e `agent` (operação).
- **Política de senha**: mín. 8 caracteres, com maiúscula, minúscula e número.
- **Rate limit de login**: 5 tentativas falhas → bloqueio de 5 min (HTTP 429).
- **Tokens JWT** com expiração (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Redefinição de senha**: `/auth/forgot-password` gera um token (1h) e envia link por e-mail; `/auth/reset-password` aplica a nova senha e invalida o token.
- **Cabeçalhos de segurança**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`, etc.

## Notificações por e-mail

Ao criar um chamado (`POST /tickets`), o backend dispara e-mails HTML para **todos os usuários cadastrados** (admins e agentes), em background (`services/email.py`).

O envio é feito **sempre via Google Apps Script**: o backend faz um `POST` JSON `{to, subject, html, fromName?}` para a `EMAIL_GOOGLE_SCRIPT_URL` (um web app deployado que envia o e-mail via `GmailApp`). Se a URL não estiver configurada, o envio é ignorado silenciosamente (apenas log).

O formulário de e-mail do widget também usa esse mesmo caminho, enviando para o `contact_email` configurado na `WidgetConfig`.

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

Microserviço Node.js que conecta o Convexo ao WhatsApp via [Baileys](https://github.com/WhiskeySockets/Baileys) (WebSocket não-oficial).

```
WhatsApp <──> Gateway (porta 3001) <──> Backend Convexo (porta 8000)
```

- **Entrada** (WhatsApp → Convexo): mensagens recebidas via WebSocket são enfileiradas e enviadas via webhook (`POST /webhook`) para o backend.
- **Saída** (Convexo → WhatsApp): backend chama as APIs REST do gateway para enviar mensagens.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status da conexão WhatsApp |
| `POST` | `/send` | Enviar texto |
| `POST` | `/send-buttons` | Enviar botões interativos |
| `POST` | `/send-image` | Enviar imagem |

Recursos: reconexão automática, retry com backoff no webhook, suporte a texto/imagem/áudio, persistência de sessão e rate limit de 30 req/min.

---

## Variáveis de ambiente

### Backend

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | SQLite ou PostgreSQL |
| `SECRET_KEY` | Chave JWT |
| `ALLOWED_ORIGINS` | Origens CORS (inclua 5173, 3000, 8080, 5174) |
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