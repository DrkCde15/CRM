# CRM — Sistema de Atendimento

CRM completo com gestão de clientes, conversas, chamados (tickets) e agendamentos, com integração WhatsApp.

## Estrutura

```
crm/
├── backend/          # API FastAPI (Python)
│   ├── core/         # Config, database, auth deps
│   ├── models/       # SQLAlchemy models
│   ├── routers/      # Endpoints (auth, clients, tickets, appointments, stats, webhook)
│   └── services/     # Lógica de negócio (integração Taky)
├── frontend/         # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── components/
│       ├── pages/      # Login, Inbox, Tickets, Appointments, Dashboard
│       ├── api.ts      # Axios client
│       ├── store.ts    # Zustand auth store
│       └── types.ts
└── gateway/          # Gateway WhatsApp (Node.js + Baileys)
    ├── index.js      # Servidor Express + Baileys WebSocket
    ├── package.json
    └── .env.example
```

## Como rodar

### Backend

```bash
cd crm/backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # edite as variáveis
uvicorn main:app --reload
```

### Frontend

```bash
cd crm/frontend
npm install
npm run dev
```

### Gateway (WhatsApp)

```bash
cd crm/gateway
npm install
cp .env.example .env     # edite WEBHOOK_URL
node index.js            # escaneie o QR code com o WhatsApp
```

## Gateway WhatsApp

Microserviço Node.js que conecta o CRM ao WhatsApp via [Baileys](https://github.com/WhiskeySockets/Baileys) (WebSocket não-oficial).

### Fluxo

```
WhatsApp <──> Gateway (porta 3001) <──> Backend CRM (porta 8000)
```

- **Entrada** (WhatsApp → CRM): mensagens recebidas via WebSocket são enfileiradas e enviadas via webhook (`POST /webhook`) para o backend
- **Saída** (CRM → WhatsApp): backend chama as APIs REST do gateway para enviar mensagens

### Endpoints do gateway

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status da conexão WhatsApp |
| `POST` | `/send` | Enviar texto |
| `POST` | `/send-buttons` | Enviar botões interativos |
| `POST` | `/send-image` | Enviar imagem |

### Funcionalidades

- Reconexão automática ao desconectar
- Retry com backoff exponencial no webhook (4 tentativas)
- Suporte a texto, imagem e áudio
- Persistência de sessão (QR code apenas no primeiro uso)
- Rate limit de 30 requisições/min nos endpoints de envio

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
