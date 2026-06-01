"""Orchestrator: gom data → gọi Gemini theo loại → upsert ai_predictions."""
import logging
import time
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.config import settings
from app.services import weather, data_collector, gemini_client, prompt_builder

log = logging.getLogger(__name__)

_running = False
_last_gemini_call = 0.0


def is_running() -> bool:
    return _running


def _throttle_gemini():
    """Giãn cách các lần gọi Gemini để không vượt GEMINI_RPM (free tier 15 RPM)."""
    global _last_gemini_call
    min_interval = 60.0 / max(1, settings.GEMINI_RPM)
    elapsed = time.monotonic() - _last_gemini_call
    if elapsed < min_interval:
        time.sleep(min_interval - elapsed)
    _last_gemini_call = time.monotonic()


UPSERT_SQL = text("""
    INSERT INTO ai_predictions
      (equipment_id, risk_level, risk_score, days_to_maintenance, will_fail_in_7d,
       reason, weather_snapshot, context_snapshot, generated_at)
    VALUES
      (:equipment_id, :risk_level, :risk_score, :days_to_maintenance, :will_fail_in_7d,
       :reason, :weather_snapshot, :context_snapshot, :generated_at)
    ON DUPLICATE KEY UPDATE
      risk_level=VALUES(risk_level),
      risk_score=VALUES(risk_score),
      days_to_maintenance=VALUES(days_to_maintenance),
      will_fail_in_7d=VALUES(will_fail_in_7d),
      reason=VALUES(reason),
      weather_snapshot=VALUES(weather_snapshot),
      context_snapshot=VALUES(context_snapshot),
      generated_at=VALUES(generated_at)
""")


def _upsert_predictions(db: Session, predictions: list[dict], features_by_id: dict, weather_snap: dict):
    import json
    now = datetime.now()
    for p in predictions:
        eq_id = p.get("equipment_id")
        ctx = features_by_id.get(eq_id, {})
        if eq_id is None or eq_id not in features_by_id:
            log.warning("Bỏ prediction không khớp equipment_id=%s", eq_id)
            continue

        risk_level = str(p.get("risk_level", "LOW")).upper()
        if risk_level not in ("HIGH", "MEDIUM", "LOW"):
            risk_level = "LOW"

        risk_score = int(p.get("risk_score") or 0)
        risk_score = max(0, min(100, risk_score))

        days_to = p.get("days_to_maintenance")
        if days_to is not None:
            try:
                days_to = int(days_to)
            except (ValueError, TypeError):
                days_to = None

        db.execute(UPSERT_SQL, {
            "equipment_id": eq_id,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "days_to_maintenance": days_to,
            "will_fail_in_7d": bool(p.get("will_fail_in_7d", False)),
            "reason": str(p.get("reason", "")).strip()[:2000],
            "weather_snapshot": json.dumps(weather_snap, ensure_ascii=False, default=str),
            "context_snapshot": json.dumps(ctx, ensure_ascii=False, default=str),
            "generated_at": now,
        })
    db.commit()


def run_all() -> dict:
    """Quét tất cả loại thiết bị, gọi Gemini, upsert kết quả."""
    global _running
    if _running:
        return {"status": "skipped", "message": "Đang có 1 lần phân tích chạy"}

    _running = True
    started = datetime.now()
    gemini_client.reset_quota_state()
    total_types = 0
    total_devices = 0
    total_failed_types = 0

    try:
        weather_snap = weather.get_danang_weather()
        db = SessionLocal()
        try:
            equip_types = data_collector.get_active_equip_types(db)
            for et in equip_types:
                features = data_collector.collect_features_for_type(
                    db, et.id, history_days=settings.AI_HISTORY_DAYS
                )
                if not features:
                    continue

                features_by_id = {f["id"]: f for f in features}
                prompt = prompt_builder.build_batch_prompt(et.name, features, weather_snap)

                try:
                    _throttle_gemini()
                    predictions = gemini_client.analyze_batch(prompt)
                    _upsert_predictions(db, predictions, features_by_id, weather_snap)
                    total_types += 1
                    total_devices += len(features)
                    log.info("OK loại=%s, %d thiết bị", et.name, len(features))
                except Exception as e:
                    total_failed_types += 1
                    log.error("Lỗi loại=%s: %s", et.name, e)
                    continue
        finally:
            db.close()
    finally:
        _running = False

    elapsed = (datetime.now() - started).total_seconds()
    return {
        "status": "done",
        "message": (
            f"Đã phân tích {total_devices} thiết bị thuộc {total_types} loại "
            f"(lỗi {total_failed_types} loại) trong {elapsed:.1f}s"
        ),
    }
