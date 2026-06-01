# DUT Equip — AI Service

Service Python độc lập, phân tích rủi ro bảo trì thiết bị bằng **Gemini API** kết hợp **OpenWeather** (thời tiết Đà Nẵng).

- Đọc trực tiếp DB MySQL `qltbc_draft` (cùng DB với backend Spring Boot)
- Ghi kết quả vào bảng `ai_predictions` (cùng DB)
- Chạy tự động cron 02:00 hàng ngày, hoặc gọi `POST /run` để phân tích ngay
- Hiển thị trên Dashboard Admin (Block "Thiết bị cần bảo trì sắp tới")

## Cài đặt (lần đầu)

### 1. Tạo bảng `ai_predictions` trong MySQL

Mở MySQL Workbench, chạy:
```sql
USE qltbc_draft;
-- paste nội dung file migrations/001_ai_predictions.sql
```

### 2. Cài Python venv + dependencies

```powershell
cd "C:\Users\phamv\OneDrive\Máy tính\DATN\dut-equip-AI"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Cấu hình `.env`

Copy `.env.example` → `.env`, điền:
- `GEMINI_API_KEY` — lấy free tại https://aistudio.google.com/app/apikey
- `OPENWEATHER_API_KEY` — lấy free tại https://openweathermap.org/api (60 calls/min)
- DB credentials nếu khác mặc định

## Chạy

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Mở `http://localhost:8000/docs` (Swagger tự sinh) để xem 3 endpoint:
- `GET /health`
- `GET /predictions?risk=HIGH&limit=20`
- `POST /run`

## Kiểm tra nhanh

```powershell
# Trigger phân tích thủ công (chạy nền ~30-60s)
curl -X POST http://localhost:8000/run

# Xem kết quả (sau khi /run xong)
curl http://localhost:8000/predictions
```

Trong MySQL: `SELECT * FROM ai_predictions ORDER BY risk_score DESC;`

## Tích hợp với hệ thống

```
Frontend (5173) ──► Backend Spring Boot (8080) ──► AI Service (8000) ──► Gemini API
                            │                              │
                            └──── đọc ai_predictions ◄─────┘
                                  trong MySQL qltbc_draft
```

- Frontend bấm "Phân tích ngay" → backend `POST /api/v1/admin/ai/run` → backend forward sang Python `POST /run`
- Frontend GET danh sách → backend `GET /api/v1/admin/ai/predictions` (đọc DB trực tiếp, không qua Python)

## Cấu trúc

```
dut-equip-AI/
├── app/
│   ├── main.py              # FastAPI app + CORS + scheduler lifecycle
│   ├── config.py            # Pydantic Settings (.env)
│   ├── db.py                # SQLAlchemy engine
│   ├── models.py            # ORM mapping (read-only entities + AiPrediction)
│   ├── schemas.py           # Pydantic DTO
│   ├── scheduler.py         # APScheduler cron 02:00 mỗi ngày
│   ├── routers/             # FastAPI routers
│   └── services/
│       ├── weather.py       # OpenWeather (cache 1h)
│       ├── data_collector.py # Gom features 30/90 ngày từ MySQL
│       ├── prompt_builder.py # Build prompt tiếng Việt cho Gemini
│       ├── gemini_client.py  # Gọi Gemini, parse JSON
│       └── analyzer.py       # Orchestrator: batch theo loại thiết bị
└── migrations/
    └── 001_ai_predictions.sql
```

## Logic phân tích

Mỗi lần chạy (`run_all`):
1. Lấy thời tiết Đà Nẵng (cache 1h): OpenWeather cho hiện tại + dự báo 7 ngày tới + mật độ bụi (Air Pollution API), Open-Meteo cho lịch sử 7 & 30 ngày qua
2. Với MỖI `EquipType`: gom feature của tất cả thiết bị cùng loại (loại trừ DISPOSED và hidden)
3. Build 1 prompt duy nhất chứa cả batch + weather → gọi Gemini (1 request/loại)
4. Parse JSON array kết quả → UPSERT vào `ai_predictions`

Features mỗi thiết bị: `age_days`, `warranty_remaining_days`, `borrow_count_since_window`, `total_borrow_hours_since_window`, `last_maintenance_days_ago`, `maintenance_count_lifetime`, `damage_reports_since_window`, `building`, `building_category`, `window_basis`, `window_days`.

Cửa sổ thống kê (`since_window`) tính từ lần bảo trì gần nhất; nếu thiết bị chưa từng bảo trì thì tính từ ngày nhập (`created_at`). `window_days` cho biết độ dài cửa sổ để AI chuẩn hoá tần suất. `building_category`: toà id ≤ 17 = phòng học (ổn định), id > 17 = xưởng/khác (chịu môi trường nhiều).

## Troubleshooting

- **"GEMINI_API_KEY chưa được cấu hình"**: kiểm tra `.env` đã có key chưa và khởi động lại uvicorn
- **OpenWeather 401**: API key chưa active (mất ~10 phút sau khi đăng ký) hoặc sai key
- **Lỗi kết nối MySQL**: kiểm tra MySQL đang chạy, DB `qltbc_draft` tồn tại, user/password đúng
- **Gemini trả JSON không hợp lệ**: log Python ghi raw response 500 ký tự đầu — kiểm tra prompt; nâng `temperature` thấp hơn hoặc đổi `GEMINI_MODEL` sang `gemini-2.5-flash`
