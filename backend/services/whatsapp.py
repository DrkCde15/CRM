from datetime import datetime

from sqlalchemy.orm import Session

from models.models import Appointment, Client, Conversation, Ticket


MENU = {
    "inicio": (
        "╔══════════════════════╗\n"
        "║       ATENDIMENTO     ║\n"
        "╚══════════════════════╝\n\n"
        "1 Informações\n"
        "2 Agendar horário\n"
        "3 Falar com o Bot 🤖\n"
        "4 Falar com atendente\n"
        "5 Abrir chamado 🎯\n"
        "6 Agendar reunião 📅\n"
        "7 Sair"
    ),
    "informacoes": "📌 *Horários:* Seg-Sex 8h-18h | Sáb 8h-12h\n📌 *Pagamento:* Cartão, PIX, Boleto\n📌 *Prazo:* até 3 dias úteis\n\nDigite 0 para o menu.",
    "agendar_nome": "Ótimo! Qual o seu nome?",
    "agendar_servico": "Qual serviço você precisa?",
    "agendar_data": "Qual data e hora? (ex: 25/12 14:00)",
    "agendar_confirmar": lambda d: f"Confirmar agendamento?\nNome: {d.get('nome')}\nServiço: {d.get('servico')}\nData: {d.get('data_hora')}\n\n1 Sim | 0 Cancelar",
    "agendamento_sucesso": "✅ Agendamento confirmado! Entraremos em contato.",
    "agendamento_cancelado": "Agendamento cancelado.",
    "falando_bot": "🤖 Modo bot ativado. Pergunte à vontade! (digite 0 para o menu)",
    "falando_atendente": "👤 Encaminhando para um atendente humano. Em breve alguém falará com você.",
    "chamado_titulo": "🎯 Qual o título do chamado?",
    "chamado_descricao": "Descreva o que você precisa:",
    "chamado_confirmar": lambda d: f"Confirmar chamado?\nTítulo: {d.get('titulo')}\nDescrição: {d.get('descricao')}\n\n1 Sim | 0 Cancelar",
    "chamado_sucesso": "✅ Chamado aberto! Acompanhe pelo nosso time.",
    "chamado_cancelado": "Chamado cancelado.",
    "reuniao_titulo": "📅 Assunto da reunião?",
    "reuniao_data": "Qual data e hora? (ex: 25/12 14:00)",
    "reuniao_confirmar": lambda d: f"Confirmar reunião?\nAssunto: {d.get('titulo')}\nData: {d.get('data_hora')}\n\n1 Sim | 0 Cancelar",
    "reuniao_sucesso": "✅ Reunião agendada! O time confirmará em breve.",
    "reuniao_cancelado": "Reunião cancelada.",
}


def get_menu_text(state: str, dados: dict | None = None) -> str:
    text = MENU.get(state, MENU["inicio"])
    if callable(text):
        return text(dados or {})
    return text


def process_menu(phone: str, text: str, client: Client, db: Session) -> tuple[str | None, dict | None]:
    t = text.strip()
    estado = client.estado

    if estado == "inicio":
        if t == "1":
            return _go(client, db, "informacoes")
        if t == "2":
            return _go(client, db, "agendar_nome")
        if t == "3":
            return _go(client, db, "falando_bot")
        if t == "4":
            return _go(client, db, "falando_atendente")
        if t == "5":
            return _go(client, db, "chamado_titulo")
        if t == "6":
            return _go(client, db, "reuniao_titulo")
        if t == "7":
            return "Obrigado pelo contato! 😊 Digite *Olá* quando precisar.", None
        return get_menu_text("inicio"), None

    if estado == "informacoes":
        if t == "0":
            return _go(client, db, "inicio")
        return get_menu_text("informacoes"), None

    if estado == "agendar_nome":
        _merge(client, db, {"nome": text})
        return _go(client, db, "agendar_servico")

    if estado == "agendar_servico":
        _merge(client, db, {"servico": text})
        return _go(client, db, "agendar_data")

    if estado == "agendar_data":
        _merge(client, db, {"data_hora": text})
        return _go(client, db, "agendar_confirmar", client.dados)

    if estado == "agendar_confirmar":
        if t == "1":
            _create_appointment(client, db)
            return _go(client, db, "inicio")
        return _go(client, db, "inicio")

    if estado == "falando_bot":
        if t in ("0", "menu", "inicio"):
            return _go(client, db, "inicio")
        return None, {"ai": True}

    if estado == "chamado_titulo":
        _merge(client, db, {"titulo": text})
        return _go(client, db, "chamado_descricao")

    if estado == "chamado_descricao":
        _merge(client, db, {"descricao": text})
        return _go(client, db, "chamado_confirmar", client.dados)

    if estado == "chamado_confirmar":
        if t == "1":
            _create_ticket(client, db, "chamado")
            return _go(client, db, "chamado_sucesso")
        return _go(client, db, "chamado_cancelado")

    if estado == "reuniao_titulo":
        _merge(client, db, {"titulo": text})
        return _go(client, db, "reuniao_data")

    if estado == "reuniao_data":
        _merge(client, db, {"data_hora": text})
        return _go(client, db, "reuniao_confirmar", client.dados)

    if estado == "reuniao_confirmar":
        if t == "1":
            _create_ticket(client, db, "reuniao")
            return _go(client, db, "reuniao_sucesso")
        return _go(client, db, "reuniao_cancelado")

    return get_menu_text("inicio"), None


def _go(client: Client, db: Session, estado: str, dados: dict | None = None):
    client.estado = estado
    if dados:
        client.dados = {**client.dados, **dados}
    elif estado == "inicio":
        client.dados = {}
    db.commit()
    return get_menu_text(estado, client.dados), None


def _merge(client: Client, db: Session, patch: dict) -> None:
    client.dados = {**client.dados, **patch}
    db.commit()


def _create_ticket(client: Client, db: Session, tipo: str) -> None:
    ticket = Ticket(
        client_id=client.id,
        titulo=client.dados.get("titulo", ""),
        descricao=client.dados.get("descricao", ""),
        tipo=tipo,
    )
    db.add(ticket)
    db.commit()


def _create_appointment(client: Client, db: Session) -> None:
    raw = client.dados.get("data_hora", "")
    try:
        data_hora = datetime.strptime(raw, "%d/%m %H:%M").replace(year=datetime.now().year)
    except ValueError:
        data_hora = datetime.now()
    db.add(
        Appointment(
            client_id=client.id,
            name=client.dados.get("nome", ""),
            servico=client.dados.get("servico", ""),
            data_hora=data_hora,
        )
    )
    db.commit()
