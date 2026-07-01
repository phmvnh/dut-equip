"""Tính precision/recall/F1 từ lịch sử dự đoán ĐÃ GẮN NHÃN.

Dùng để: (a) viết chương Đánh giá, (b) làm cơ sở CÓ SỐ LIỆU để chỉnh prompt/ngưỡng/luật
của hệ LLM — KHÔNG dùng để thay LLM bằng model khác.
"""
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AiPredictionHistory


def _predicted_positive(risk_level: str, will_fail: bool, mode: str) -> bool:
    if mode == "high":
        return risk_level == "HIGH"
    if mode == "fail":
        return bool(will_fail)
    return risk_level == "HIGH" or bool(will_fail)  # high_or_fail (mặc định)


def _scores(tp: int, fp: int, fn: int, tn: int) -> dict:
    precision = tp / (tp + fp) if (tp + fp) else None
    recall = tp / (tp + fn) if (tp + fn) else None
    f1 = (2 * precision * recall / (precision + recall)
          if precision and recall else None)
    return {
        "tp": tp, "fp": fp, "fn": fn, "tn": tn,
        "precision": round(precision, 3) if precision is not None else None,
        "recall": round(recall, 3) if recall is not None else None,
        "f1": round(f1, 3) if f1 is not None else None,
        "n": tp + fp + fn + tn,
    }


def compute(db: Session, positive: str = "high_or_fail", since_days: int | None = None) -> dict:
    stmt = select(
        AiPredictionHistory.risk_level,
        AiPredictionHistory.will_fail_in_7d,
        AiPredictionHistory.outcome_label,
        AiPredictionHistory.source,
    ).where(AiPredictionHistory.outcome_label.isnot(None))
    if since_days:
        stmt = stmt.where(AiPredictionHistory.generated_at >= datetime.now() - timedelta(days=since_days))

    rows = db.execute(stmt).all()

    # bộ đếm tổng + theo nguồn
    overall = {"tp": 0, "fp": 0, "fn": 0, "tn": 0}
    by_source: dict[str, dict] = {}
    by_level: dict[str, dict] = {"HIGH": {"n": 0, "events": 0},
                                 "MEDIUM": {"n": 0, "events": 0},
                                 "LOW": {"n": 0, "events": 0}}

    for risk_level, will_fail, label, source in rows:
        pred_pos = _predicted_positive(risk_level, will_fail, positive)
        actual_pos = (label == 1)
        # Ma trận nhầm lẫn theo 1 dòng:
        #   pred=T, actual=T → tp  |  pred=T, actual=F → fp
        #   pred=F, actual=T → fn  |  pred=F, actual=F → tn
        cell = ("tp" if actual_pos else "fp") if pred_pos else ("fn" if actual_pos else "tn")
        overall[cell] += 1
        src = by_source.setdefault(source or "?", {"tp": 0, "fp": 0, "fn": 0, "tn": 0})
        src[cell] += 1
        lv = by_level.setdefault(risk_level, {"n": 0, "events": 0})
        lv["n"] += 1
        if actual_pos:
            lv["events"] += 1

    # tỉ lệ thực sự có sự kiện theo từng mức (HIGH nên cao, LOW nên thấp)
    for lv in by_level.values():
        lv["actual_event_rate"] = round(lv["events"] / lv["n"], 3) if lv["n"] else None

    return {
        "positive_definition": positive,
        "since_days": since_days,
        "labeled_total": len(rows),
        "overall": _scores(**overall),
        "by_source": {k: _scores(**v) for k, v in by_source.items()},
        "by_risk_level": by_level,
        "note": "Nhãn là proxy best-effort (bảo trì/báo hỏng thực tế trong cửa sổ quan sát).",
    }
