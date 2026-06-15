import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, predictions, run, jobs, metrics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

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
