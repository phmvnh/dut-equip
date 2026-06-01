"""Build prompt cho Gemini — 1 prompt = 1 loại thiết bị (batch)."""
import json
from typing import Any


SYSTEM_INSTRUCTION = (
    "Bạn là kỹ sư bảo trì thiết bị thí nghiệm tại trường Đại học Bách Khoa Đà Nẵng, "
    "có 15 năm kinh nghiệm. Trả lời ngắn gọn, dứt khoát, dùng dữ kiện cụ thể."
)


def build_batch_prompt(
    equip_type_name: str,
    equipments: list[dict[str, Any]],
    weather: dict[str, Any],
) -> str:
    past_7d = weather.get("past_7d", {})
    past_30d = weather.get("past_30d", {})
    forecast = weather.get("forecast_7d", {})
    dust = weather.get("dust", {})

    weather_text = (
        f"- 7 NGÀY QUA: nhiệt độ TB {past_7d.get('temp_avg')}°C, "
        f"độ ẩm TB {past_7d.get('humidity_avg')}%, mưa {past_7d.get('rain_total_mm')}mm\n"
        f"- 30 NGÀY QUA: nhiệt độ TB {past_30d.get('temp_avg')}°C, "
        f"độ ẩm TB {past_30d.get('humidity_avg')}%, mưa {past_30d.get('rain_total_mm')}mm\n"
        f"- DỰ BÁO 7 NGÀY TỚI: nhiệt độ TB {forecast.get('temp_avg')}°C, "
        f"độ ẩm TB {forecast.get('humidity_avg')}%, mưa {forecast.get('rain_total_mm')}mm, "
        f"tình trạng phổ biến: {forecast.get('condition_summary')}\n"
        f"- MẬT ĐỘ BỤI hiện tại: PM2.5 {dust.get('pm2_5')} µg/m³, "
        f"PM10 {dust.get('pm10')} µg/m³, chất lượng không khí: {dust.get('aqi_label')}"
    )

    devices_json = json.dumps(equipments, ensure_ascii=False, default=str)

    return f"""THỜI TIẾT & MÔI TRƯỜNG ĐÀ NẴNG (quá khứ → tương lai):
{weather_text}

LOẠI THIẾT BỊ: {equip_type_name}

DANH SÁCH {len(equipments)} THIẾT BỊ CÙNG LOẠI (đã kèm features):
{devices_json}

YÊU CẦU:
Với MỖI thiết bị, đánh giá rủi ro hỏng/cần bảo trì trong 7 ngày tới, dựa trên:
- Đặc tính loại thiết bị "{equip_type_name}" (vd: máy chiếu sợ bụi và nhiệt cao; \
laptop sợ ẩm gây mốc mạch; dụng cụ đo cần hiệu chuẩn định kỳ; \
thiết bị xưởng cơ khí chịu rung động/bụi nhiều).
- Thời tiết Đà Nẵng ở trên — xét CẢ quá khứ (7 & 30 ngày qua, là môi trường thiết bị \
đã chịu) LẪN dự báo 7 ngày tới (ẩm cao kéo dài → ăn mòn/mốc mạch; nhiệt cao → giảm \
tuổi thọ pin; mưa nhiều → ẩm phòng tăng; PM2.5/PM10 cao → bụi bám, hại quạt/quang học).
- building_category: "Phòng học (môi trường ổn định)" → ít rủi ro môi trường; \
"Xưởng/khác (chịu ảnh hưởng môi trường nhiều)" → bụi/ẩm/rung tác động mạnh hơn.
- Tần suất sử dụng KỂ TỪ lần bảo trì gần nhất (hoặc từ ngày nhập nếu chưa bảo trì): \
borrow_count_since_window, total_borrow_hours_since_window. \
Lưu ý chuẩn hoá theo window_days (số ngày của cửa sổ) — vd 20 lượt trong 30 ngày \
nặng hơn 20 lượt trong 300 ngày. window_basis cho biết mốc tính.
- last_maintenance_days_ago (null = chưa từng bảo trì; >180 = quá lâu).
- damage_reports_since_window (>0 = đã có dấu hiệu hỏng sau lần bảo trì gần nhất).
- age_days, warranty_remaining_days (âm = đã hết bảo hành).

QUY TẮC RISK_LEVEL:
- HIGH: cần bảo trì NGAY (score 70-100). Có dấu hiệu hỏng / quá lịch / tần suất quá cao + môi trường xấu.
- MEDIUM: nên lên lịch trong 14 ngày (score 40-69). Có 1-2 yếu tố rủi ro.
- LOW: bình thường (score 0-39).

TRẢ VỀ JSON ARRAY DUY NHẤT (không markdown, không giải thích thêm) đúng schema:
[
  {{
    "equipment_id": <int>,
    "risk_level": "HIGH"|"MEDIUM"|"LOW",
    "risk_score": <int 0-100>,
    "days_to_maintenance": <int hoặc null>,
    "will_fail_in_7d": <true|false>,
    "reason": "<1-2 câu tiếng Việt, có dữ kiện cụ thể từ features và thời tiết>"
  }}
]

Chỉ trả về JSON array. Không thêm text nào khác."""
