from fastapi import APIRouter, BackgroundTasks

from app.schemas import RunResponse
from app.services import analyzer

router = APIRouter()


@router.post("/run", response_model=RunResponse)
def trigger_run(bg: BackgroundTasks):
    if analyzer.is_running():
        return RunResponse(status="busy", message="Đang có 1 lần phân tích đang chạy")
    bg.add_task(analyzer.run_all, "MANUAL")
    return RunResponse(status="started", message="Đã khởi động phân tích nền")
