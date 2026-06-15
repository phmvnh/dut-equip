"""Wrapper Gemini SDK — gọi 1 batch, parse JSON array.

Hỗ trợ chuỗi model dự phòng: thử model ưu tiên trước, khi gặp 429 (hết quota)
thì chuyển sang model kế tiếp và ghi nhớ model đã cạn để không gọi lại trong cùng lần chạy.
"""
import json
import logging
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

from app.config import settings
from app.services.prompt_builder import SYSTEM_INSTRUCTION

log = logging.getLogger(__name__)

_configured = False
_exhausted_models: set[str] = set()

# temperature=0 cho quyết định bảo trì ỔN ĐỊNH: cùng input → cùng mức rủi ro,
# tránh dao động HIGH/MEDIUM thất thường rồi bị fingerprint "đóng băng" mức sai.
GEN_TEMPERATURE = 0.0
_GEN_CONFIG = {"response_mime_type": "application/json", "temperature": GEN_TEMPERATURE}


def _ensure_configured():
    global _configured
    if _configured:
        return
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY chưa được cấu hình trong .env")
    genai.configure(api_key=settings.GEMINI_API_KEY)
    _configured = True


def reset_quota_state():
    """Xoá danh sách model bị đánh dấu hết quota — gọi ở đầu mỗi lần run_all."""
    _exhausted_models.clear()


def _parse(text: str) -> list[dict]:
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError(f"Gemini trả về không phải array: {type(data).__name__}")
    return data


def analyze_batch(prompt: str) -> tuple[list[dict], str]:
    """Gửi prompt, trả về (list dict đã parse, tên model đã dùng). Tự chuyển model dự phòng khi 429.

    Trả thêm `model_used` để analyzer ghi provenance (model nào tạo ra dự đoán).
    Raise nếu tất cả model đều hết quota, hoặc lỗi nặng khác (parse JSON / API).
    """
    _ensure_configured()

    last_quota_err: Exception | None = None
    for name in settings.gemini_models:
        if name in _exhausted_models:
            continue

        model = genai.GenerativeModel(name, system_instruction=SYSTEM_INSTRUCTION, generation_config=_GEN_CONFIG)
        try:
            resp = model.generate_content(prompt, request_options={"timeout": 60})
            text = resp.text.strip()
        except ResourceExhausted as e:
            log.warning("Model %s hết quota (429) — chuyển sang model dự phòng kế tiếp", name)
            _exhausted_models.add(name)
            last_quota_err = e
            continue
        except Exception as e:
            log.error("Gemini model %s gọi lỗi: %s", name, e)
            raise

        try:
            return _parse(text), name
        except json.JSONDecodeError as e:
            log.error("Parse JSON Gemini (%s) lỗi: %s\n--- raw ---\n%s\n----------", name, e, text[:500])
            raise

    if last_quota_err is not None:
        raise last_quota_err
    raise RuntimeError("Không có model Gemini nào khả dụng (kiểm tra GEMINI_MODEL/GEMINI_FALLBACK_MODELS)")
