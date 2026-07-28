import logging
from typing import Any

logger = logging.getLogger("mochi.agents")

DEFAULT_AGENTS = [
    {
        "id": "assistente",
        "name": "Assistente Geral",
        "description": "Assistente principal capaz de ajudar em qualquer area do sistema",
        "provider": "groq",
        "model": "groq/compound-mini",
        "systemPrompt": "Voce e o assistente inteligente do Mochi, uma plataforma empresarial. Ajude o usuario com analises, consultas, geracao de conteudo e tarefas administrativas.",
        "temperature": 0.7,
        "tools": ["query", "document", "analyze", "search"],
        "enabled": True,
    },
    {
        "id": "comercial",
        "name": "Assistente Comercial",
        "description": "Especialista em vendas, funil comercial e prospeccao",
        "provider": "groq",
        "model": "groq/compound-mini",
        "systemPrompt": "Voce e um especialista em vendas do Mochi. Ajude a analisar oportunidades, sugerir abordagens, qualificar leads e otimizar o funil de vendas.",
        "temperature": 0.8,
        "tools": ["query", "crm", "analytics", "email"],
        "enabled": True,
    },
    {
        "id": "atendimento",
        "name": "Assistente de Atendimento",
        "description": "Especialista em atendimento ao cliente e suporte",
        "provider": "groq",
        "model": "groq/compound-mini",
        "systemPrompt": "Voce e um especialista em atendimento ao cliente. Ajude a resolver duvidas, sugerir respostas, analisar tickets e melhorar a experiencia do cliente.",
        "temperature": 0.6,
        "tools": ["query", "ticket", "email", "document"],
        "enabled": True,
    },
    {
        "id": "financeiro",
        "name": "Assistente Financeiro",
        "description": "Especialista em financas, fluxo de caixa e relatorios",
        "provider": "groq",
        "model": "groq/compound-mini",
        "systemPrompt": "Voce e um especialista financeiro. Ajude com analises de custos, projecoes financeiras e relatorios gerenciais.",
        "temperature": 0.5,
        "tools": ["query", "analytics", "document"],
        "enabled": False,
    },
    {
        "id": "marketing",
        "name": "Assistente de Marketing",
        "description": "Especialista em marketing digital e campanhas",
        "provider": "groq",
        "model": "groq/compound-mini",
        "systemPrompt": "Voce e um especialista em marketing digital. Ajude com estrategias de conteudo, campanhas e analises de metricas.",
        "temperature": 0.8,
        "tools": ["query", "analytics", "email", "document"],
        "enabled": False,
    },
    {
        "id": "rh",
        "name": "Assistente de RH",
        "description": "Especialista em recursos humanos e gestao de pessoas",
        "provider": "groq",
        "model": "groq/compound-mini",
        "systemPrompt": "Voce e um especialista em RH. Ajude com recrutamento, avaliacoes e gestao de talentos.",
        "temperature": 0.7,
        "tools": ["query", "document"],
        "enabled": False,
    },
    {
        "id": "administrativo",
        "name": "Assistente Administrativo",
        "description": "Especialista em tarefas administrativas e organizacao",
        "provider": "groq",
        "model": "groq/compound-mini",
        "systemPrompt": "Voce e um assistente administrativo. Ajude com organizacao, documentos e tarefas do dia a dia.",
        "temperature": 0.6,
        "tools": ["query", "document", "automation"],
        "enabled": False,
    },
]


class AgentManager:
    def __init__(self):
        self._agents: list[dict] = list(DEFAULT_AGENTS)

    def list_agents(self) -> list[dict]:
        return self._agents

    def get_agent(self, agent_id: str) -> dict | None:
        for a in self._agents:
            if a["id"] == agent_id:
                return a
        return None

    def update_agent(self, agent_id: str, updates: dict) -> dict | None:
        for i, a in enumerate(self._agents):
            if a["id"] == agent_id:
                self._agents[i].update(updates)
                return self._agents[i]
        return None

    def get_system_prompt(self, agent_id: str) -> str:
        agent = self.get_agent(agent_id)
        if agent:
            return agent.get("systemPrompt", "")
        return "Voce e um assistente util do Mochi."

    def get_tools(self, agent_id: str) -> list[str]:
        agent = self.get_agent(agent_id)
        return agent.get("tools", []) if agent else []


agent_manager = AgentManager()
