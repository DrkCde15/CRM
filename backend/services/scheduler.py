import logging
import threading
import time
from datetime import UTC, datetime

import schedule

from core.database import SessionLocal
from models.models import ScheduledJob

logger = logging.getLogger("mochi.scheduler")

_running = False
_thread: threading.Thread | None = None


def _run_sla_check(company_id: int):
    from services.sla import check_sla_for_company
    from services.notifier import notify_company
    try:
        breached = check_sla_for_company(company_id)
        for ticket_id, titulo in breached:
            notify_company(
                company_id=company_id,
                title="SLA violado",
                body=f"Chamado #{ticket_id} — {titulo}",
                link=f"/tickets/{ticket_id}",
            )
        if breached:
            logger.info("SLA: %d violação(ões) notificada(s) para company %s", len(breached), company_id)
        else:
            logger.info("SLA check concluído para company %s (sem violações)", company_id)
    except Exception as e:
        logger.error("Erro no SLA check: %s", e)


def _run_appointment_reminder(company_id: int):
    from services.notifier import notify_user
    try:
        db = SessionLocal()
        try:
            from models.models import Appointment
            from datetime import timedelta
            now = datetime.now(UTC).replace(tzinfo=None)
            window = now + timedelta(hours=2)
            upcoming = db.query(Appointment).filter(
                Appointment.company_id == company_id,
                Appointment.data_hora >= now,
                Appointment.data_hora <= window,
                Appointment.status == "agendado",
            ).all()
            for appt in upcoming:
                notify_user(
                    user_id=appt.user_id or 1,
                    company_id=company_id,
                    title="Lembrete de agendamento",
                    body=f"{appt.name or 'Cliente'} — {appt.servico} em {appt.data_hora.strftime('%d/%m %H:%M')}",
                    link="/appointments",
                )
            if upcoming:
                logger.info("Lembretes: %d agendamento(s) notificado(s)", len(upcoming))
        finally:
            db.close()
    except Exception as e:
        logger.error("Erro no lembrete de agendamentos: %s", e)


def _run_cleanup(company_id: int):
    try:
        db = SessionLocal()
        try:
            cutoff = datetime.now(UTC).replace(tzinfo=None)
            from models.models import Notification
            old = db.query(Notification).filter(
                Notification.company_id == company_id,
                Notification.created_at < cutoff,
            ).delete()
            if old:
                db.commit()
                logger.info("Limpeza: %s notificações antigas removidas", old)
        finally:
            db.close()
    except Exception as e:
        logger.error("Erro na limpeza: %s", e)


TASK_HANDLERS = {
    "sla_check": _run_sla_check,
    "appointment_reminder": _run_appointment_reminder,
    "cleanup": _run_cleanup,
}


_DEFAULT_JOBS = [
    {"name": "Verificação de SLA", "task_type": "sla_check", "interval_minutes": 5},
    {"name": "Lembrete de agendamentos", "task_type": "appointment_reminder", "interval_minutes": 30},
    {"name": "Limpeza de dados", "task_type": "cleanup", "interval_minutes": 1440},
]


def _ensure_defaults():
    db = SessionLocal()
    try:
        from models.models import Company
        companies = db.query(Company).all()
        for company in companies:
            existing = db.query(ScheduledJob).filter_by(company_id=company.id).first()
            if existing:
                continue
            for cfg in _DEFAULT_JOBS:
                job = ScheduledJob(company_id=company.id, **cfg)
                db.add(job)
        db.commit()
    except Exception as e:
        logger.error("Erro ao criar jobs padrão: %s", e)
    finally:
        db.close()


def load_jobs():
    schedule.clear()
    _ensure_defaults()
    db = SessionLocal()
    try:
        jobs = db.query(ScheduledJob).filter(ScheduledJob.active.is_(True)).all()
        for job in jobs:
            handler = TASK_HANDLERS.get(job.task_type)
            if not handler:
                logger.warning("Tipo de tarefa desconhecido: %s", job.task_type)
                continue
            if job.interval_minutes < 1:
                continue
            schedule.every(job.interval_minutes).minutes.do(
                _run_job_wrapper, job_id=job.id, handler=handler, company_id=job.company_id
            )
            logger.info(
                "Tarefa agendada: %s (a cada %d min, company %d)",
                job.name, job.interval_minutes, job.company_id,
            )
    finally:
        db.close()


def _run_job_wrapper(job_id: int, handler, company_id: int):
    handler(company_id)
    db = SessionLocal()
    try:
        db.query(ScheduledJob).filter(ScheduledJob.id == job_id).update(
            {"last_run_at": datetime.now(UTC).replace(tzinfo=None)}
        )
        db.commit()
    except Exception as e:
        logger.error("Erro ao atualizar last_run_at: %s", e)
    finally:
        db.close()


def _loop():
    global _running
    load_jobs()
    _running = True
    while _running:
        schedule.run_pending()
        time.sleep(1)


def start():
    global _thread
    if _thread is not None and _thread.is_alive():
        return
    _thread = threading.Thread(target=_loop, daemon=True)
    _thread.start()
    logger.info("Scheduler iniciado")


def stop():
    global _running
    _running = False
    logger.info("Scheduler parado")


def reload():
    load_jobs()
    logger.info("Tarefas recarregadas")
