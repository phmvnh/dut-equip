"""Gắn nhãn thực tế cho dự đoán (feedback loop).

Với mỗi dòng ai_prediction_history đã quá CỬA SỔ QUAN SÁT (mặc định 7 ngày, khớp
will_fail_in_7d) và chưa có nhãn: kiểm tra xem trong cửa sổ đó thiết bị có THỰC SỰ
cần bảo trì / bị báo hỏng không → gán outcome_label = 1/0.

Nhãn là BEST-EFFORT (proxy): bảo trì có thể theo lịch chứ không do hỏng; "không có
sự kiện" không chắc chắn là thiết bị khỏe. Dùng để tính precision/recall định hướng.
"""
import logging
from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AiPredictionHistory, MaintenanceLog, BorrowRequest

log = logging.getLogger(__name__)

# Số dòng tối đa gắn nhãn mỗi lần chạy (chặn tải khi tồn đọng nhiều).
_BATCH_LIMIT = 5000


def _has_maintenance(db: Session, equipment_id: int, start: datetime, end: datetime) -> datetime | None:
    """Có phiếu bảo trì được tạo cho thiết bị trong [start, end] không? Trả thời điểm sớm nhất."""
    row = db.execute(
        select(func.min(MaintenanceLog.created_at))
        .where(MaintenanceLog.equipment_id == equipment_id)
        .where(MaintenanceLog.created_at >= start)
        .where(MaintenanceLog.created_at <= end)
    ).scalar()
    return row


def _has_damage(db: Session, equipment_id: int, start: datetime, end: datetime) -> datetime | None:
    """Có báo hỏng cho thiết bị trong [start, end] không? Trả thời điểm sớm nhất."""
    row = db.execute(
        select(func.min(BorrowRequest.damage_reported_at))
        .where(BorrowRequest.equipment_id == equipment_id)
        .where(BorrowRequest.damage_reported == True)  # noqa: E712
        .where(BorrowRequest.damage_reported_at >= start)
        .where(BorrowRequest.damage_reported_at <= end)
    ).scalar()
    return row


def run(db: Session) -> int:
    """Gắn nhãn các dòng đã 'chín' và chưa có nhãn. Trả số dòng đã gắn."""
    horizon = timedelta(days=settings.AI_LABEL_HORIZON_DAYS)
    now = datetime.now()
    # Chỉ gắn nhãn dự đoán đã tạo đủ `horizon` ngày trước.
    # Dự đoán "hôm nay" chưa thể biết kết quả thực tế → phải chờ đủ cửa sổ quan sát.
    cutoff = now - horizon

    rows = db.execute(
        select(AiPredictionHistory.id, AiPredictionHistory.equipment_id,
               AiPredictionHistory.generated_at)
        .where(AiPredictionHistory.outcome_label.is_(None))
        .where(AiPredictionHistory.generated_at <= cutoff)
        .order_by(AiPredictionHistory.generated_at)
        .limit(_BATCH_LIMIT)
    ).all()

    if not rows:
        return 0

    labeled = 0
    for row_id, equipment_id, generated_at in rows:
        win_start = generated_at
        win_end = generated_at + horizon

        maint_at = _has_maintenance(db, equipment_id, win_start, win_end)
        damage_at = _has_damage(db, equipment_id, win_start, win_end)

        observed_at = None
        event_type = "NONE"
        label = 0
        candidates = [t for t in (maint_at, damage_at) if t is not None]
        if candidates:
            # label=1 = "có sự kiện thực tế" → dự đoán HIGH/will_fail_in_7d là đúng.
            label = 1
            observed_at = min(candidates)
            # Ghi event_type theo sự kiện xảy ra SỚM HƠN (gần với thời điểm dự đoán nhất).
            if damage_at is not None and (maint_at is None or damage_at <= maint_at):
                event_type = "DAMAGE_REPORT"
            else:
                event_type = "MAINTENANCE"

        db.execute(
            AiPredictionHistory.__table__.update()
            .where(AiPredictionHistory.id == row_id)
            .values(outcome_label=label, outcome_event_type=event_type,
                    outcome_observed_at=observed_at, labeled_at=now)
        )
        labeled += 1

    db.commit()
    log.info("Đã gắn nhãn %d dòng lịch sử dự đoán", labeled)
    return labeled
