from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import AiPrediction, Equipment, EquipType, Building, MaintenanceLog
from app.schemas import PredictionItem

router = APIRouter()


def _format_last_maintenance(days_ago: Optional[int]) -> str:
    if days_ago is None:
        return "Chưa bảo trì"
    if days_ago == 0:
        return "Hôm nay"
    if days_ago == 1:
        return "Hôm qua"
    if days_ago < 30:
        return f"{days_ago} ngày trước"
    months = days_ago // 30
    return f"~{months} tháng trước"


@router.get("/predictions", response_model=list[PredictionItem])
def list_predictions(
    risk: Optional[str] = Query(None, pattern="^(HIGH|MEDIUM|LOW)$"),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_session),
):
    risk_order_sql = """
        CASE risk_level
            WHEN 'HIGH' THEN 0
            WHEN 'MEDIUM' THEN 1
            WHEN 'LOW' THEN 2
        END
    """
    from sqlalchemy import text as _text

    stmt = (
        select(AiPrediction, Equipment, EquipType, Building)
        .join(Equipment, Equipment.id == AiPrediction.equipment_id)
        .join(EquipType, EquipType.id == Equipment.equip_type_id, isouter=True)
        .join(Building, Building.id == Equipment.building_id, isouter=True)
    )
    if risk:
        stmt = stmt.where(AiPrediction.risk_level == risk)
    stmt = stmt.order_by(_text(risk_order_sql), desc(AiPrediction.risk_score)).limit(limit)

    rows = db.execute(stmt).all()

    items: list[PredictionItem] = []
    for pred, eq, et, bld in rows:
        last_maint_date = db.execute(
            select(MaintenanceLog.end_date)
            .where(MaintenanceLog.equipment_id == eq.id)
            .where(MaintenanceLog.status == "COMPLETED")
            .order_by(desc(MaintenanceLog.end_date))
            .limit(1)
        ).scalar()
        days_ago: Optional[int] = None
        if last_maint_date is not None:
            if isinstance(last_maint_date, datetime):
                last_maint_date = last_maint_date.date()
            days_ago = (date.today() - last_maint_date).days

        items.append(PredictionItem(
            equipment_id=eq.id,
            equipment_code=eq.code,
            equipment_name=eq.name,
            equip_type_name=et.name if et else "—",
            building_name=bld.name if bld else "—",
            risk_level=pred.risk_level,
            risk_score=pred.risk_score,
            days_to_maintenance=pred.days_to_maintenance,
            will_fail_in_7d=bool(pred.will_fail_in_7d),
            reason=pred.reason,
            last_maintenance_text=_format_last_maintenance(days_ago),
            generated_at=pred.generated_at,
        ))
    return items
