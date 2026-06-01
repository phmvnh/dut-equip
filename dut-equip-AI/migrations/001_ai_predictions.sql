-- Chạy MỘT lần trong MySQL Workbench (USE qltbc_draft trước khi chạy)

CREATE TABLE IF NOT EXISTS ai_predictions (
  equipment_id        BIGINT PRIMARY KEY,
  risk_level          ENUM('HIGH','MEDIUM','LOW') NOT NULL,
  risk_score          TINYINT UNSIGNED NOT NULL,
  days_to_maintenance SMALLINT NULL,
  will_fail_in_7d     BOOLEAN NOT NULL DEFAULT FALSE,
  reason              TEXT NOT NULL,
  weather_snapshot    JSON NOT NULL,
  context_snapshot    JSON NOT NULL,
  generated_at        DATETIME NOT NULL,
  CONSTRAINT fk_ai_pred_equipment FOREIGN KEY (equipment_id)
    REFERENCES equipments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_ai_pred_risk ON ai_predictions(risk_level, generated_at);
