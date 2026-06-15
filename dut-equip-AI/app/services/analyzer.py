"""Orchestrator: gom data → lọc luật → bỏ thiết bị không đổi → gọi Gemini (batch gộp) → upsert.

Pipeline 3 tầng để quét nhanh & ít tốn quota khi dữ liệu nhiều:
  (3) triage     — chấm điểm bằng luật, gán LOW cho thiết bị an toàn, KHÔNG gọi AI.
  (2) fingerprint — bỏ qua thiết bị có đầu vào không đổi từ lần chạy trước.
  (1) batch      — gộp toàn bộ thiết bị còn lại vào ~1 call Gemini thay vì 1 call/loại.

Bổ sung: ghi LỊCH SỬ append-only + provenance; theo dõi JOB (retry/resume/cảnh báo);
quét toàn bộ ở lần chạy đầu trong ngày; gọi gắn nhãn cuối lượt.
"""
import logging
import time
from datetime import date, datetime
from sqlalchemy import text, select, func
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.config import settings
from app.models import AiPrediction, AiPredictionHistory, AiJob
from app.services import (
    weather, data_collector, gemini_client, prompt_builder, fingerprint, triage,
    risk_levels, labeler,
)

log = logging.getLogger(__name__)

_running = False
_last_gemini_call = 0.0

# Số thiết bị tối đa nhồi trong 1 prompt Gemini (chia khối để không vượt token TPM).
CHUNK_SIZE = 60
# Buộc phân tích lại nếu prediction cũ hơn ngần này ngày dù đầu vào không đổi (làm tươi).
STALE_DAYS = 7
STALE_DAYS_HIGH = 2  # thiết bị đang HIGH soi lại thường xuyên hơn.


def is_running() -> bool:
    return _running


def _throttle_gemini():
    """Giãn cách các lần gọi Gemini để không vượt GEMINI_RPM (free tier RPM=5)."""
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


def _normalize_prediction(p: dict) -> dict | None:
    """Chuẩn hoá 1 dự đoán: kẹp điểm, thống nhất mức theo risk_levels."""
    eq_id = p.get("equipment_id")
    if eq_id is None:
        return None
    risk_score = max(0, min(100, int(p.get("risk_score") or 0)))
    # Mức rủi ro: ưu tiên giá trị model trả; nếu lệch/thiếu → suy từ điểm theo ngưỡng chung.
    risk_level = risk_levels.normalize_level(p.get("risk_level"))
    if p.get("risk_level") is None:
        risk_level = risk_levels.score_to_level(risk_score)

    days_to = p.get("days_to_maintenance")
    if days_to is not None:
        try:
            days_to = int(days_to)
        except (ValueError, TypeError):
            days_to = None

    return {
        "equipment_id": eq_id,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "days_to_maintenance": days_to,
        "will_fail_in_7d": bool(p.get("will_fail_in_7d", False)),
        "reason": str(p.get("reason", "")).strip()[:2000],
    }


def _upsert_predictions(db: Session, predictions: list[dict], features_by_id: dict,
                        weather_snap: dict, run_id: str, source: str,
                        model_used: str | None, temperature: float | None):
    """Ghi bản mới nhất vào ai_predictions (ghi đè) VÀ append lịch sử + provenance."""
    import json
    now = datetime.now()
    weather_json = json.dumps(weather_snap, ensure_ascii=False, default=str)
    for raw in predictions:
        p = _normalize_prediction(raw)
        if p is None or p["equipment_id"] not in features_by_id:
            log.warning("Bỏ prediction không khớp equipment_id=%s", raw.get("equipment_id"))
            continue
        eq_id = p["equipment_id"]
        ctx = features_by_id.get(eq_id, {})
        ctx_json = json.dumps(ctx, ensure_ascii=False, default=str)

        db.execute(UPSERT_SQL, {
            "equipment_id": eq_id,
            "risk_level": p["risk_level"],
            "risk_score": p["risk_score"],
            "days_to_maintenance": p["days_to_maintenance"],
            "will_fail_in_7d": p["will_fail_in_7d"],
            "reason": p["reason"],
            "weather_snapshot": weather_json,
            "context_snapshot": ctx_json,
            "generated_at": now,
        })

        db.add(AiPredictionHistory(
            run_id=run_id,
            equipment_id=eq_id,
            generated_at=now,
            risk_level=p["risk_level"],
            risk_score=p["risk_score"],
            days_to_maintenance=p["days_to_maintenance"],
            will_fail_in_7d=p["will_fail_in_7d"],
            reason=p["reason"],
            source=source,
            model_used=model_used,
            prompt_version=prompt_builder.PROMPT_VERSION,
            code_version=settings.CODE_VERSION,
            temperature=temperature,
            weather_snapshot=weather_snap,
            context_snapshot=ctx,
        ))
    db.commit()


