import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.deps import get_current_user
from core.config import settings
from services.llm import chat_completion
from services.agent_manager import agent_manager
from services.mcp_manager import mcp_manager

logger = logging.getLogger("mochi.ai")
router = APIRouter(prefix="/api/ai", tags=["AI"])


class ChatRequest(BaseModel):
    conversation_id: str = ""
    message: str
    agent: str = "assistente"


class AgentUpdate(BaseModel):
    enabled: bool | None = None
    temperature: float | None = None
    systemPrompt: str | None = None


class MCPCreate(BaseModel):
    name: str
    serverUrl: str
    type: str = "custom"
    enabled: bool = True
    config: dict[str, Any] = {}


class MCPUpdate(BaseModel):
    name: str | None = None
    serverUrl: str | None = None
    type: str | None = None
    enabled: bool | None = None
    config: dict[str, Any] | None = None


class AnalyzeRequest(BaseModel):
    text: str


_conversations: dict[str, list[dict]] = {}


@router.post("/chat")
async def chat(req: ChatRequest, user=Depends(get_current_user)):
    agent = agent_manager.get_agent(req.agent)
    system_prompt = agent.get("systemPrompt", "") if agent else ""

    conv_id = req.conversation_id or f"conv_{datetime.now().timestamp()}"
    if conv_id not in _conversations:
        _conversations[conv_id] = []

    history = _conversations[conv_id][-10:]
    messages = [{"role": "system", "content": system_prompt}] if system_prompt else []
    messages.extend(history)
    messages.append({"role": "user", "content": req.message})

    try:
        response = await chat_completion(messages=messages)
        _conversations[conv_id].append({"role": "user", "content": req.message})
        _conversations[conv_id].append({"role": "assistant", "content": response})
    except Exception as e:
        logger.error(f"Erro no chat: {e}")
        response = "Desculpe, ocorreu um erro ao processar sua mensagem."

    return {
        "response": response,
        "conversation_id": conv_id,
        "agent": req.agent,
    }


@router.get("/conversations")
async def list_conversations(user=Depends(get_current_user)):
    return [
        {
            "id": cid,
            "title": msgs[0].get("content", "Nova conversa")[:50] if msgs else "Nova conversa",
            "messages": msgs,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
        }
        for cid, msgs in _conversations.items()
    ]


@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, user=Depends(get_current_user)):
    messages = _conversations.get(conv_id, [])
    return {
        "id": conv_id,
        "title": messages[0].get("content", "Conversa")[:50] if messages else "Conversa",
        "messages": [
            {
                "id": str(i),
                "role": m["role"],
                "content": m["content"],
                "timestamp": datetime.now().isoformat(),
            }
            for i, m in enumerate(messages)
        ],
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
    }


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, user=Depends(get_current_user)):
    _conversations.pop(conv_id, None)
    return {"ok": True}


@router.get("/agents")
async def list_agents(user=Depends(get_current_user)):
    return agent_manager.list_agents()


@router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, body: AgentUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = agent_manager.update_agent(agent_id, updates)
    if result is None:
        return {"error": "Agente nao encontrado"}, 404
    return result


@router.get("/mcp")
async def list_mcp(user=Depends(get_current_user)):
    return mcp_manager.list_clients()


@router.post("/mcp")
async def create_mcp(body: MCPCreate, user=Depends(get_current_user)):
    return mcp_manager.create_client(body.model_dump())


@router.put("/mcp/{client_id}")
async def update_mcp(client_id: str, body: MCPUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = mcp_manager.update_client(client_id, updates)
    if result is None:
        return {"error": "Cliente nao encontrado"}, 404
    return result


@router.post("/analyze")
async def analyze_text(body: AnalyzeRequest, user=Depends(get_current_user)):
    from services.document_processor import document_processor
    analysis = await document_processor.analyze_document(body.text)
    return analysis


@router.get("/insights")
async def get_insights(user=Depends(get_current_user)):
    return [
        {
            "id": "1",
            "type": "summary",
            "title": "Resumo do dia",
            "description": "Voce teve 12 conversas hoje, 3 novos chamados e 2 agendamentos.",
            "module": "dashboard",
            "priority": "medium",
            "createdAt": datetime.now().isoformat(),
        },
        {
            "id": "2",
            "type": "alert",
            "title": "Chamados pendentes",
            "description": "Existem 5 chamados aguardando resposta ha mais de 24h.",
            "module": "tickets",
            "priority": "high",
            "createdAt": datetime.now().isoformat(),
        },
    ]
