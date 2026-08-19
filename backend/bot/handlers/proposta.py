# Geração automatizada de propostas de orçamento com a IA (Groq)
from handlers.ai import ask_ai

PROPOSTA_SYSTEM_PROMPT = """Você é o comercial de uma startup brasileira de tecnologia (NEXA TECH / RYOTECH) especializada em software sob medida: sites, aplicativos, automações, design/UX, dados, dashboards e APIs.

Sua tarefa: com base no *título* e na *descrição* do pedido de um cliente, redigir uma PROPOSTA COMERCIAL inicial, objetiva e persuasiva, formatada para WhatsApp.

REGRAS:
- Responda em português brasileiro.
- Use formatação WhatsApp (*negrito* para títulos e ênfase, emoji leve).
- Seja curto: no máximo 5 parágrafos/blocos.
- Estruture em: *Resumo da solução*, *Escopo sugerido* (tópicos), *Etapas*, *Prazo estimado* (faixa) e *Próximos passos*.
- NÃO invente valores exatos de investimento: forneça apenas uma *faixa de investimento* qualitativa (ex: "a partir de R$ X" ou "sob consulta conforme escopo") e sugira reunião para fechar.
- Se faltarem dados (prazo, orçamento, público), proponha a coleta na reunião em vez de chutar.
- Tom profissional, consultivo e conversão-oriented (incentive agendar reunião/demo).
- Finalize com contato: contato@ryotech.com.br.

O cliente receberá esta proposta pelo WhatsApp logo após solicitar o orçamento."""


async def gerar_proposta(titulo: str, descricao: str, nome: str = '') -> str:
    # Monta o pedido e solicita a proposta à IA. Retorna texto formatado ou string vazia em caso de falha.
    chamada = (
        f"Título da demanda: {titulo}\n"
        f"Descrição do cliente: {descricao}\n"
    )
    if nome:
        chamada = f"Cliente: {nome}\n" + chamada
    chamada += "\nGere a proposta comercial inicial conforme as regras."

    try:
        proposta = await ask_ai(chamada, system_prompt=PROPOSTA_SYSTEM_PROMPT)
    except Exception:
        proposta = ''
    return proposta.strip() if proposta else ''