def _chunks(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def _load_existing(db: Session) -> dict[int, dict]:
    """Đọc prediction hiện có để quyết định bỏ qua thiết bị không đổi."""
    rows = db.execute(
        select(
            AiPrediction.equipment_id, AiPrediction.risk_level,
            AiPrediction.context_snapshot, AiPrediction.weather_snapshot,
            AiPrediction.generated_at,
        )
    ).all()
    return {
        r.equipment_id: {
            "risk_level": r.risk_level,
            "context": r.context_snapshot,
            "weather": r.weather_snapshot,
            "generated_at": r.generated_at,
        }
        for r in rows
    }


def _can_skip(prev: dict | None, fp_new: str, now: datetime) -> bool:
    """Bỏ qua nếu: đã có bản ghi + đầu vào không đổi (so fingerprint) + chưa quá hạn làm tươi."""
    if prev is None or prev.get("context") is None:
        return False
    prev_fp = fingerprint.compute(prev["context"], fingerprint.weather_bucket(prev["weather"] or {}))
    if prev_fp != fp_new:
        return False
    age_days = (now - prev["generated_at"]).days
    limit = STALE_DAYS_HIGH if prev["risk_level"] == "HIGH" else STALE_DAYS
    return age_days < limit


def _is_first_run_today(db: Session) -> bool:
    """Hôm nay đã có lượt hoàn tất (DONE/PARTIAL) chưa? Chưa → đây là lượt đầu trong ngày."""
    today = date.today()
    cnt = db.execute(
        select(func.count(AiJob.run_id))
        .where(AiJob.status.in_(("DONE", "PARTIAL")))
        .where(func.date(AiJob.started_at) == today)
    ).scalar() or 0
    return cnt == 0


def _done_equipment_ids(db: Session, run_id: str) -> set[int]:
    """Thiết bị đã có dòng lịch sử cho run_id này (phục vụ resume)."""
    rows = db.execute(
        select(AiPredictionHistory.equipment_id).where(AiPredictionHistory.run_id == run_id)
    ).scalars().all()
    return set(rows)


def run_all(trigger_source: str = "MANUAL", resume_run_id: str | None = None,
            force_full: bool | None = None) -> dict:
    """Quét tất cả thiết bị qua pipeline triage → fingerprint → batch Gemini, upsert kết quả.

    trigger_source: MANUAL (nút bấm) | CRON (lịch).
    resume_run_id: tiếp tục một lượt dở (bỏ qua thiết bị đã xong trong run_id đó).
    force_full: bỏ qua fingerprint-skip, quét TOÀN BỘ. None → tự quyết (lần đầu trong ngày).
    """
    global _running
    if _running:
        return {"status": "skipped", "message": "Đang có 1 lần phân tích chạy"}

    _running = True
    started = datetime.now()
    gemini_client.reset_quota_state()
    n_total = n_skipped = n_low_rule = n_llm = n_llm_calls = n_failed = 0
    n_chunks = n_chunks_failed = 0
    job_status = "DONE"
    error_message = None

    db = SessionLocal()
    try:
        # Khởi tạo / mở lại bản ghi job
        run_id = resume_run_id or started.strftime("%Y%m%d-%H%M%S")
        full_sweep = force_full if force_full is not None else (
            settings.AI_FULL_SWEEP_FIRST_RUN and _is_first_run_today(db)
        )
        if resume_run_id:
            job = db.get(AiJob, run_id)
            if job is None:
                job = AiJob(run_id=run_id, started_at=started)
                db.add(job)
            job.status = "RUNNING"
        else:
            job = AiJob(run_id=run_id, started_at=started, status="RUNNING")
            db.add(job)
        job.trigger_source = trigger_source
        job.full_sweep = bool(full_sweep)
        db.commit()

        weather_snap = weather.get_danang_weather()
        hourly = weather.get_hourly_series()
        wbucket = fingerprint.weather_bucket(weather_snap)
        existing = _load_existing(db)
        already_done = _done_equipment_ids(db, run_id) if resume_run_id else set()

        # (1) Gom feature toàn bộ thiết bị, đính kèm tên loại vào từng thiết bị.
        all_features: list[dict] = []
        for et in data_collector.get_active_equip_types(db):
            feats = data_collector.collect_features_for_type(
                db, et.id, history_days=settings.AI_HISTORY_DAYS, hourly=hourly
            )
            for f in feats:
                f["equip_type"] = et.name
            all_features.extend(feats)
        n_total = len(all_features)
        features_by_id = {f["id"]: f for f in all_features}

        # (2) fingerprint skip (bỏ qua khi full_sweep) + (3) triage split
        low_now: list[tuple[dict, int]] = []
        to_llm: list[dict] = []
        for f in all_features:
            if f["id"] in already_done:   # resume: đã xử lý ở lần chạy trước của run_id
                n_skipped += 1
                continue
            if not full_sweep:
                fp = fingerprint.compute(f, wbucket)
                if _can_skip(existing.get(f["id"]), fp, started):
                    n_skipped += 1
                    continue
            score = triage.heuristic_score(f)
            if triage.clearly_low(f, score):
                low_now.append((f, score))
            else:
                to_llm.append(f)

        # (3) Upsert nhánh LOW xác định bằng luật — không tốn quota.
        if low_now:
            preds = [triage.low_prediction(f, s) for f, s in low_now]
            _upsert_predictions(db, preds, features_by_id, weather_snap,
                                run_id=run_id, source="RULE_LOW",
                                model_used=None, temperature=None)
            n_low_rule = len(preds)

        # (1) Batch các thiết bị cần AI thành ~1 call (chia khối nếu quá nhiều).
        for chunk in _chunks(to_llm, CHUNK_SIZE):
            n_chunks += 1
            prompt = prompt_builder.build_batch_prompt(chunk, weather_snap)
            try:
                _throttle_gemini()
                predictions, model_used = gemini_client.analyze_batch(prompt)
                _upsert_predictions(db, predictions, features_by_id, weather_snap,
                                    run_id=run_id, source="LLM",
                                    model_used=model_used,
                                    temperature=gemini_client.GEN_TEMPERATURE)
                n_llm += len(chunk)
                n_llm_calls += 1
            except Exception as e:
                n_failed += len(chunk)
                n_chunks_failed += 1
                error_message = str(e)[:1000]
                log.error("Lỗi chunk %d thiết bị: %s", len(chunk), e)
                continue

        # Trạng thái job theo tỉ lệ lô lỗi.
        error_rate = (n_chunks_failed / n_chunks) if n_chunks else 0.0
        if n_chunks_failed == 0:
            job_status = "DONE"
        elif error_rate >= settings.AI_ERROR_RATE_ALERT:
            job_status = "FAILED"
            log.warning("Tỉ lệ lô lỗi cao %.0f%% (%d/%d) — đánh dấu job FAILED",
                        error_rate * 100, n_chunks_failed, n_chunks)
        else:
            job_status = "PARTIAL"

        # Cập nhật & đóng job
        job.finished_at = datetime.now()
        job.status = job_status
        job.n_total = n_total
        job.n_llm = n_llm
        job.n_llm_calls = n_llm_calls
        job.n_rule_low = n_low_rule
        job.n_skipped = n_skipped
        job.n_failed = n_failed
        job.n_chunks = n_chunks
        job.n_chunks_failed = n_chunks_failed
        job.error_rate = round(error_rate, 3)
        job.error_message = error_message
        db.commit()

        # Gắn nhãn các dự đoán đã quá cửa sổ quan sát (không chặn luồng nếu lỗi).
        try:
            labeled = labeler.run(db)
        except Exception as e:
            labeled = 0
            log.error("Gắn nhãn lỗi: %s", e)
    finally:
        db.close()
        _running = False

    elapsed = (datetime.now() - started).total_seconds()
    log.info(
        "Xong [%s, %s]: %d thiết bị (AI %d qua %d call, luật-LOW %d, bỏ-qua %d, lỗi %d), "
        "gắn nhãn %d, trong %.1fs",
        run_id, job_status, n_total, n_llm, n_llm_calls, n_low_rule, n_skipped, n_failed,
        labeled, elapsed,
    )
    return {
        "status": "done",
        "run_id": run_id,
        "job_status": job_status,
        "full_sweep": bool(full_sweep),
        "message": (
            f"[{job_status}] Đã xử lý {n_total} thiết bị: {n_llm} qua AI ({n_llm_calls} call), "
            f"{n_low_rule} gán LOW bằng luật, {n_skipped} bỏ qua, lỗi {n_failed}; "
            f"gắn nhãn {labeled}; {elapsed:.1f}s"
        ),
    }
