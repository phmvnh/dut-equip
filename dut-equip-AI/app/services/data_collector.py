"""Gom features cho mỗi loại thiết bị từ DB."""
from datetime import date, datetime, timedelta
from typing import Any
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import EquipType, Equipment, MaintenanceLog, BorrowRequest


def get_active_equip_types(db: Session) -> list[EquipType]:
    stmt = select(EquipType).order_by(EquipType.id)
    return list(db.execute(stmt).scalars().all())


def _days_since(d: date | datetime | None) -> int | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        d = d.date()
    return (date.today() - d).days


# Phân loại tòa nhà theo cờ admin set ở bảng buildings (cột environment_stability).
# STABLE  → phòng học/văn phòng, môi trường ổn định.
# VOLATILE → xưởng/ngoài trời, chịu ảnh hưởng bụi/ẩm/rung nhiều hơn.
def _building_category(building) -> str:
    stability = getattr(building, "environment_stability", None) if building else None
    if stability == "STABLE":
        return "Phòng học (môi trường ổn định)"
    return "Xưởng/khác (chịu ảnh hưởng môi trường nhiều)"


def collect_features_for_type(db: Session, equip_type_id: int, history_days: int = 90) -> list[dict[str, Any]]:
    """Trả về danh sách feature-dict cho từng thiết bị thuộc loại này.

    Mốc tính lượt mượn / giờ dùng / báo hỏng: từ lần bảo trì gần nhất;
    nếu thiết bị chưa từng bảo trì → tính từ ngày nhập (created_at).
    """
    now = datetime.now()

    equipments = db.execute(
        select(Equipment)
        .where(Equipment.equip_type_id == equip_type_id)
        .where(Equipment.hidden == False)  # noqa: E712
        .where(Equipment.status != "DISPOSED")
    ).scalars().all()

    result = []
    for eq in equipments:
        last_maint = db.execute(
            select(MaintenanceLog.end_date)
            .where(MaintenanceLog.equipment_id == eq.id)
            .where(MaintenanceLog.status == "COMPLETED")
            .order_by(MaintenanceLog.end_date.desc())
            .limit(1)
        ).scalar()

        # Mốc cửa sổ thống kê: lần bảo trì gần nhất, hoặc ngày nhập nếu chưa bảo trì.
        if last_maint is not None:
            window_start = datetime.combine(last_maint, datetime.min.time())
            window_basis = "last_maintenance"
        elif eq.created_at is not None:
            window_start = eq.created_at
            window_basis = "since_added"
        else:
            window_start = now - timedelta(days=history_days)
            window_basis = "fallback_90d"
        window_days = max(0, (now - window_start).days)

        borrows = db.execute(
            select(BorrowRequest.borrow_date_time, BorrowRequest.return_date_time,
                   BorrowRequest.actual_return_date_time)
            .where(BorrowRequest.equipment_id == eq.id)
            .where(BorrowRequest.borrow_date_time >= window_start)
        ).all()
        borrow_count = len(borrows)
        total_hours = 0.0
        for b in borrows:
            start = b.borrow_date_time
            end = b.actual_return_date_time or b.return_date_time
            if start and end and end > start:
                total_hours += (end - start).total_seconds() / 3600.0
        total_borrow_hours = round(total_hours, 1)

        maint_lifetime = db.execute(
            select(func.count(MaintenanceLog.id))
            .where(MaintenanceLog.equipment_id == eq.id)
            .where(MaintenanceLog.status == "COMPLETED")
        ).scalar() or 0

        damage_reports = db.execute(
            select(func.count(BorrowRequest.id))
            .where(BorrowRequest.equipment_id == eq.id)
            .where(BorrowRequest.damage_reported == True)  # noqa: E712
            .where(BorrowRequest.created_at >= window_start)
        ).scalar() or 0

        warranty_days = _days_since(eq.warranty_until)
        warranty_remaining = -warranty_days if warranty_days is not None else None

        building_name = eq.building.name if eq.building else "—"

        result.append({
            "id": eq.id,
            "code": eq.code,
            "name": eq.name,
            "building": building_name,
            "building_category": _building_category(eq.building),
            "status": eq.status,
            "age_days": _days_since(eq.created_at),
            "warranty_remaining_days": warranty_remaining,
            "window_basis": window_basis,
            "window_days": window_days,
            "borrow_count_since_window": borrow_count,
            "total_borrow_hours_since_window": total_borrow_hours,
            "last_maintenance_days_ago": _days_since(last_maint),
            "maintenance_count_lifetime": int(maint_lifetime),
            "damage_reports_since_window": int(damage_reports),
        })
    return result
