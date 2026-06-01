# DUT Equip — Backend

Backend cho hệ thống **Quản lý Thiết bị Công — ĐH Bách Khoa Đà Nẵng**.
Cung cấp REST API cho giảng viên mượn/trả thiết bị và Admin quản lý danh mục,
duyệt đơn, theo dõi bảo trì, gửi thông báo.

## Tech stack

- **Spring Boot 3.2.4** trên **Java 21**
- **Spring Security + JWT** (jjwt 0.12.6) — auth, phân quyền `USER` / `ADMIN`
- **Spring Data JPA + Hibernate** trên **MySQL 8**
- **Spring WebSocket (STOMP)** — chat & notification realtime
- **Cloudinary** — upload ảnh thiết bị, avatar
- **springdoc-openapi 2.5** — Swagger UI

## Yêu cầu

- JDK 21
- Maven 3.9+ (hoặc dùng wrapper `./mvnw`)
- MySQL 8.x (schema mặc định: `dut_equip`)
- Tài khoản Cloudinary (tùy chọn — đã có default trong properties)

## Cấu hình

Cấu hình mặc định nằm ở [src/main/resources/application.properties](src/main/resources/application.properties).
Có thể override bằng biến môi trường:

| Biến | Mặc định | Mục đích |
|---|---|---|
| `DB_HOST` | `localhost` | Host MySQL |
| `DB_PORT` | `3306` | Port MySQL |
| `DB_NAME` | `dut_equip` | Tên schema |
| `DB_USERNAME` | `root` | User DB |
| `DB_PASSWORD` | `phmvnh` | Password DB |
| `JWT_SECRET` | dev-only | Secret ký JWT (≥ 256-bit khi chạy thật) |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | có sẵn dev | Credential Cloudinary |
| `AI_SERVICE_URL` | `http://localhost:8000` | Service AI dự đoán bảo trì (FastAPI) |

Schema sẽ được tạo tự động (`spring.jpa.hibernate.ddl-auto=update`).
Token JWT mặc định sống **24h** (`jwt.expiration=86400000`).

CORS đã mở sẵn cho `http://localhost:5173` và một vài IP LAN — chỉnh
`app.cors.allowed-origins` nếu chạy ở host khác.

## Chạy local

```bash
cd backend
./mvnw spring-boot:run
```

- API base: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

Build JAR production:

```bash
./mvnw clean package
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

Chạy test:

```bash
./mvnw test
```

## Modules API chính

Mỗi controller tương ứng một nhóm endpoint dưới prefix `/api/v1`:

| Controller | Mô tả |
|---|---|
| `AuthController` | Đăng nhập, đổi mật khẩu, refresh token |
| `UserController` | Quản lý tài khoản giảng viên (Admin tạo/sửa/khóa) |
| `BuildingController` | 15 khu/tòa nhà cố định, seed sẵn |
| `EquipTypeController` | Loại thiết bị — Admin CRUD |
| `EquipController` | Thiết bị — CRUD, lọc, đổi trạng thái |
| `BorrowController` | Đơn mượn — tạo, duyệt, từ chối, trả |
| `MaintenanceController` | Lịch sử bảo trì |
| `CompensationController` | Đền bù khi thiết bị hỏng |
| `NotificationController` | Thông báo cho giảng viên |
| `ChatController` + `ChatWebSocketController` | Chat giảng viên ↔ Admin (STOMP) |
| `DashboardController` | Thống kê cho trang Admin |
| `ActivityLogController` | Log thao tác |
| `AIPredictionController` | Proxy sang FastAPI để dự đoán bảo trì |
| `UploadController` | Upload ảnh lên Cloudinary |
| `SettingController` | Cấu hình hệ thống |

Response wrapper chuẩn:

```json
{ "success": true, "message": "...", "data": { ... } }
```

## Cấu trúc thư mục

```
backend/src/main/java/com/datn/backend/
├── config/         SecurityConfig, CorsConfig, SwaggerConfig, WebSocketConfig
├── controller/     REST endpoints
├── service/        Business logic — interface + impl/
├── repository/     Spring Data JPA
├── entity/         JPA entities
├── dto/            *Request, *Response, ApiResponse<T>
├── enums/          DeviceStatus, BorrowStatus, Role, NotificationType, MaintenanceStatus
├── exception/      GlobalExceptionHandler + custom exceptions
├── security/       JwtUtil, JwtAuthFilter, UserDetailsServiceImpl
└── util/
```

## Business rules tóm tắt

- Tối đa **7 ngày/lần mượn**, **5 thiết bị/giảng viên** cùng lúc
- Chỉ mượn thiết bị `status = AVAILABLE`
- Đơn mượn: `PENDING` → `APPROVED` / `REJECTED` → `RETURNED` (hoặc `OVERDUE`)
- Scheduler chạy hàng ngày:
  - **00:00** — chuyển đơn `APPROVED` quá hạn thành `OVERDUE`
  - **08:00** — gửi `RETURN_REMINDER` cho đơn còn 1 ngày tới hạn
- Mật khẩu mặc định khi Admin tạo tài khoản: `Dut@12345`

Chi tiết đầy đủ xem [CLAUDE.md](../CLAUDE.md) ở root dự án.
