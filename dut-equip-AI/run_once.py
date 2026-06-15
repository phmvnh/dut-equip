"""Chạy phân tích AI một lần rồi thoát.

Dùng cho Windows Task Scheduler (7h sáng hằng ngày) — KHÔNG cần uvicorn đang chạy.
Gọi cùng hàm phân tích mà nút "Phân tích ngay" dùng: analyzer.run_all().

Tham số:
  (không có)        chạy 1 lượt phân tích (trigger=CRON; lần đầu trong ngày → quét toàn bộ)
  --full            ép quét TOÀN BỘ thiết bị (bỏ qua fingerprint-skip)
  --resume <run_id> tiếp tục một lượt dở (bỏ qua thiết bị đã xong)
  --label           chỉ chạy gắn nhãn thực tế (không phân tích)
"""
import logging
import sys

from app.services import analyzer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
log = logging.getLogger("run_once")


def main(argv: list[str]) -> int:
    args = set(argv)

    if "--label" in args:
        from app.db import SessionLocal
        from app.services import labeler
        log.info("Chỉ gắn nhãn thực tế (feedback loop)...")
        db = SessionLocal()
        try:
            n = labeler.run(db)
            log.info("Đã gắn nhãn %d dòng", n)
            return 0
        except Exception:
            log.exception("Gắn nhãn thất bại")
            return 1
        finally:
            db.close()

    force_full = "--full" in args
    resume_run_id = None
    if "--resume" in argv:
        i = argv.index("--resume")
        if i + 1 < len(argv):
            resume_run_id = argv[i + 1]

    log.info("Bắt đầu phân tích AI (one-shot, CRON)...")
    try:
        result = analyzer.run_all(
            trigger_source="CRON",
            resume_run_id=resume_run_id,
            force_full=True if force_full else None,
        )
        log.info("Kết quả: %s", result.get("message", result))
        return 0
    except Exception:
        log.exception("Phân tích AI thất bại")
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
