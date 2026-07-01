"""Dấu vân tay (fingerprint) đầu vào — để bỏ qua thiết bị KHÔNG đổi giữa các lần chạy.

Chỉ băm những yếu tố thực sự ảnh hưởng rủi ro, và băm theo 'rổ' (bucket) thô để:
  - Bộ đếm ngày (age_days, last_maintenance_days_ago...) trôi mỗi ngày KHÔNG làm đổi hash.
  - Thời tiết dao động lặt vặt KHÔNG ép tính lại, nhưng đợt nồm/nắng gắt thật thì có.
Sự kiện thật (mượn mới, bảo trì mới, báo hỏng, đổi status, vượt mốc bảo hành) mới đổi hash.

Không cần cột DB mới: hash của lần trước được tính LẠI từ context_snapshot +
weather_snapshot đã lưu trong bảng ai_predictions.
"""
import hashlib
import json
from typing import Any

# ===== Ngưỡng bucket (đã tài liệu hoá) =====
# Mục đích: chỉ recompute khi yếu tố rủi ro VƯỢT MỐC, không phải mỗi khi số ngày
# nhích 1 đơn vị. Lưu ý: STALE_DAYS=7 trong analyzer vẫn ép tính lại định kỳ, nên
# thiết bị "xấu dần qua biên bucket" cũng được soi lại chậm nhất sau 7 ngày
# (HIGH: 2 ngày) — không bị bỏ quên quá lâu.
#
# Mốc số ngày từ lần bảo trì gần nhất: <30 (vừa bảo trì) / <90 / <180 (cảnh giác)
# / <365 / >=365 (rất lâu). Khớp với STALE_MAINTENANCE_DAYS=180 ở triage.
LAST_MAINT_BUCKETS = (30, 90, 180, 365)
# Bảo hành: hết hạn / sắp hết (<30) / còn ít (<90) / còn nhiều (>=90).
WARRANTY_NEAR_DAYS = 30
WARRANTY_MID_DAYS = 90
# Tuổi thiết bị chia rổ 180 ngày (~nửa năm) — đủ thô để không churn theo ngày.
AGE_BUCKET_DAYS = 180


def _bucket_last_maint(days: int | None) -> str:
    if days is None:
        return "never"
    for t in LAST_MAINT_BUCKETS:
        if days < t:
            return f"<{t}"
    return ">=365"


def _bucket_warranty(days: int | None) -> str:
    if days is None:
        return "na"
    if days < 0:
        return "expired"
    if days < WARRANTY_NEAR_DAYS:
        return "<30"
    if days < WARRANTY_MID_DAYS:
        return "<90"
    return ">=90"


def _round_step(v: float | None, step: float) -> float | None:
    if v is None:
        return None
    return round(v / step) * step


def weather_bucket(weather_snap: dict[str, Any]) -> dict[str, Any]:
    """Rút thời tiết về vài con số thô — chỉ phần model thực sự suy luận."""
    f7 = weather_snap.get("forecast_7d", {}) or {}
    p7 = weather_snap.get("past_7d", {}) or {}
    dust = weather_snap.get("dust", {}) or {}
    return {
        "f_temp": _round_step(f7.get("temp_avg"), 2),
        "f_hum": _round_step(f7.get("humidity_avg"), 5),
        "f_rain": _round_step(f7.get("rain_total_mm"), 10),
        "p_hum": _round_step(p7.get("humidity_avg"), 5),
        "aqi": dust.get("aqi_label"),
    }


def compute(feature: dict[str, Any], wbucket: dict[str, Any]) -> str:
    """SHA-256 của các yếu tố sự kiện (đã bucket) + rổ thời tiết."""
    key = {
        "type": feature.get("equip_type"),
        "status": feature.get("status"),
        "building_cat": feature.get("building_category"),
        # Dùng số đếm thô (không bucket) vì mỗi lượt mượn thêm là sự kiện thật.
        "borrow_count": feature.get("borrow_count_since_window"),
        "borrow_hours": round(feature.get("total_borrow_hours_since_window") or 0),
        "maint_count": feature.get("maintenance_count_lifetime"),
        # Dùng bucket thay vì ngày thực: 181 ngày → 182 ngày không đổi mức rủi ro,
        # không cần tính lại. Chỉ đổi khi vượt mốc 180/365.
        "last_maint": _bucket_last_maint(feature.get("last_maintenance_days_ago")),
        "damage": feature.get("damage_reports_since_window"),
        "damage_sev": feature.get("max_damage_severity_rank") or 0,
        "warranty": _bucket_warranty(feature.get("warranty_remaining_days")),
        "age_bucket": (feature.get("age_days") or 0) // AGE_BUCKET_DAYS,
        # window_basis thay đổi khi bảo trì mới hoàn tất (last_maintenance → mốc mới),
        # buộc recompute ngay lần bảo trì đó dù các số khác chưa thay đổi.
        "window_basis": feature.get("window_basis"),
        "weather": wbucket,
    }
    blob = json.dumps(key, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()
