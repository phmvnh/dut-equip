from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import AiJob

router = APIRouter()


def _job_dict(j: AiJob) -> dict:
    return {
        "run_id": j.run_id,
        "status": j.status,
        "trigger_source": j.trigger_source,
        "full_sweep": bool(j.full_sweep),
        "started_at": j.started_at,
        "finished_at": j.finished_at,
        "n_total": j.n_total,
        "n_llm": j.n_llm,
        "n_llm_calls": j.n_llm_calls,
        "n_rule_low": j.n_rule_low,
        "n_skipped": j.n_skipped,
        "n_failed": j.n_failed,
        "n_chunks": j.n_chunks,
        "n_chunks_failed": j.n_chunks_failed,
        "error_rate": float(j.error_rate) if j.error_rate is not None else None,
        "error_message": j.error_message,
    }


@router.get("/jobs/latest")
def latest_job(db: Session = Depends(get_session)):
    j = db.execute(select(AiJob).order_by(desc(AiJob.started_at)).limit(1)).scalar_one_or_none()
    return _job_dict(j) if j else {"status": "none"}


@router.get("/jobs")
def list_jobs(limit: int = Query(20, ge=1, le=200), db: Session = Depends(get_session)):
    rows = db.execute(select(AiJob).order_by(desc(AiJob.started_at)).limit(limit)).scalars().all()
    return [_job_dict(j) for j in rows]
