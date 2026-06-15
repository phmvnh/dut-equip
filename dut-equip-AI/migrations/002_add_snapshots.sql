-- Bổ sung 2 cột snapshot mà AI service cần ghi (lưu features + thời tiết lúc phân tích).
-- Cần khi bảng ai_predictions được Hibernate (backend, ddl-auto=update) tạo trước,
-- vì entity backend KHÔNG map 2 cột này. Backend bỏ qua cột thừa nên không ảnh hưởng.
-- Chạy MỘT lần trong MySQL Workbench (USE dut_equip; trước khi chạy).

ALTER TABLE ai_predictions
  ADD COLUMN weather_snapshot JSON NOT NULL,
  ADD COLUMN context_snapshot JSON NOT NULL;
