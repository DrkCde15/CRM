import logging
from datetime import datetime, timedelta

from core.database import SessionLocal
from models.models import SLARule, Ticket

logger = logging.getLogger("mochi.sla")


def _get_sla_for_ticket(ticket: Ticket, rules: list[SLARule]) -> SLARule | None:
    """Encontra a regra SLA aplicável com base no tipo/prioridade do ticket."""
    priority_map = {
        "baixa": "baixa",
        "media": "media",
        "alta": "alta",
        "urgente": "alta",
    }
    ticket_priority = priority_map.get(ticket.tipo or "media", "media")
    for rule in rules:
        if rule.active and rule.priority == ticket_priority:
            return rule
    return None


def check_sla_for_company(company_id: int) -> list[tuple[int, str]]:
    """Verifica SLA para uma empresa específica. Retorna lista de (ticket_id, titulo) violados."""
    breached: list[tuple[int, str]] = []
    db = SessionLocal()
    try:
        rules = db.query(SLARule).filter_by(company_id=company_id).all()
        if not rules:
            return breached

        tickets = db.query(Ticket).filter_by(company_id=company_id).filter(
            Ticket.status.in_(["aberto", "andamento"]),
            Ticket.sla_breached == False,
        ).all()

        now = datetime.utcnow()
        for ticket in tickets:
            rule = _get_sla_for_ticket(ticket, rules)
            if not rule:
                continue

            age = now - ticket.created_at.replace(tzinfo=None)
            age_hours = age.total_seconds() / 3600

            if age_hours > rule.max_resolution_hours:
                ticket.sla_breached = True
                breached.append((ticket.id, ticket.titulo or "(sem título)"))
                logger.info("SLA breached: ticket %d (%.1fh > %.1fh)", ticket.id, age_hours, rule.max_resolution_hours)

            if rule.escalate_after_hours > 0 and age_hours > rule.escalate_after_hours:
                if rule.escalate_action == "change_status_andamento":
                    ticket.status = "andamento"
                elif rule.escalate_action == "change_status_aberto":
                    ticket.status = "aberto"

        db.commit()
    except Exception as e:
        logger.error("Erro no SLA check para company %d: %s", company_id, e)
    finally:
        db.close()
    return breached


def check_and_escalate():
    """Verifica tickets abertos/em andamento e marca SLA violado ou escalona."""
    db = SessionLocal()
    try:
        company_ids = db.query(Ticket.company_id).filter(
            Ticket.status.in_(["aberto", "andamento"]),
        ).distinct().all()

        for (cid,) in company_ids:
            rules = db.query(SLARule).filter_by(company_id=cid).all()
            if not rules:
                continue

            tickets = db.query(Ticket).filter_by(company_id=cid).filter(
                Ticket.status.in_(["aberto", "andamento"]),
                Ticket.sla_breached == False,
            ).all()

            now = datetime.utcnow()
            for ticket in tickets:
                rule = _get_sla_for_ticket(ticket, rules)
                if not rule:
                    continue

                age = now - ticket.created_at.replace(tzinfo=None)
                age_hours = age.total_seconds() / 3600

                # Marca SLA violado se ultrapassou resolução
                if age_hours > rule.max_resolution_hours:
                    ticket.sla_breached = True
                    logger.info(
                        "SLA breached: ticket %d (%.1fh > %.1fh)",
                        ticket.id, age_hours, rule.max_resolution_hours,
                    )

                # Escalona se ultrapassou o tempo de escalada
                if rule.escalate_after_hours > 0 and age_hours > rule.escalate_after_hours:
                    if rule.escalate_action == "change_status_andamento":
                        ticket.status = "andamento"
                    elif rule.escalate_action == "change_status_aberto":
                        ticket.status = "aberto"

        db.commit()
    except Exception as e:
        logger.error("Erro no SLA check: %s", e)
    finally:
        db.close()
