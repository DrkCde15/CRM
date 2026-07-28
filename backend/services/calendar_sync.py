import logging

logger = logging.getLogger("mochi.calendar")


def sync_calendar_events(connection_id: int) -> dict:
    """Placeholder — calendário agora usa schedule para tarefas agendadas."""
    logger.warning("sync_calendar_events chamado para connection %s (deprecated)", connection_id)
    return {"ok": True, "imported": 0}
