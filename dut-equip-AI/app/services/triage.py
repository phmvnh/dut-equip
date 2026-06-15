"""Lọc thô bằng luật (two-stage cascade) — chấm điểm rủi ro bằng Python thuần,
KHÔNG gọi LLM. Thiết bị 'rõ ràng an toàn' được gán LOW ngay, chỉ những thiết bị
giáp ranh / có dấu hiệu mới đẩy lên Gemini để lý giải tinh tế.

Ngưỡng để ở đây dưới dạng hằng số, dễ chỉnh khi dữ liệu nhiều lên.
"""
from typing import Any

from app.config import settings

# Dưới ngưỡng này + không có cờ rủi ro cứng → coi là an toàn, gán LOW không cần AI.
# Lưu ý: đây là mốc "rõ ràng an toàn" (thiên về thận trọng), THẤP hơn ngưỡng MEDIUM
# (risk_levels.MEDIUM_MIN = 40) — thiết bị 15..39 điểm vẫn được đẩy lên LLM cho chắc.
LOW_SCORE_THRESHOLD = 15

# Mốc "bảo trì quá lâu" (ngày).
STALE_MAINTENANCE_DAYS = 180


def heuristic_score(f: dict[str, Any]) -> int:
    """Điểm rủi ro thô 0..100 từ các feature đã gom. Cộng điểm theo từng tín hiệu.
    Thang điểm & ngưỡng phân mức dùng chung với LLM ở app/services/risk_levels.py."""
    s = 0

    # Đã có dấu hiệu hỏng sau lần bảo trì gần nhất — tín hiệu mạnh nhất.
    # Cộng điểm theo MỨC NGHIÊM TRỌNG nặng nhất, không chỉ "có/không".
    sev = f.get("max_damage_severity_rank") or 0
    if sev >= 3:        # SEVERE — không dùng được
        s += 50
    elif sev == 2:      # MEDIUM
        s += 40
    elif sev == 1:      # LIGHT
        s += 30
    elif (f.get("damage_reports_since_window") or 0) > 0:  # có báo hỏng nhưng không rõ mức
        s += 40

    # Quá lịch bảo trì (hoặc chưa từng bảo trì mà đã cũ).
    lm = f.get("last_maintenance_days_ago")
    if lm is None:
        if (f.get("age_days") or 0) > STALE_MAINTENANCE_DAYS:
            s += 25
    elif lm > STALE_MAINTENANCE_DAYS:
        s += 25

    # Hết bảo hành.
    wr = f.get("warranty_remaining_days")
    if wr is not None and wr < 0:
        s += 10

    # Cường độ sử dụng chuẩn hoá theo cửa sổ (lượt/tháng).
    wd = f.get("window_days") or 0
    bc = f.get("borrow_count_since_window") or 0
    if wd > 0:
        rate_per_month = bc / wd * 30.0
        if rate_per_month > 15:
            s += 20
        elif rate_per_month > 8:
            s += 10

    # Môi trường khắc nghiệt (xưởng/ngoài trời).
    is_workshop = str(f.get("building_category", "")).startswith("Xưởng")
    if is_workshop:
        s += 5

    # Phơi nhiễm ẩm CAO khi sử dụng × môi trường xưởng (hiệu ứng B×C cộng dồn).
    use_hum = f.get("use_humidity_avg")
    if use_hum is not None:
        if is_workshop and use_hum >= settings.AI_HUMIDITY_HIGH:
            s += 10
        elif use_hum >= settings.AI_HUMIDITY_HIGH + 5:
            s += 5

    return min(100, s)


def clearly_low(f: dict[str, Any], score: int) -> bool:
    """An toàn để gán LOW không cần AI: điểm thấp, không báo hỏng, đang dùng bình thường.
    Bất kỳ tín hiệu rủi ro nào cũng đẩy thiết bị sang nhánh LLM (thiên về thận trọng)."""
    return (
        score < LOW_SCORE_THRESHOLD
        and (f.get("damage_reports_since_window") or 0) == 0
        and f.get("status") in ("AVAILABLE", "BORROWED")
    )


def low_prediction(f: dict[str, Any], score: int) -> dict[str, Any]:
    """Bản ghi LOW xác định bằng luật, cùng shape với output của Gemini."""
    return {
        "equipment_id": f["id"],
        "risk_level": "LOW",
        "risk_score": score,
        "days_to_maintenance": None,
        "will_fail_in_7d": False,
        "reason": _low_reason(f),
    }


def _low_reason(f: dict[str, Any]) -> str:
    lm = f.get("last_maintenance_days_ago")
    if lm is None:
        maint_part = "chưa từng bảo trì nhưng còn mới"
    else:
        maint_part = f"bảo trì gần đây ({lm} ngày trước)"
    bc = f.get("borrow_count_since_window") or 0
    wd = f.get("window_days") or 0
    use_part = f"tần suất dùng thấp ({bc} lượt trong {wd} ngày)"
    return f"Thiết bị ổn định: {maint_part}, {use_part}, không có báo hỏng — chưa cần can thiệp."
