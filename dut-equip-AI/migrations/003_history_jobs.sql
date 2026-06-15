-- Phần 1 + 2: lịch sử dự đoán (append-only) + provenance + theo dõi job.
-- Chạy MỘT lần trong MySQL Workbench (USE dut_equip; trước khi chạy).
-- Hai bảng này do Service AI quản lý; backend Java KHÔNG map nên không ảnh hưởng.

-- Lịch sử mọi dự đoán MỚI (luật-LOW hoặc LLM) theo thời gian — không ghi đè.
CREATE TABLE IF NOT EXISTS ai_prediction_history (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  run_id              VARCHAR(32) NOT NULL,
  equipment_id        BIGINT NOT NULL,
  generated_at        DATETIME NOT NULL,

  risk_level          VARCHAR(10) NOT NULL,
  risk_score          SMALLINT NOT NULL,
  days_to_maintenance SMALLINT NULL,
  will_fail_in_7d     BOOLEAN NOT NULL DEFAULT FALSE,
  reason              TEXT NULL,

  -- provenance
  source              VARCHAR(16) NOT NULL,          -- RULE_LOW | LLM
  model_used          VARCHAR(40) NULL,              -- gemini-2.5-flash / -lite (NULL nếu RULE_LOW)
  prompt_version      VARCHAR(20) NULL,
  code_version        VARCHAR(20) NULL,
  temperature         DECIMAL(3,2) NULL,

  weather_snapshot    JSON NULL,
  context_snapshot    JSON NULL,

  -- nhãn thực tế (điền sau bởi labeler)
  outcome_label       TINYINT NULL,                  -- 1 = có sự kiện, 0 = không
  outcome_event_type  VARCHAR(32) NULL,              -- MAINTENANCE | DAMAGE_REPORT | NONE
  outcome_observed_at DATETIME NULL,
  labeled_at          DATETIME NULL,

  INDEX idx_hist_equip_time (equipment_id, generated_at),
  INDEX idx_hist_run (run_id),
  INDEX idx_hist_label (outcome_label),
  INDEX idx_hist_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trạng thái mỗi lượt phân tích — theo dõi, retry/resume, cảnh báo lô lỗi.
CREATE TABLE IF NOT EXISTS ai_jobs (
  run_id          VARCHAR(32) PRIMARY KEY,
  started_at      DATETIME NOT NULL,
  finished_at     DATETIME NULL,
  status          VARCHAR(12) NOT NULL,              -- RUNNING | DONE | PARTIAL | FAILED
  trigger_source  VARCHAR(12) NULL,                  -- MANUAL | CRON
  full_sweep      BOOLEAN NOT NULL DEFAULT FALSE,
  n_total         INT NOT NULL DEFAULT 0,
  n_llm           INT NOT NULL DEFAULT 0,
  n_llm_calls     INT NOT NULL DEFAULT 0,
  n_rule_low      INT NOT NULL DEFAULT 0,
  n_skipped       INT NOT NULL DEFAULT 0,
  n_failed        INT NOT NULL DEFAULT 0,
  n_chunks        INT NOT NULL DEFAULT 0,
  n_chunks_failed INT NOT NULL DEFAULT 0,
  error_rate      DECIMAL(4,3) NOT NULL DEFAULT 0,
  error_message   TEXT NULL,

  INDEX idx_jobs_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
