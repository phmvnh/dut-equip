"""Thang điểm rủi ro DÙNG CHUNG cho cả tầng luật (triage) và output LLM.

Trước đây ngưỡng phân mức nằm rải rác (prompt mô tả 70/40, triage tự đặt
LOW_SCORE_THRESHOLD riêng) nên 2 hệ điểm dễ lệch nhau. Gom về 1 chỗ để
heuristic và LLM cùng một thang & ngưỡng — dễ kiểm toán và chỉnh có cơ sở.
"""

# Ngưỡng điểm 0..100 → mức rủi ro. Dùng cho CẢ heuristic lẫn chuẩn hoá output LLM.
HIGH_MIN = 70    # >= 70  → HIGH (cần bảo trì ngay)
MEDIUM_MIN = 40  # 40..69 → MEDIUM (nên lên lịch trong 14 ngày)
# < 40 → LOW (bình thường)

VALID_LEVELS = ("HIGH", "MEDIUM", "LOW")


def score_to_level(score: int) -> str:
    """Chuyển điểm 0..100 sang mức rủi ro theo đúng ngưỡng dùng chung."""
    s = max(0, min(100, int(score)))
    if s >= HIGH_MIN:
        return "HIGH"
    if s >= MEDIUM_MIN:
        return "MEDIUM"
    return "LOW"


def normalize_level(level: str | None) -> str:
    """Ép một chuỗi mức rủi ro bất kỳ về {HIGH, MEDIUM, LOW}, mặc định LOW."""
    lv = str(level or "LOW").upper().strip()
    return lv if lv in VALID_LEVELS else "LOW"
