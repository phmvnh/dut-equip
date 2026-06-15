"""Gom features cho mỗi loại thiết bị từ DB."""
import bisect
from datetime import date, datetime, timedelta
from typing import Any
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.config import settings
from app.models import EquipType, Equipment, MaintenanceLog, BorrowRequest
from app.services import weather

# Thứ hạng mức độ hỏng để lấy mức nghiêm trọng nhất (không chỉ đếm số report).
_SEVERITY_RANK = {"LIGHT": 1, "MEDIUM": 2, "SEVERE": 3}
_SEVERITY_LABEL = {0: "NONE", 1: "LIGHT", 2: "MEDIUM", 3: "SEVERE"}


def get_active_equip_types(db: Session) -> list[EquipType]:
    stmt = select(EquipType).order_by(EquipType.id)
    return list(db.execute(stmt).scalars().all())


def _prepare_hourly(hourly: dict) -> tuple[list, list]:
    """Chuẩn hoá chuỗi giờ thành (danh sách thời gian đã sort, danh sách bản ghi)
    để tra nhanh bằng bisect. Bỏ các mốc parse lỗi."""
    times = hourly.get("times", []) or []
    hum = hourly.get("humidity", []) or []
    temp = hourly.get("temp", []) or []
    precip = hourly.get("precip", []) or []
    clean = [
        (t,
         hum[i] if i < len(hum) else None,
         temp[i] if i < len(temp) else None,
         precip[i] if i < len(precip) else None)
        for i, t in enumerate(times) if t is not None
    ]
    clean.sort(key=lambda x: x[0])
    ts = [c[0] for c in clean]
    return ts, clean


def _exposure_for_intervals(prepared: tuple[list, list], intervals: list[tuple], humidity_high: float) -> dict | None:
    """Gom thời tiết tại CÁC GIỜ thiết bị đang được mượn (ghép thời điểm C × môi trường).
    Trả None nếu không có lượt mượn nào hoặc không có dữ liệu giờ trùng khớp."""
    ts, clean = prepared
    if not ts or not intervals:
        return None
    hums: list[float] = []
    temps: list[float] = []
    precs: list[float] = []
    high_hours = 0
    for start, end in intervals:
        lo = bisect.bisect_left(ts, start)
        hi = bisect.bisect_right(ts, end)
        for i in range(lo, hi):
            _, h, tp, pr = clean[i]
            if h is not None:
                hums.append(h)
                if h > humidity_high:
                    high_hours += 1
            if tp is not None:
                temps.append(tp)
            if pr is not None:
                precs.append(pr)
    if not hums and not temps and not precs:
        return None
    return {
        "use_humidity_avg": round(sum(hums) / len(hums), 1) if hums else None,
        "use_temp_avg": round(sum(temps) / len(temps), 1) if temps else None,
        "use_rain_mm_during_use": round(sum(precs), 1) if precs else None,
        "use_hours_high_humidity": high_hours,
    }


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


def collect_features_for_type(
    db: Session,
    equip_type_id: int,
    history_days: int = 90,
    hourly: dict | None = None,
) -> list[dict[str, Any]]:
    """Trả về danh sách feature-dict cho từng thiết bị thuộc loại này.

    Mốc tính lượt mượn / giờ dùng / báo hỏng: từ lần bảo trì gần nhất;
    nếu thiết bị chưa từng bảo trì → tính từ ngày nhập (created_at).

    `hourly`: chuỗi thời tiết theo giờ (từ weather.get_hourly_series) để tính
    đặc trưng "phơi nhiễm môi trường khi sử dụng". Nếu None → tự lấy.
    """
    now = datetime.now()
    if hourly is None:
        hourly = weather.get_hourly_series()
    prepared = _prepare_hourly(hourly)

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

        # Báo hỏng: đếm số report + lấy mức nghiêm trọng NẶNG nhất trong cửa sổ.
        damage_rows = db.execute(
            select(BorrowRequest.damage_severity)
            .where(BorrowRequest.equipment_id == eq.id)
            .where(BorrowRequest.damage_reported == True)  # noqa: E712
            .where(BorrowRequest.created_at >= window_start)
        ).scalars().all()
        damage_reports = len(damage_rows)
        max_sev_rank = max((_SEVERITY_RANK.get((s or "").upper(), 0) for s in damage_rows), default=0)

        # Phơi nhiễm môi trường: thời tiết tại CÁC GIỜ thiết bị đang được mượn.
        intervals: list[tuple] = []
        for b in borrows:
            start = b.borrow_date_time
            end = b.actual_return_date_time or b.return_date_time
            if start and end and end > start:
                intervals.append((start, end))
        exposure = _exposure_for_intervals(prepared, intervals, settings.AI_HUMIDITY_HIGH)

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
            "max_damage_severity": _SEVERITY_LABEL[max_sev_rank],
            "max_damage_severity_rank": max_sev_rank,
            # Phơi nhiễm môi trường khi sử dụng (None nếu không có lượt mượn trong cửa sổ)
            "use_humidity_avg": exposure["use_humidity_avg"] if exposure else None,
            "use_temp_avg": exposure["use_temp_avg"] if exposure else None,
            "use_rain_mm_during_use": exposure["use_rain_mm_during_use"] if exposure else None,
            "use_hours_high_humidity": exposure["use_hours_high_humidity"] if exposure else None,
        })
    return result
