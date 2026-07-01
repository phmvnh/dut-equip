import logging
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import AiJob
from app.routers import health, predictions, run, jobs, metrics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
log = logging.getLogger(__name__)

# Lịch chạy 7h sáng do Windows Task Scheduler đảm nhiệm (run_once.py),
# chạy độc lập không cần uvicorn bật suốt đêm. uvicorn chỉ phục vụ
# nút "Phân tích ngay" thủ công qua POST /run.
app = FastAPI(
    title="DUT Equip — AI Service",
    description="Phân tích rủi ro bảo trì thiết bị bằng Gemini + OpenWeather",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(predictions.router, tags=["predictions"])
app.include_router(run.router, tags=["run"])
app.include_router(jobs.router, tags=["jobs"])
app.include_router(metrics.router, tags=["metrics"])


@app.on_event("startup")
def _recover_stale_jobs():
    """Job còn 'RUNNING' lúc service khởi động là job mồ côi (process trước bị kill/restart
    giữa chừng, vd lúc deploy) — đánh dấu FAILED để jobs/latest không kẹt vô thời hạn,
    khiến Dashboard polling chờ DONE mãi không bao giờ tới.
    """
    db = SessionLocal()
    try:
        stale = db.execute(select(AiJob).where(AiJob.status == "RUNNING")).scalars().all()
        for job in stale:
            job.status = "FAILED"
            job.finished_at = datetime.now()
            job.error_message = "Service bị restart giữa lúc đang chạy — job không hoàn tất"
        if stale:
            db.commit()
            log.warning("Đánh dấu FAILED %d job RUNNING mồ côi từ lần chạy trước", len(stale))
    finally:
        db.close()
