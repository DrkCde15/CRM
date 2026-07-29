<div align="center">
  <img src="frontend/public/logo.png" alt="Mochi" width="300" />
</div>

# Mochi — Plataforma CRM Omnichannel

> O Mochi é uma **plataforma CRM Omnichannel** desenvolvida para centralizar o atendimento ao cliente em um único lugar. Empresas podem gerenciar conversas provenientes de **WhatsApp** e **E-mail**, além de controlar clientes, tickets, agendamentos, usuários, métricas e integrações por meio de uma única **Inbox inteligente**.
> 
> O projeto foi pensado para empresas de diversos portes — do pequeno negócio ao ambiente multiempresa (SaaS) — com arquitetura modular, escalável e preparada para Inteligência Artificial.

## Sumário

- [Estrutura](#estrutura)
- [Arquitetura Geral](#arquitetura-geral)
- [Arquitetura Multiempresa (Multi-Tenant)](#arquitetura-multiempresa-multi-tenant)
- [Canais de atendimento](#canais-de-atendimento)
- [Como rodar](#como-rodar)

- [Layout Responsivo](#layout-responsivo)
- [Automações](#automações)
- [Inbox unificada](#inbox-unificada)
- [Dashboard Executivo](#dashboard-executivo)
- [Webhooks](#webhooks)
- [Integrações](#integrações)
- [Inteligência Artificial](#inteligência-artificial)
- [Servidores MCP (Model Context Protocol)](#servidores-mcp-model-context-protocol)
- [Tarefas Agendadas (Scheduler)](#tarefas-agendadas-scheduler)
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
│   ├── models/       # SQLAlchemy models (User, Client, Ticket, MCPServer, ScheduledJob, etc.)
│   ├── routers/      # Endpoints (auth, clients, tickets, appointments, stats, webhook, email_channel, inbox, ai, calendar, sla, notifications, etc.)
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Lógica de negócio
│   │   ├── email.py           # Envio de e-mail via Google Apps Script
│   │   ├── llm.py             # Provedores de IA (Groq, OpenAI, Anthropic, Gemini, Ollama)
│   │   ├── agent_manager.py   # Gerenciamento de agentes IA
│   │   ├── mcp_manager.py     # Servidores MCP via Docker ou in-memory
│   │   ├── scheduler.py       # Tarefas agendadas (SLA, lembretes, limpeza)
│   │   ├── notifier.py        # Notificações in-app multicamada
│   │   ├── sla.py             # Verificação de SLA
│   │   └── document_processor.py, realtime.py, etc.
│   └── tests/        # Testes (pytest)
├── frontend/         # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── core/         # Types, utils, hooks, services, UI kit, layout
│       │   └── components/layout/
│       │       ├── AppShell.tsx      # Shell responsivo com Sidebar apenas
│       │       ├── Sidebar.tsx       # Navegação principal (drawer/overlay)
│       │       └── PageHeader.tsx    # Título + descrição + ações
│       ├── pages/        # Dashboard, Inbox, Tickets, Appointments, Automations, CalendarSettings, Channels, Users
│       ├── modules/      # AI (chat, MCP, agentes), Documents
│       └── api.ts, store.ts, types.ts
└── gateway/          # Gateway WhatsApp (Node.js + Baileys)
    ├── index.js      # Servidor Express + Baileys WebSocket
    └── .env.example
```

---

## Arquitetura Geral

O Mochi organiza todo o ecossistema de atendimento em camadas, da empresa até a inteligência artificial:

```
Empresa
   ↓
Mochi
   ↓
Inbox Unificada
   ↓
WhatsApp
   ↓
E-mail
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

O sistema já implementa isolamento lógico **Multi-Tenant**: cada empresa (tenant) possui seu próprio ambiente isolado por `company_id`. Cada tenant concentra:

- Usuários
- Clientes
- Conversas
- Tickets
- Agendamentos
- Configurações
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

Empresa B
├── Usuários
├── Clientes
├── Tickets
├── WhatsApp
├── E-mail
```

O modo Multi-Tenant está **ativo**: todo o acesso a dados (usuários, clientes, tickets, agendamentos, conversas, respostas rápidas, canais e métricas) é filtrado por `company_id = user.company_id` nos routers. A `Company` padrão (`id=1`, `"Empresa Padrão"`) é criada automaticamente no primeiro cadastro. A criação de novas empresas via auto-cadastro (signup que gera seu próprio tenant) e convites permanecem no **roadmap**.

---

## Canais de atendimento

| Canal | Origem | Como aparece no CRM |
|---|---|---|
| **WhatsApp** | Gateway Node (Baileys) | Tabela `conversations` → Inbox (canal `whatsapp`) |
| **E-mail** | Conta IMAP/SMTP ou Google Apps Script | Tabela `email_conversations` → Inbox (canal `email`) |

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
uvicorn main:app --reload --host localhost --port 8000   # http://localhost:8000  (docs em /docs)
```

Variáveis mínimas em `backend/.env`:
- `SECRET_KEY` — gere com `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `ALLOWED_ORIGINS` — lista de origens CORS. Inclua `http://localhost:5173` (frontend), `http://localhost:3000` e `http://localhost:8000`.
- `EMAIL_GOOGLE_SCRIPT_URL` + `EMAIL_GOOGLE_SCRIPT_SECRET` — necessárias para envio de e-mails (tickets, reset de senha). Sem elas, o envio é ignorado (apenas log).
- `FRONTEND_URL` — usada nos links de redefinição de senha (padrão `http://localhost:5173`).

O cadastro pela tela de Registro é **aberto a qualquer pessoa** (sem restrição de admin).

> ⚠️ **Para manter o backend rodando em background no WSL**, use `tmux` ou `screen`:
> ```bash
> tmux new-session -d -s mochi "cd backend && .venv-linux/bin/uvicorn main:app --host 0.0.0.0 --port 8000"
> ```
> Em produção, use systemd, supervisor ou um proxy reverso (nginx).

> 💡 **Rodar só com o backend:** o `main.py` serve automaticamente o build do frontend (`frontend/dist`). Assim, basta `uvicorn main:app --reload --host localhost --port 8000` para operar toda a plataforma em **um único processo** — o gateway de WhatsApp continua opcional. Para isso, gere o build uma vez:
> ```bash
> cd frontend && npm install && npm run build
> ```
> Acesse `http://localhost:8000/` (API e app ficam na mesma origem; o `VITE_API_URL` pode ficar vazio).
>
> Limitação: deep-links diretos para rotas autenticadas (`/inbox`, `/tickets`, etc.) enquanto deslogado retornam o `401` da API em vez do app — navegue pelo app após o login. Em produção, sirva o SPA atrás de um proxy reverso com fallback para `index.html`.

> Na subida, o backend valida o `.env` (via `settings.validate()`) e emite **warnings** no log se faltarem `SECRET_KEY`, `DATABASE_URL`, `ALLOWED_ORIGINS` ou `API_GROQ` (quando `LLM_PROVIDER=groq`). Corrija-os antes de usar em produção.

### 2. Frontend (SPA — servido pelo backend)

O frontend é compilado e servido pelo próprio FastAPI:

```bash
cd frontend
npm install
npm run build                     # gera dist/ (servido em http://localhost:8000/)
```

> Para desenvolvimento com hot-reload, rode `npm run dev` em paralelo em http://localhost:5173 e configure `VITE_API_URL=http://localhost:8000/api`.

### 3. Docker (opcional — para MCP Servers)

Se quiser rodar servidores MCP via containers:

```bash
# Inicie o daemon Docker (se não estiver rodando)
wsl -u root bash -c 'dockerd --iptables=false &'

# O backend detecta Docker automaticamente na inicialização.
# Sem Docker, o MCP Manager roda em modo in-memory.
```

> O backend usa `docker-py` para gerenciar o ciclo de vida dos containers MCP (pull, run, stop, restart, remove). Configure o servidor MCP na interface com uma imagem Docker e o backend tratará do resto.

### 4. Gateway WhatsApp (opcional — porta 3001)

```bash
cd gateway
npm install
cp .env.example .env              # edite WEBHOOK_URL (ponte para o backend)
node index.js                     # escaneie o QR code com o WhatsApp
```

> O frontend se comunica com o backend em `http://localhost:8000` (configure `VITE_API_URL` para outro endereço). O gateway é independente e só é necessário se quiser o canal WhatsApp.



## Inbox unificada

Todos os canais aparecem numa única lista (`frontend/src/pages/Inbox.tsx`), com auto-refresh a cada 6s e filtro por canal.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/inbox?channel=whatsapp\|email&include_archived=` | Lista unificada (`InboxItem`: canal, assunto, última mensagem, status, `ticket_id`, `client_tipo`, `read`, `archived`) |
| `GET` | `/inbox/channels` | Status de quais canais estão configurados |
| `GET` | `/inbox/gateway-status` | Status da conexão WhatsApp via gateway (`{connected, detail}`) |
| `PATCH` | `/inbox/whatsapp/{id}/read` | Marca a conversa como lida |
| `PATCH` | `/inbox/whatsapp/{id}/archive` | Arquiva a conversa |
| `PATCH` | `/inbox/whatsapp/{id}/unarchive` | Development arquivamento |

- **WhatsApp** → lê `conversations`.
- **E-mail** → lê `email_conversations` (com `emailChannel.conversation` para o detalhe e resposta por e-mail).

Ao responder no canal **E-mail**, usa `emailChannel.send` (requer uma `EmailAccount` ativa).

### Indicadores e ações na Inbox

- **Tipo do lead** (`Empresa`/`Pessoa`): definido pelo bot no 1º contato (salvo em `client.dados["tipo"]`) e exibido como badge na Inbox e na lista de Clientes.
- **Não lida / lida**: conversas WhatsApp recebidas entram como *não lidas*; o agente marca como lida (`PATCH .../read`). Itens não lidos aparecem em destaque.
- **Arquivar**: `PATCH .../archive` (e `.../unarchive`); arquivadas são ocultadas por padrão (`GET /inbox?include_archived=true` para revelá-las).
- **Status do gateway WhatsApp**: `GET /inbox/gateway-status` retorna `{connected, detail}` (proxy do `/health` do gateway) e alimenta o indicador no navbar.

---

## Layout Responsivo

O Mochi usa **Sidebar como navegação principal** (sem Topbar/Header global). O layout adapta-se a três breakpoints:

| Dispositivo | Comportamento |
|---|---|
| **Desktop** (≥1024px) | Sidebar fixa à esquerda, conteúdo à direita |
| **Tablet** (768-1023px) | Sidebar colapsável com botão hamburger |
| **Mobile** (<768px) | Sidebar em drawer com overlay escuro, hamburger no topo |

Componentes:
- **`AppShell.tsx`** — shell responsivo que gerencia estado da sidebar e animações.
- **`Sidebar.tsx`** — navegação agrupada (Principal, Inteligência Artificial, Ferramentas, Administração), indicador ativo com barra animada, alternador de tema escuro/claro e botão de logout.
- **`PageHeader.tsx`** — componente reutilizável com título, descrição e slot de ações, usado em todas as páginas.

---

## Automações

Página central (`/automations`) que reúne ferramentas de automação em cards:

| Card | Descrição |
|---|---|
| **Workflows** | Editor visual de fluxos de automação |
| **SLA** | Metas e violações de tempo de atendimento |
| **Webhooks** | Eventos enviados para sistemas externos |
| **Tarefas Agendadas** | Jobs periódicos (SLA, lembretes, limpeza) |

---

## Clientes

Gestão de clientes (por empresa). O bot qualifica o lead como **Empresa** ou **Pessoa** no primeiro contato e isso é persistido em `dados["tipo"]`.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/clients` | Lista paginada; aceita `search` (nome/telefone) e `skip`/`limit` |
| `GET` | `/clients/export?search=` | Exporta os clientes filtrados em CSV (`clientes.csv`) |
| `GET` | `/clients/{id}` | Detalhe (inclui `tipo`) |
| `PUT` | `/clients/{id}/name` | Atualiza o nome |
| `GET` | `/clients/{id}/conversations` | Histórico de conversas do cliente |

---

## Respostas Rápidas & Macros

O Mochi inclui **Respostas Rápidas** e **Macros** — respostas pré-definidas para agilizar o atendimento na Inbox (sem necessidade de IA).

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

O Mochi conta com um **Dashboard** voltado à gestão e à tomada de decisão, reunindo os principais indicadores de atendimento e operação.

Indicadores disponíveis ou planejados:

| Indicador | Descrição |
|---|---|
| Conversas por canal | Volume de atendimentos dividido por WhatsApp e E-mail |
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

O Mochi permite que **sistemas externos recebam eventos em tempo real** via Webhooks. Cada evento é disparado quando algo relevante acontece na plataforma, permitindo integrações com CRMs externos, BI, automações e notificações.

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
    "channel": "whatsapp",
    "client": "Maria Teste"
  }
}
```

Os webhooks poderão ser **configurados individualmente por empresa** (no modelo Multi-Tenant), com URL e eventos selecionáveis por tenant.

---

## Integrações

O Mochi foi desenhado com **integrações abertas**, reunindo comunicação, calendários, dados, APIs e inteligência artificial.

### Comunicação

| Integração | Status |
|---|---|
| WhatsApp | ✅ Disponível (via gateway) |
| Gmail | 📋 Planejado |
| Outlook | 📋 Planejado |
| SMTP | ✅ Disponível (envio de e-mail via Google Apps Script) |
| IMAP | 🔄 Em desenvolvimento |

### Calendários / Tarefas

| Integração | Status |
|---|---|
| Tarefas Agendadas (scheduler interno) | ✅ Disponível |
| Google Calendar | Substituído por scheduler interno |
| Outlook Calendar | 📋 Planejado |

### Banco de Dados

| Integração | Status |
|---|---|
| PostgreSQL | 🔄 Em desenvolvimento |
| SQLite | ✅ Disponível (desenvolvimento) |
| Redis | 📋 Planejado (cache/fila) |

### MCP / Docker

| Integração | Status |
|---|---|
| Docker SDK (gerenciamento de containers) | ✅ Disponível |
| MCP Servers | ✅ Disponível |

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

O Mochi foi projetado para incorporar **recursos avançados de IA**, tornando o atendimento mais rápido, consistente e escalável. Atualmente, o **auto-atendimento via IA no WhatsApp** já está operacional (ver seção *Assistente Virtual*).

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

## Servidores MCP (Model Context Protocol)

O Mochi gerencia servidores MCP via **Docker** (ou modo in-memory quando Docker não está disponível) para estender as capacidades da IA com ferramentas externas.

### Ciclo de vida do container

| Ação | Descrição |
|---|---|
| **Criar** | `docker pull` da imagem → `docker run` com env vars e porta mapeada |
| **Reiniciar** | `docker restart` no container |
| **Excluir** | `docker stop` + `docker rm` + registro removido do banco |
| **Ativar/Desativar** | Alterna o estado `enabled` no banco (não afeta o container) |

### Modelo `MCPServer`

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome do servidor |
| `image` | string | Imagem Docker (ex: `ghcr.io/my-org/mcp-server`) |
| `serverUrl` | string | URL externa (alternativa ao Docker) |
| `port` | int | Porta mapeada |
| `containerName` | string | Nome do container no Docker |
| `containerId` | string | ID do container |
| `status` | `running` / `stopped` / `error` | Estado atual |
| `envVars` | dict | Variáveis de ambiente |
| `type` | string | Tipo (github, postgresql, custom, etc.) |

### Fallback

Se o Docker daemon não estiver disponível no WSL, o `mcp_manager` opera **em modo in-memory**: os servidores são salvos no banco, mas containers não são criados.

Endpoints (`/api/ai/mcp`):

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/mcp` | Lista servidores |
| `POST` | `/mcp` | Cria servidor (com imagem, porta, env vars) |
| `PUT` | `/mcp/{id}` | Atualiza configuração |
| `DELETE` | `/mcp/{id}` | Remove do banco e container |
| `POST` | `/mcp/{id}/restart` | Reinicia o container |

---

## Tarefas Agendadas (Scheduler)

Substitui o Google Calendar por um sistema interno de **jobs periódicos** usando a biblioteca Python `schedule`.

### Jobs padrão

| Job | Intervalo | Descrição |
|---|---|---|
| `sla_check` | 5 min | Verifica SLA de todos os tickets abertos |
| `appointment_reminder` | 30 min | Notifica usuários sobre agendamentos próximos |
| `cleanup` | 24 h | Remove registros antigos |

### Modelo `ScheduledJob`

Cada job é persistido no banco com tipo, intervalo, última execução e empresa associada. A página **Tarefas Agendadas** (`/calendar` renomeada) permite criar, editar e executar jobs manualmente.

### Notificações

Jobs de SLA e lembretes disparam notificações in-app via `services/notifier.py`:

- **`notify_company(company_id, title, body, link)`** — notifica todos os usuários da empresa
- **`notify_user(user_id, title, body, link)`** — notifica um usuário específico

As notificações são persistidas na tabela `Notification` e entregues em tempo real via WebSocket.

---

## Segurança & Contas

- **Cadastro** aberto a qualquer pessoa (sem restrição de admin).
- **Tipos de conta**: `admin` (gestão completa) e `agent` (operação). Usuários admin podem gerenciar outros usuários na tela "Usuários".
- **Política de senha**: mín. 8 caracteres, com maiúscula, minúscula e número.
- **Rate limit de login**: 5 tentativas falhas → bloqueio de 5 min (HTTP 429).
- **Tokens JWT** sem expiração.
- **Redefinição de senha**: `/auth/forgot-password` gera um token (1h) e envia link por e-mail; `/auth/reset-password` aplica a nova senha e invalida o token.
- **Cabeçalhos de segurança**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e `Content-Security-Policy`. O CSP usado é `default-src 'self'` + `script-src`/`style-src` com `'unsafe-inline'` — **não use `default-src 'none'`, pois isso bloqueia o própio JS/CSS do app e a tela fica em branco**.

## Notificações

### Por e-mail

Ao criar um chamado (`POST /tickets`), o backend dispara e-mails HTML para **todos os usuários da empresa** (multitenant), em background (`services/email.py`).

O envio é feito **sempre via Google Apps Script**: o backend faz um `POST` JSON `{to, subject, html, fromName?}` para a `EMAIL_GOOGLE_SCRIPT_URL` (um web app deployado que envia o e-mail via `GmailApp`). Se a URL não estiver configurada, o envio é ignorado silenciosamente (apenas log).

### Push (navegador)

A página de **Chamados** (`frontend/src/pages/Tickets.tsx`) atualiza em **tempo real** (via WebSocket `/ws`): quando surge um **novo chamado** ou muda seu status, ela exibe uma **notificação nativa do navegador** (via [`react-push-notification`](https://github.com/yetanotherreactlibrary/react-push-notification), usando a Notification API) e um toast in-app.

> Requer que a aba esteja aberta e que o usuário conceda permissão de notificação ao navegador. Não é push em segundo plano (VAPID/Service Worker) — para isso seria necessário um backend de push separado.

### Central in-app

Cada usuário tem um **centro de notificações persistido** no backend, gerenciado por `services/notifier.py`. As notificações são geradas automaticamente por:

- Criação/atualização de chamados
- Violação de SLA (via scheduler)
- Lembretes de agendamento (via scheduler)

O `notifier.py` expõe duas funções principais:

- **`notify_company(company_id, title, body, link)`** — notifica **todos os usuários** de uma empresa (multitenant).
- **`notify_user(user_id, title, body, link)`** — notifica um usuário específico.

- Ícone de **sino** no sidebar com **contador de não lidas**.
- **Dropdown** com a lista de notificações e ação **"Marcar todas como lidas"**; cada item pode ser marcado como lido (e leva ao link do recurso).
- **Tempo real via WebSocket**: o backend empurra eventos (`{type:"refresh", resource}`) para os clientes conectados em `/ws?token=<JWT>`. O frontend escuta e re-busca o recurso afetado, substituindo o polling. Reconexão automática a cada ~3s.

Endpoints (`routers/notifications.py`):

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/notifications` | Lista do usuário + `unread_count` |
| `POST` | `/notifications/{id}/read` | Marca uma como lida |
| `POST` | `/notifications/read-all` | Marca todas como lidas |

---

## Gateway WhatsApp

Microserviço Node.js que conecta o Mochi ao WhatsApp via [Baileys](https://github.com/WhiskeySockets/Baileys) (WebSocket não-oficial).

```
WhatsApp <──> Gateway (porta 3001) <──> Backend Mochi (porta 8000)
```

- **Entrada** (WhatsApp → Mochi): mensagens recebidas via WebSocket são enfileiradas e enviadas via webhook (`POST /webhook`) para o backend.
- **Saída** (Mochi → WhatsApp): backend chama as APIs REST do gateway para enviar mensagens.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status da conexão WhatsApp |
| `POST` | `/send` | Enviar texto |
| `POST` | `/send-buttons` | Enviar botões interativos |
| `POST` | `/send-image` | Enviar imagem |

Recursos: reconexão automática, retry com backoff no webhook, suporte a texto/imagem/áudio, persistência de sessão e rate limit de 30 req/min.

---

## Assistente Virtual (IA) no WhatsApp

O canal WhatsApp já conta com **auto-atendimento por IA**. Mensagens recebidas pelo gateway são encaminhadas ao backend (`POST /webhook`) e a resposta é gerada por `services/llm.py` (provedor configurável) e devolvida ao cliente via gateway.

Ao iniciar o contato, o bot qualifica o lead com um menu rápido (**1 Empresa / 2 Pessoa**), guardando a escolha em `client.dados["tipo"]`, e só então apresenta o menu principal. Qualquer mensagem de texto posterior que **não seja uma opção numérica de menu** (1–7) é respondida diretamente pela IA — não é preciso passar pelo menu antes.

Fluxo:

```
WhatsApp → Gateway (Baileys, :3001) → POST /webhook (backend :8000)
                                 ↓
              whatsapp.process_menu()  →  (1º contato) pergunta Empresa/Pessoa → guarda em dados["tipo"]
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
| `ALLOWED_ORIGINS` | Origens CORS (inclua 5173, 3000, 8000) |
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

### IA

| Funcionalidade | Status |
|---|---|
| Chat IA (múltiplos provedores) | ✅ Disponível |
| Agentes de IA configuráveis | ✅ Disponível |
| Auto-resposta WhatsApp (Groq) | ✅ Disponível |
| Servidores MCP (Docker) | ✅ Disponível |
| Respostas Inteligentes | 📋 Planejado |
| Chatbot | 🔄 Em desenvolvimento |
| RAG | 📋 Planejado |
| Base de Conhecimento | 📋 Planejado |
| Classificação de Tickets | 📋 Planejado |
| Análise de Sentimentos | 📋 Planejado |

### Produtividade

| Funcionalidade | Status |
|---|---|
| Automações | ✅ Disponível |
| Workflow Builder | 📋 Planejado |
| SLA | ✅ Disponível |
| Tarefas Agendadas | ✅ Disponível |
| Macros | ✅ Disponível |
| Respostas rápidas | ✅ Disponível |

### Infraestrutura

| Funcionalidade | Status |
|---|---|
| Docker (MCP containers) | ✅ Disponível |
| Notificações in-app + WebSocket | ✅ Disponível |
| Layout responsivo (Sidebar) | ✅ Disponível |
| Tema escuro/claro | ✅ Disponível |

### Plataforma (SaaS)

| Funcionalidade | Status |
|---|---|
| Marketplace | 📋 Planejado |
| Plugins | 📋 Planejado |
| Mobile | 📋 Planejado |
| Multi-Tenant (isolamento por `company_id`) | ✅ Disponível |
| Auditoria | 📋 Planejado |
| Logs | 📋 Planejado |

---

## Benefícios

- **Centralização do atendimento** em um único lugar.
- **Inbox unificada** para todos os canais.
- **Comunicação Omnichannel** (WhatsApp, E-mail).
- **Escalabilidade** para crescer com o negócio.
- **Arquitetura modular** e desacoplada.
- **Preparado para SaaS**.
- **Preparado para Multi-Tenant**.
- **Integrações abertas** e extensíveis.
- **Webhooks** para eventos em tempo real.
- **Automações** para ganhar produtividade.
- **Preparado para IA** (sugestões, resumos, RAG, chatbot).
- **Alta segurança** (JWT, cabeçalhos, rate limit).
- **Arquitetura moderna** (FastAPI, React, Node/Baileys).
