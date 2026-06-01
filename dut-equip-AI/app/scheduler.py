import logging
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.services import analyzer

log = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def start():
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(timezone="Asia/Ho_Chi_Minh")
    _scheduler.add_job(
        analyzer.run_all,
        trigger="cron",
        hour=settings.AI_CRON_HOUR,
        minute=0,
        id="ai_daily_run",
        replace_existing=True,
    )
    _scheduler.start()
    log.info("Scheduler bật — chạy lúc %d:00 mỗi ngày", settings.AI_CRON_HOUR)


def stop():
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
