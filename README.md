# DUT Equip — Hệ thống Quản lý Thiết bị công trường Đại học Bách Khoa Đà Nẵng
**Đại học Bách Khoa Đà Nẵng**

Hệ thống cho phép giảng viên mượn/trả thiết bị công của trường; admin quản lý danh mục thiết bị, duyệt đơn mượn, theo dõi bảo trì và phân tích rủi ro hỏng hóc bằng AI.

---

## 1. Kiến trúc tổng quan

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│  Frontend    │───►│  Backend        │───►│  AI Service      │
│  React+Vite  │    │  Spring Boot    │    │  FastAPI Python  │
└──────────────┘    └────────┬────────┘    └────────┬─────────┘
                             │                      │
                             ▼                      │
                     ┌────────────────┐             │
                     │  MySQL 8       │◄────────────┘
                     └────────────────┘
```

| Thành phần | Cổng | Công nghệ |
|---|---|---|
| Frontend | 5173 | React 19 + TypeScript + Vite + Tailwind + Zustand + React Query |
| Backend | 8080 | Spring Boot 3.2 (Java 21) + Spring Security + JWT + WebSocket |
| AI Service | 8000 | FastAPI + Gemini API + OpenWeather + APScheduler |
| Database | 3306 | MySQL 8 |

---

## 2. Yêu cầu môi trường

Trước khi chạy, đảm bảo máy đã cài:

- **Node.js** ≥ 20 (kèm npm)
- **JDK** 21 (Temurin / Oracle / OpenJDK)
- **Maven** 3.9+ (hoặc dùng `mvnw` đi kèm dự án)
- **Python** 3.10+ (kèm pip, venv)
- **MySQL Server** 8.x + **MySQL Workbench**
- **Git** (tùy chọn)

Kiểm tra nhanh:
```powershell
node -v
java -version
python --version
mysql --version
```

---

## 3. Chuẩn bị Database

1. Mở **MySQL Workbench**, kết nối tới `localhost:3306` (user `root`).
2. Tạo schema `qltbc_draft` (backend sẽ tự tạo bảng khi khởi động lần đầu nhờ `ddl-auto=update`):
   ```sql
   CREATE DATABASE IF NOT EXISTS qltbc_draft
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Sau khi backend chạy lần đầu xong, mở schema `qltbc_draft` và chạy migration cho AI:
   ```sql
   USE qltbc_draft;
   -- Mở file: dut-equip-AI/migrations/001_ai_predictions.sql và chạy nội dung
   ```

> Mặc định backend dùng `username=root`. Cấu hình `password` của bạn qua biến môi trường `DB_USERNAME`, `DB_PASSWORD`.

---

## 4. Chạy Backend (Spring Boot)

```powershell
cd backend
.\mvnw spring-boot:run
```

- API base URL: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

### Biến môi trường tùy chọn (PowerShell)

```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_NAME="qltbc_draft"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="<mật-khẩu-mysql-của-bạn>"
$env:JWT_SECRET="<chuỗi-bí-mật-tối-thiểu-256-bit>"
$env:AI_SERVICE_URL="http://localhost:8000"
```

Khóa Cloudinary (`CLOUDINARY_*`) đã có giá trị mặc định trong [application.properties](backend/src/main/resources/application.properties); chỉ cần override nếu muốn dùng tài khoản khác.

---

## 5. Chạy Frontend (React + Vite)

Lần đầu cài dependencies:
```powershell
cd frontend
npm install
```

Chạy dev server:
```powershell
npm run dev
```

- Local: `http://localhost:5173`
- Truy cập từ máy khác cùng LAN: `npm run dev:lan` rồi mở `http://<IP-máy-bạn>:5173`

Tài khoản Admin mặc định (sau khi backend seed lần đầu):
- Email: kiểm tra log backend hoặc seed file
- Mật khẩu mặc định cho giảng viên mới: `Dut@12345`

---

## 6. Chạy AI Service (FastAPI)

Lần đầu setup:
```powershell
cd dut-equip-AI
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Tạo file `.env` (copy từ `.env.example` nếu có), điền:
```
GEMINI_API_KEY=...           # https://aistudio.google.com/app/apikey
OPENWEATHER_API_KEY=...      # https://openweathermap.org/api
DB_HOST=localhost
DB_PORT=3306
DB_NAME=qltbc_draft
DB_USER=root
DB_PASSWORD=<mật-khẩu-mysql-của-bạn>
```

Chạy:
```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: `http://localhost:8000/docs`
- Phân tích thủ công: `POST http://localhost:8000/run`
- Cron tự động: 02:00 mỗi ngày

---

## 7. Thứ tự khởi động khuyến nghị

Mở **3 cửa sổ terminal** chạy song song:

1. **Terminal 1 — Backend**
   ```powershell
   cd backend
   .\mvnw spring-boot:run
   ```
2. **Terminal 2 — AI Service**
   ```powershell
   cd dut-equip-AI
   .\.venv\Scripts\Activate.ps1
   uvicorn app.main:app --reload --port 8000
   ```
3. **Terminal 3 — Frontend**
   ```powershell
   cd frontend
   npm run dev
   ```

Đảm bảo MySQL đã chạy trước khi mở backend và AI service.

---

## 8. Cấu trúc thư mục dự án

```
DATN/
├── README.md                 File này
├── backend/                  Spring Boot API
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/datn/backend/
│       └── resources/application.properties
├── frontend/                 React + Vite app
│   ├── package.json
│   └── src/
└── dut-equip-AI/             Python AI service
    ├── requirements.txt
    ├── app/
    └── migrations/001_ai_predictions.sql
```

---

## 9. Troubleshooting

| Lỗi | Nguyên nhân & cách xử lý |
|---|---|
| Backend không khởi động, lỗi connect MySQL | MySQL chưa chạy; sai user/password; chưa tạo schema `qltbc_draft` |
| Frontend gọi API lỗi CORS | Kiểm tra `app.cors.allowed-origins` trong [application.properties](backend/src/main/resources/application.properties) đã chứa origin của frontend |
| Đăng nhập trả 401 | Token JWT hết hạn (24h) — Axios interceptor tự logout, hãy đăng nhập lại |
| AI service báo `GEMINI_API_KEY chưa được cấu hình` | Kiểm tra file `.env`, restart `uvicorn` |
| OpenWeather trả 401 | API key mới đăng ký chưa active (đợi ~10 phút) |
| Bấm "Phân tích ngay" trên Dashboard không có kết quả | AI service chưa chạy ở cổng 8000 hoặc `AI_SERVICE_URL` sai |
| Port 5173/8080/8000 đã bị chiếm | Tắt tiến trình đang chiếm hoặc đổi port (Vite: `--port`, Spring: `server.port`, Uvicorn: `--port`) |

---

## 10. Liên kết hữu ích

- Backend Swagger: http://localhost:8080/swagger-ui.html
- AI Service Swagger: http://localhost:8000/docs
- Frontend dev: http://localhost:5173
- Quy tắc dự án: [CLAUDE.md](CLAUDE.md)
- Hướng dẫn AI service chi tiết: [dut-equip-AI/README.md](dut-equip-AI/README.md)
