import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from core.deps import get_current_user
from core.database import get_db
from core.config import settings
from services.llm import chat_completion
from services.agent_manager import agent_manager
from services import mcp_manager
from models.models import AIConversation, AIMessage, User

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
    serverUrl: str = ""
    type: str = "custom"
    enabled: bool = True
    image: str = ""
    port: int = 0
    envVars: dict[str, str] = {}


class MCPUpdate(BaseModel):
    name: str | None = None
    serverUrl: str | None = None
    type: str | None = None
    enabled: bool | None = None
    image: str | None = None
    port: int | None = None
    envVars: dict[str, str] | None = None


class AnalyzeRequest(BaseModel):
    text: str


class SuggestRequest(BaseModel):
    context: list[str] = []
    channel: str = "email"


def _format_message(msg: AIMessage) -> dict:
    return {
        "id": str(msg.id),
        "role": msg.role,
        "content": msg.content,
        "timestamp": msg.created_at.isoformat(),
    }


def _format_conversation(conv: AIConversation) -> dict:
    return {
        "id": conv.id,
        "title": conv.title,
        "agent": conv.agent,
        "messages": [_format_message(m) for m in conv.messages],
        "createdAt": conv.created_at.isoformat(),
        "updatedAt": conv.updated_at.isoformat(),
    }


@router.post("/chat")
async def chat(req: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    agent = agent_manager.get_agent(req.agent)
    system_prompt = agent.get("systemPrompt", "") if agent else ""

    conv_id = req.conversation_id
    if not conv_id:
        conv_id = f"conv_{datetime.now().timestamp()}"
        conv = AIConversation(id=conv_id, company_id=user.company_id, user_id=user.id, agent=req.agent)
        db.add(conv)
    else:
        conv = db.execute(select(AIConversation).where(
            AIConversation.id == conv_id,
            AIConversation.user_id == user.id,
        )).scalar_one_or_none()
        if not conv:
            conv = AIConversation(id=conv_id, company_id=user.company_id, user_id=user.id, agent=req.agent)
            db.add(conv)

    history = db.execute(
        select(AIMessage).where(AIMessage.conversation_id == conv_id).order_by(AIMessage.created_at.desc()).limit(10)
    ).scalars().all()
    history = list(reversed(history))

    messages = [{"role": "system", "content": system_prompt}] if system_prompt else []
    messages.extend({"role": m.role, "content": m.content} for m in history)
    messages.append({"role": "user", "content": req.message})

    user_msg = AIMessage(conversation_id=conv_id, role="user", content=req.message)
    db.add(user_msg)

    try:
        response = await chat_completion(messages=messages)
        assistant_msg = AIMessage(conversation_id=conv_id, role="assistant", content=response)
        db.add(assistant_msg)
    except Exception as e:
        logger.error(f"Erro no chat: {e}")
        response = "Desculpe, ocorreu um erro ao processar sua mensagem."
        assistant_msg = AIMessage(conversation_id=conv_id, role="assistant", content=response)
        db.add(assistant_msg)

    conv.title = user_msg.content[:50]
    conv.updated_at = datetime.now()
    db.commit()

    return {
        "response": response,
        "conversation_id": conv_id,
        "agent": req.agent,
    }


@router.get("/conversations")
async def list_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conversations = db.execute(
        select(AIConversation).where(AIConversation.user_id == user.id).order_by(AIConversation.updated_at.desc())
    ).scalars().all()
    return [_format_conversation(c) for c in conversations]


@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conv = db.execute(
        select(AIConversation).where(AIConversation.id == conv_id, AIConversation.user_id == user.id)
    ).scalar_one_or_none()
    if not conv:
        raise HTTPException(404, "Conversa nao encontrada")
    return _format_conversation(conv)


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conv = db.execute(
        select(AIConversation).where(AIConversation.id == conv_id, AIConversation.user_id == user.id)
    ).scalar_one_or_none()
    if not conv:
        raise HTTPException(404, "Conversa nao encontrada")
    db.delete(conv)
    db.commit()
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
    result = mcp_manager.update_client(client_id, updates)
    if result is None:
        return {"error": "Cliente nao encontrado"}, 404
    return result


@router.delete("/mcp/{client_id}")
async def delete_mcp(client_id: str, user=Depends(get_current_user)):
    ok = mcp_manager.delete_client(client_id)
    if not ok:
        return {"error": "Cliente nao encontrado"}, 404
    return {"ok": True}


@router.post("/mcp/{client_id}/restart")
async def restart_mcp(client_id: str, user=Depends(get_current_user)):
    result = mcp_manager.restart_client(client_id)
    if result is None:
        return {"error": "Cliente nao encontrado"}, 404
    return result


@router.post("/analyze")
async def analyze_text(body: AnalyzeRequest, user=Depends(get_current_user)):
    from services.document_processor import document_processor
    analysis = await document_processor.analyze_document(body.text)
    return analysis


SUGGEST_PROMPT = (
    "Você é um assistente de atendimento. Com base no histórico da conversa abaixo, "
    "gere 3 sugestões de resposta curtas e diretas para o agente. "
    "Retorne APENAS um array JSON com 3 strings, exatamente neste formato: "
    '["sugestão 1", "sugestão 2", "sugestão 3"]. '
    "Nenhum texto adicional fora do array. As sugestões devem ser em português."
)


@router.post("/suggest")
async def suggest_reply(body: SuggestRequest, user=Depends(get_current_user)):
    context_text = "\n".join(body.context[-6:]) if body.context else "(nova conversa)"
    messages = [
        {"role": "system", "content": SUGGEST_PROMPT},
        {"role": "user", "content": f"Histórico da conversa:\n{context_text}"},
    ]
    try:
        raw = await chat_completion(messages=messages, tries=1)
        import json
        suggestions = json.loads(raw)
        if not isinstance(suggestions, list) or not all(isinstance(s, str) for s in suggestions):
            suggestions = []
    except Exception:
        suggestions = []
    return {"suggestions": suggestions[:3]}


@router.post("/classify")
async def classify_message(body: AnalyzeRequest, user=Depends(get_current_user)):
    from services.llm import classify_message
    result = await classify_message(body.text)
    return result


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
