from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_session
from app.services import metrics as metrics_service

router = APIRouter()


@router.get("/metrics")
def get_metrics(
    positive: str = Query("high_or_fail", pattern="^(high|fail|high_or_fail)$"),
    since_days: Optional[int] = Query(None, ge=1, le=365),
    db: Session = Depends(get_session),
):
    """Precision/recall/F1 từ lịch sử đã gắn nhãn — tổng, theo nguồn (luật vs LLM), theo mức."""
    return metrics_service.compute(db, positive=positive, since_days=since_days)
