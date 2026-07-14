<div align="center">
  <img src="frontend/public/logo.png" alt="Convexo" width="120" />
</div>

# Convexo — Plataforma CRM Omnichannel

> O Convexo é uma **plataforma CRM Omnichannel** desenvolvida para centralizar o atendimento ao cliente em um único lugar. Empresas podem gerenciar conversas provenientes de **WhatsApp**, **E-mail** e **Chat do Site**, além de controlar clientes, tickets, agendamentos, usuários, métricas e integrações por meio de uma única **Inbox inteligente**.
>
> O projeto foi pensado para empresas de diversos portes — do pequeno negócio ao ambiente multiempresa (SaaS) — com arquitetura modular, escalável e preparada para Inteligência Artificial.

## Sumário

- [Estrutura](#estrutura)
- [Arquitetura Geral](#arquitetura-geral)
- [Arquitetura Multiempresa (Multi-Tenant)](#arquitetura-multiempresa-multi-tenant)
- [Canais de atendimento](#canais-de-atendimento)
- [Como rodar](#como-rodar)
- [Widget de chat do site](#widget-de-chat-do-site-widget)
- [Inbox unificada](#inbox-unificada)
- [Dashboard Executivo](#dashboard-executivo)
- [Webhooks](#webhooks)
- [Integrações](#integrações)
- [Inteligência Artificial](#inteligência-artificial)
- [Segurança & Contas](#segurança--contas)
- [Notificações](#notificações)
- [Gateway WhatsApp](#gateway-whatsapp)
- [Qualidade & Testes](#qualidade--testes)
- [Migrations (Alembic)](#migrations-alembic)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Reset do banco de desenvolvimento](#reset-do-banco-de-desenvolvimento)
- [Roadmap](#roadmap)
- [Benefícios](#benefícios)

---

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

---

## Arquitetura Geral

O Convexo organiza todo o ecossistema de atendimento em camadas, da empresa até a inteligência artificial:

```
Empresa
   ↓
Convexo
   ↓
Inbox Unificada
   ↓
WhatsApp
   ↓
E-mail
   ↓
Widget
   ↓
Tickets
   ↓
Dashboard
   ↓
API
   ↓
Webhooks
   ↓
Integrações
   ↓
Inteligência Artificial
```

Cada camada é desacoplada: a Inbox consome os canais, os canais alimentam tickets e métricas, e a API expõe tudo para Webhooks, integrações externas e recursos de IA.

---

## Arquitetura Multiempresa (Multi-Tenant)

O sistema está preparado para evoluir para uma arquitetura **Multi-Tenant**, onde cada empresa possui seu próprio ambiente lógico e isolado. Cada tenant concentra:

- Usuários
- Clientes
- Conversas
- Tickets
- Agendamentos
- Configurações
- Widget
- Canais de comunicação
- Dashboard

**Exemplo de organização:**

```
Empresa A
├── Usuários
├── Clientes
├── Tickets
├── WhatsApp
├── E-mail
└── Widget

Empresa B
├── Usuários
├── Clientes
├── Tickets
├── WhatsApp
├── E-mail
└── Widget
```

A ativação do modo Multi-Tenant faz parte do **roadmap**. Toda a arquitetura (namespaces por empresa, tokens de widget, configurações e métricas) deve permanecer preparada para essa evolução, sem retrabalho estrutural.

---

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
uvicorn main:app --reload --host0.0.0.0 --port 8000   # http://localhost:8000  (docs em /docs)
```

Variáveis mínimas em `backend/.env`:
- `SECRET_KEY` — gere com `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `ALLOWED_ORIGINS` — lista de origens CORS. Inclua `http://localhost:5173` (frontend), `http://localhost:3000`, `http://localhost:8080` (página de exemplo do widget) e `http://localhost:5174`.
- `EMAIL_GOOGLE_SCRIPT_URL` + `EMAIL_GOOGLE_SCRIPT_SECRET` — necessárias para envio de e-mails (tickets, reset de senha e formulário do widget). Sem elas, o envio é ignorado (apenas log).
- `FRONTEND_URL` — usada nos links de redefinição de senha (padrão `http://localhost:5173`).

O primeiro cadastro pela tela de Registro cria o usuário **admin** inicial.

> ⚠️ **Não execute os servicos em background manualmente** (ex.: `setsid nohup ... &`). Para produção, use um gerenciador de processos (systemd, supervisor) ou um proxy reverso (nginx) — não deixe processos órfos na sessão interativa.

> 💡 **Rodar só com o backend:** o `main.py` serve automaticamente o build do frontend (`frontend/dist`, na raiz) e o widget (`widget/`, em `/widget`) quando as pastas `dist` existirem. Assim, basta `uvicorn main:app --reload --host0.0.0.0 --port 8000` para operar toda a plataforma em **um único processo** — o gateway de WhatsApp continua opcional. Para isso, gere os builds uma vez:
> ```bash
> cd frontend && npm install && npm run build
> cd ../widget && npm install && npm run build
> ```
> Acesse `http://localhost:8000/` (API e app ficam na mesma origem; o `VITE_API_URL` pode ficar vazio). O exemplo do widget fica em `http://localhost:8000/widget/example.html`.
>
> Limitação: deep-links diretos para rotas autenticadas (`/inbox`, `/tickets`, etc.) enquanto deslogado retornam o `401` da API em vez do app — navegue pelo app após o login. Em produço, sirva o SPA atrás de um proxy reverso com fallback para `index.html`.

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

## Respostas Rápidas & Macros

O Convexo inclui **Respostas Rápidas** e **Macros** — respostas pré-definidas para agilizar o atendimento na Inbox (sem necessidade de IA).

- **Respostas Rápidas** — snippets curtos, inseríveis com um clique no campo de resposta.
- **Macros** — respostas mais estruturadas/formatadas, também inseríveis na resposta.

Ambos são por empresa (`company_id`) e distinguidos pelo campo `kind` (`quick_reply` | `macro`) numa única tabela `canned_responses`.

**Na Inbox:**
- Botão **⚡ Respostas** (na barra de canais) abre o gerenciador: listagem em abas (Respostas Rápidas / Macros), criação, edição e exclusão.
- No campo de resposta de qualquer conversa, o botão **⚡** abre um popover com todos os itens; clicar insere o conteúdo na mensagem.

Endpoints (requerem autenticação):

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/quick-replies` | Lista respostas rápidas da empresa |
| `POST` | `/quick-replies` | Cria (body: `title`, `content`) |
| `PUT` | `/quick-replies/{id}` | Edita (`title`/`content`) |
| `DELETE` | `/quick-replies/{id}` | Remove |
| `GET` | `/macros` | Lista macros da empresa |
| `POST` | `/macros` | Cria (body: `title`, `content`) |
| `PUT` | `/macros/{id}` | Edita |
| `DELETE` | `/macros/{id}` | Remove |

---

## Dashboard Executivo

O Convexo conta com um **Dashboard** voltado à gestão e à tomada de decisão, reunindo os principais indicadores de atendimento e operação.

Indicadores disponíveis ou planejados:

| Indicador | Descrição |
|---|---|
| Conversas por canal | Volume de atendimentos dividido por WhatsApp, E-mail e Widget |
| Conversas do dia | Total de conversas iniciadas no dia corrente |
| Tickets abertos | Quantidade de tickets em aberto |
| Tickets fechados | Quantidade de tickets resolvidos |
| Tempo médio de resposta | Média entre a chegada e a primeira resposta do agente |
| Tempo da primeira resposta | Tempo até o primeiro retorno ao cliente |
| SLA | Cumprimento de metas de tempo de atendimento |
| Clientes ativos | Clientes com interação recente |
| Agentes online | Agentes disponíveis no momento |
| Taxa de resolução | Percentual de atendimentos resolvidos |
| Conversões | Leads que viraram negócio/agendamento |
| Volume por período | Evolução do volume em um intervalo configurável |
| Atendimentos por agente | Distribuição de carga entre os agentes |

Todos os indicadores devem ser **atualizados em tempo real** sempre que possível, alimentando a Inbox e o Dashboard a partir das mesmas fontes de dados.

---

## Webhooks

O Convexo permite que **sistemas externos recebam eventos em tempo real** via Webhooks. Cada evento é disparado quando algo relevante acontece na plataforma, permitindo integrações com CRMs externos, BI, automações e notificações.

Eventos suportados (ou previstos) pela plataforma:

| Evento | Gatilho |
|---|---|
| `ticket.created` | Criação de um ticket |
| `ticket.updated` | Atualização de um ticket |
| `ticket.closed` | Fechamento de um ticket |
| `ticket.deleted` | Remoção de um ticket |
| `conversation.created` | Nova conversa iniciada (qualquer canal) |
| `conversation.closed` | Conversa encerrada |
| `conversation.assigned` | Conversa atribuída a um agente |
| `message.received` | Mensagem recebida de um cliente |
| `message.sent` | Mensagem enviada por um agente |
| `client.created` | Novo cliente cadastrado |
| `client.updated` | Dados do cliente atualizados |
| `appointment.created` | Novo agendamento criado |
| `appointment.updated` | Agendamento alterado |
| `notification.created` | Nova notificação gerada |

Exemplo de payload:

```json
{
  "event": "conversation.created",
  "tenant_id": 1,
  "timestamp": "2026-07-14T14:00:00Z",
  "data": {
    "conversation_id": 12,
    "channel": "website",
    "visitor": "Maria Teste"
  }
}
```

Os webhooks poderão ser **configurados individualmente por empresa** (no modelo Multi-Tenant), com URL e eventos selecionáveis por tenant.

---

## Integrações

O Convexo foi desenhado com **integrações abertas**, reunindo comunicação, calendários, dados, APIs e inteligência artificial.

### Comunicação

| Integração | Status |
|---|---|
| WhatsApp | ✅ Disponível (via gateway) |
| Gmail | 📋 Planejado |
| Outlook | 📋 Planejado |
| SMTP | ✅ Disponível (Google Apps Script) |
| IMAP | 🔄 Em desenvolvimento |

### Calendários

| Integração | Status |
|---|---|
| Google Calendar | 📋 Planejado |
| Outlook Calendar | 📋 Planejado |

### Banco de Dados

| Integração | Status |
|---|---|
| PostgreSQL | 🔄 Em desenvolvimento |
| SQLite | ✅ Disponível (desenvolvimento) |
| Redis | 📋 Planejado (cache/fila) |

### APIs

| Integração | Status |
|---|---|
| REST API | ✅ Disponível |
| Webhooks | 🔄 Em desenvolvimento |

### Inteligência Artificial

| Provedor | Status |
|---|---|
| OpenAI | ✅ Disponível (configurável via `LLM_PROVIDER`) |
| Gemini | ✅ Disponível (configurável via `LLM_PROVIDER`) |
| Ollama | ✅ Disponível (local, via `LLM_PROVIDER`) |
| Groq | ✅ Disponível (auto-resposta WhatsApp) |

Novas integrações poderão ser adicionadas futuramente, respeitando a arquitetura desacoplada da plataforma.

---

## Inteligência Artificial

O Convexo foi projetado para incorporar **recursos avançados de IA**, tornando o atendimento mais rápido, consistente e escalável. Atualmente, o **auto-atendimento via IA no WhatsApp** já está operacional (ver seção *Assistente Virtual*).

Funcionalidades planejadas:

- Sugestão automática de respostas
- Resumo automático de conversas
- Análise de sentimento
- Classificação automática de tickets
- Priorização inteligente
- Detecção de intenção
- Extração automática de informações
- Pesquisa semântica
- Base de conhecimento
- RAG (Retrieval-Augmented Generation)
- Chatbot
- Assistente para agentes
- Respostas automáticas
- Análise de produtividade
- Insights de atendimento

Todos esses recursos utilizarão uma **arquitetura desacoplada**, permitindo diferentes provedores de IA (OpenAI, Gemini, Ollama, Groq) sem acoplamento ao core da plataforma.

---

## Segurança & Contas

- **Primeiro cadastro** cria o admin inicial (tela de registro).
- **Novos usuários** só podem ser criados por um admin (tela "Usuários", visível só para admin).
- **Tipos de conta**: `admin` (gestão completa) e `agent` (operação).
- **Política de senha**: mín. 8 caracteres, com maiúscula, minúscula e número.
- **Rate limit de login**: 5 tentativas falhas → bloqueio de 5 min (HTTP 429).
- **Tokens JWT** com expiração (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Redefinição de senha**: `/auth/forgot-password` gera um token (1h) e envia link por e-mail; `/auth/reset-password` aplica a nova senha e invalida o token.
- **Cabeçalhos de segurança**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e `Content-Security-Policy`. O CSP usado é `default-src 'self'` + `script-src`/`style-src` com `'unsafe-inline'` (necessário para o SPA e para o `<script>` inline do exemplo do widget) — **não use `default-src 'none'`, pois isso bloqueia o própio JS/CSS do app e a tela fica em branco**.

## Notificações

### Por e-mail

Ao criar um chamado (`POST /tickets`), o backend dispara e-mails HTML para **todos os usuários cadastrados** (admins e agentes), em background (`services/email.py`).

O envio é feito **sempre via Google Apps Script**: o backend faz um `POST` JSON `{to, subject, html, fromName?}` para a `EMAIL_GOOGLE_SCRIPT_URL` (um web app deployado que envia o e-mail via `GmailApp`). Se a URL não estiver configurada, o envio é ignorado silenciosamente (apenas log).

O formulário de e-mail do widget também usa esse mesmo caminho, enviando para o `contact_email` configurado na `WidgetConfig`.

### Push (navegador)

A página de **Chamados** (`frontend/src/pages/Tickets.tsx`) faz polling a cada 5s. Quando surge um **novo chamado**, ela exibe uma **notificação nativa do navegador** (via [`react-push-notification`](https://github.com/yetanotherreactlibrary/react-push-notification), usando a Notification API) e um toast in-app.

> Requer que a aba esteja aberta e que o usuário conceda permissão de notificação ao navegador. Não é push em segundo plano (VAPID/Service Worker) — para isso seria necessário um backend de push separado.

### Central in-app

Além do e-mail e do push do navegador, cada usuário tem um **centro de notificações persistido** no backend. Na criação de um chamado, é gerada uma notificação para **todos os usuários**.

- Ícone de **sino** no navbar com **contador de não lidas** (atualizado a cada 15s).
- **Dropdown** com a lista de notificações e ação **"Marcar todas como lidas"**; cada item pode ser marcado como lido (e leva ao link do chamado).

Endpoints (`routers/notifications.py`):

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/notifications` | Lista do usuário + `unread_count` |
| `POST` | `/notifications/{id}/read` | Marca uma como lida |
| `POST` | `/notifications/read-all` | Marca todas como lidas |

---

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

## Assistente Virtual (IA) no WhatsApp

O canal WhatsApp já conta com **auto-atendimento por IA**. Mensagens recebidas pelo gateway são encaminhadas ao backend (`POST /webhook`) e a resposta é gerada por `services/llm.py` (provedor configurável) e devolvida ao cliente via gateway. Qualquer mensagem de texto que **não seja uma opção numérica de menu** (1–7) é respondida diretamente pela IA — não é preciso passar pelo menu antes.

Fluxo:

```
WhatsApp → Gateway (Baileys, :3001) → POST /webhook (backend :8000)
                                 ↓
              whatsapp.process_menu()  →  texto que não é opção de menu (1–7) retorna ação "ai"
                                 ↓
              llm.generate_reply(texto, histórico)  →  provedor (Groq/OpenAI/Anthropic/Gemini/Ollama)
                                 ↓
              gateway /send (ou /send-buttons) → WhatsApp do cliente
```

- **Provedor**: selecionado por `LLM_PROVIDER` (`groq` | `openai` | `anthropic` | `gemini` | `ollama`). Cada provedor usa sua própria chave/modelo: `GROQ_PRIMARY_MODEL`, `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `GEMINI_MODEL` ou `OLLAMA_MODEL`.
- **Prompt de sistema** (`SYSTEM_PROMPT` em `services/llm.py`): o assistente atende **exclusivamente** produtos de software — **sites, web apps, aplicativos móveis, automações, aplicativos desktop, APIs e integrações** — com tom **formal e educado**, redirecionando gentilmente assuntos fora desse escopo e orientando a digitar `0` para falar com um humano/consultor.
- **Requisitos**: `API_GROQ` (chave Groq) e o gateway conectado (QR Code). Sem a chave, a IA informa indisponibilidade e mantém o menu.
- O histórico da conversa (tabela `conversations` do gateway) é enviado como contexto à IA, preservando a coerência do atendimento.

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
| `LLM_PROVIDER` | Provedor de IA: `groq` (padrão) \| `openai` \| `anthropic` \| `gemini` \| `ollama` |
| `API_GROQ` / `GROQ_PRIMARY_MODEL` | Chave e modelo Groq (ex.: `groq/compound-mini`) |
| `API_OPENAI` / `OPENAI_MODEL` | Chave e modelo OpenAI (ex.: `gpt-4o-mini`) |
| `API_ANTHROPIC` / `ANTHROPIC_MODEL` | Chave e modelo Anthropic (ex.: `claude-3-5-haiku-latest`) |
| `API_GEMINI` / `GEMINI_MODEL` | Chave (Google) e modelo Gemini (ex.: `gemini-1.5-flash`) |
| `API_OLLAMA` / `OLLAMA_MODEL` | (opcional) e modelo Ollama local (ex.: `llama3`); base `OLLAMA_BASE_URL` |

### Gateway

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão: 3001) |
| `WEBHOOK_URL` | Endpoint do backend para receber mensagens |
| `LOG_LEVEL` | Nível de log (info, debug, etc.) |


---

## Roadmap

Legenda: ✅ Disponível · 🔄 Em desenvolvimento · 📋 Planejado

### Plataforma

| Funcionalidade | Status |
|---|---|
| CRM | ✅ Disponível |
| Gestão de Clientes | ✅ Disponível |
| Tickets | ✅ Disponível |
| Agenda | ✅ Disponível |
| Dashboard | ✅ Disponível |
| Usuários | ✅ Disponível |

### Omnichannel

| Canal | Status |
|---|---|
| WhatsApp | ✅ Disponível |
| E-mail | ✅ Disponível |
| Widget | ✅ Disponível |

### IA

| Funcionalidade | Status |
|---|---|
| Respostas Inteligentes | 📋 Planejado |
| Chatbot | 🔄 Em desenvolvimento |
| Auto-resposta WhatsApp (Groq) | ✅ Disponível |
| RAG | 📋 Planejado |
| Base de Conhecimento | 📋 Planejado |
| Classificação de Tickets | 📋 Planejado |
| Análise de Sentimentos | 📋 Planejado |

### Produtividade

| Funcionalidade | Status |
|---|---|
| Automações | 📋 Planejado |
| Workflow Builder | 📋 Planejado |
| Regras | 📋 Planejado |
| Macros | ✅ Disponível |
| Respostas rápidas | ✅ Disponível |

### Plataforma (SaaS)

| Funcionalidade | Status |
|---|---|
| Marketplace | 📋 Planejado |
| Plugins | 📋 Planejado |
| Mobile | 📋 Planejado |
| Multi-Tenant | 📋 Planejado |
| Auditoria | 📋 Planejado |
| Logs | 📋 Planejado |

---

## Benefícios

- **Centralização do atendimento** em um único lugar.
- **Inbox unificada** para todos os canais.
- **Comunicação Omnichannel** (WhatsApp, E-mail, Chat do Site).
- **Escalabilidade** para crescer com o negócio.
- **Arquitetura modular** e desacoplada.
- **Preparado para SaaS**.
- **Preparado para Multi-Tenant**.
- **Integrações abertas** e extensíveis.
- **Webhooks** para eventos em tempo real.
- **Automações** para ganhar produtividade.
- **Preparado para IA** (sugestões, resumos, RAG, chatbot).
- **Widget incorporável** a qualquer site.
- **Alta segurança** (JWT, cabeçalhos, rate limit).
- **Arquitetura moderna** (FastAPI, React, Node/Baileys).
