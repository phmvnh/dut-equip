# CLAUDE.md — Root
# DUT Equip · Hệ thống Quản lý Thiết bị Công
# ĐH Bách Khoa Đà Nẵng

> Đọc file này trước mọi phiên làm việc.
> frontend/CLAUDE.md và backend/CLAUDE.md bổ sung thêm — không thay thế file này.

---

## PHẦN 1 — QUY TẮC HÀNH VI (áp dụng toàn bộ dự án)

> Nguồn: Karpathy Guidelines — giảm lỗi AI coding phổ biến.

### 1. Nghĩ trước khi code
- Nêu rõ giả định trước khi implement. Nếu không chắc → hỏi.
- Nếu có nhiều cách hiểu yêu cầu → trình bày các phương án, không tự chọn ngầm.
- Nếu có cách đơn giản hơn → nói ra, đừng im lặng làm theo cách phức tạp.
- Nếu yêu cầu mơ hồ → dừng lại, đặt tên rõ điều đang mơ hồ, hỏi lại.

### 2. Đơn giản là trên hết
- Viết đúng đủ những gì được yêu cầu. Không thêm tính năng ngoài scope.
- Không tạo abstraction cho code chỉ dùng một lần.
- Không thêm "flexibility" hay "configurability" khi không được yêu cầu.
- Không xử lý lỗi cho tình huống không thể xảy ra.
- Nếu 200 dòng có thể viết lại thành 50 → viết lại.

### 3. Chỉ chạm vào thứ cần sửa
- Khi edit code có sẵn: không tự ý format lại, refactor chỗ khác, hay "cải thiện" code lân cận.
- Match style hiện tại của codebase, dù bạn có thể làm khác đi.
- Nếu thấy dead code không liên quan → đề cập, không tự xóa.
- Khi thay đổi của bạn tạo ra orphan → xóa những thứ bạn làm thừa, không xóa thứ có sẵn.
- Kiểm tra: mọi dòng thay đổi phải truy ngược về đúng yêu cầu.

### 4. Định nghĩa "xong" trước khi làm
- "Thêm validation" → "Viết test cho input không hợp lệ, rồi làm test pass"
- "Sửa bug" → "Viết test reproduce bug, rồi làm test pass"
- "Refactor X" → "Đảm bảo test pass trước và sau khi refactor"

---

## PHẦN 2 — TỔNG QUAN DỰ ÁN

**Tên hệ thống:** DUT Equip
**Mục đích:** Giảng viên ĐH Bách Khoa Đà Nẵng mượn/trả thiết bị công của trường.
Admin quản lý danh mục thiết bị, duyệt đơn mượn, theo dõi bảo trì, gửi thông báo.

**Người dùng:**
- Chỉ có Giảng viên và Admin — không có sinh viên, không có đăng ký public
- Admin tạo sẵn tài khoản cho giảng viên, mật khẩu mặc định: Dut1234@
- Giảng viên đăng nhập và đổi mật khẩu sau lần đầu

**Tech stack:**
- Frontend: React 18 + TypeScript + Tailwind CSS + Zustand + React Query + Axios
- Backend: Spring Boot 3.x (Java 17) + Spring Security + JWT
- Database: MySQL 8 · schema: dut_qltbc · quản lý bằng MySQL Workbench
- API: RESTful, prefix /api/v1, response wrapper ApiResponse<T>

**Phong cách UI:** Gọn gàng, hiện đại. Màu chủ đạo: trắng + xanh #2563eb.
Text giao diện: tiếng Việt toàn bộ.

**Hai role:**
- USER  — xem thiết bị, tạo đơn mượn, xem lịch sử cá nhân, nhận thông báo
- ADMIN — CRUD thiết bị, duyệt/từ chối đơn, quản lý bảo trì, quản lý user, xem báo cáo

---

## PHẦN 3 — DATABASE (dut_qltbc)

Chi tiết schema xem tại file `schema.sql`. Tóm tắt 7 bảng:

| Bảng | Công dụng |
|---|---|
| `buildings` | 15 khu/tòa nhà cố định của trường, seed sẵn, Admin không tạo thêm |
| `device_types` | Loại thiết bị — Admin tự tạo/sửa/xóa |
| `users` | Tài khoản giảng viên và Admin |
| `equipments` | Bảng chính — thông tin thiết bị |
| `equipment_images` | Ảnh phụ của thiết bị, hiển thị khi xem chi tiết |
| `borrow_requests` | Đơn mượn thiết bị của giảng viên |
| `maintenance_logs` | Lịch sử bảo trì từng thiết bị |
| `notifications` | Thông báo gửi đến giảng viên |

---

## PHẦN 4 — BUSINESS RULES

**Mượn thiết bị:**
- Chỉ mượn thiết bị status=AVAILABLE
- Tối đa 7 ngày/lần · tối đa 5 thiết bị/user cùng lúc
- Thiết bị MAINTENANCE hoặc BROKEN không thể mượn

**Vòng đời đơn mượn:**
- Tạo đơn → PENDING, chờ Admin duyệt
- Admin duyệt → APPROVED, equipment.status=BORROWED, gửi notification BORROW_APPROVED
- Admin từ chối → REJECTED, ghi reject_reason, gửi notification BORROW_REJECTED
- Trả thiết bị → RETURNED, equipment.status=AVAILABLE, ghi actual_return_date

**Tự động (Scheduler):**
- 00:00 hàng ngày → chuyển OVERDUE khi return_date < today và status=APPROVED
- 08:00 hàng ngày → gửi RETURN_REMINDER khi return_date = today+1

**Tài khoản:**
- Admin tạo tài khoản giảng viên, mật khẩu mặc định: Dut@12345
- Admin có thể khóa tài khoản (is_active=0) → user không thể đăng nhập
- Validate ở Service layer, không dùng DB constraint

---

## PHẦN 5 — LUỒNG XỬ LÝ CHÍNH

**Luồng đăng nhập:**
```
User truy cập "/" → hiển thị HomePage (public)
Click "Đăng nhập" → chuyển đến "/login"
Nhập email + password → gọi POST /api/v1/auth/login
  ├── Thành công + role=ADMIN → lưu token vào Zustand → redirect "/admin/dashboard"
  ├── Thành công + role=USER  → lưu token vào Zustand → redirect "/"
  └── Thất bại → hiển thị lỗi "Email hoặc mật khẩu không đúng"
Token hết hạn (24h) → Axios interceptor bắt 401 → logout → redirect "/login"
```

**Luồng mượn thiết bị:**
```
Giảng viên xem danh sách thiết bị ở HomePage
Click "Mượn ngay" → mở form mượn
Điền: Khu (dropdown) + Phòng (nhập tay) + Ngày mượn + Ngày trả + Ghi chú
Submit → POST /api/v1/borrow → status=PENDING
Admin vào trang Đơn mượn → thấy đơn mới → Duyệt hoặc Từ chối
  ├── Duyệt → equipment.status=BORROWED → gửi notification cho giảng viên
  └── Từ chối → nhập lý do → gửi notification cho giảng viên
Giảng viên trả thiết bị → Admin xác nhận trả → equipment.status=AVAILABLE
```

**Luồng Admin tạo tài khoản giảng viên:**
```
Admin vào trang Người dùng → Click "+ Thêm giảng viên"
Nhập: Họ tên, Email, Khoa (bắt buộc) + SĐT (tùy chọn)
Hệ thống tạo tài khoản, mật khẩu mặc định: Dut@12345
Admin thông báo cho giảng viên qua email/trực tiếp
```

**Luồng bảo trì:**
```
Admin chuyển thiết bị sang status=MAINTENANCE
Tạo maintenance_log: ghi người thực hiện, ngày bắt đầu, mô tả
Khi xong → Admin cập nhật status=DONE, ghi end_date
Hệ thống tự chuyển equipment.status=AVAILABLE
Gửi notification MAINTENANCE_DONE cho các user đang theo dõi
```

---

## PHẦN 6 — CẤU TRÚC THƯ MỤC PROJECT

```
DATN/
├── CLAUDE.md
├── frontend/
│   └── src/
│       ├── api/            axiosClient.ts + *Api.ts theo module
│       ├── components/     Navbar, DeviceRowCard, FilterBar, StatusPill
│       ├── pages/
│       │   ├── admin/      AdminPage (layout) + DashboardPage, DevicesPage,
│       │   │               BorrowPage, MaintenancePage, UsersPage,
│       │   │               DeviceTypesPage, SettingsPage
│       │   ├── HomePage.tsx
│       │   └── LoginPage.tsx
│       ├── routes/         AppRouter.tsx, AdminGuard.tsx
│       ├── store/          authStore.ts (Zustand — token lưu memory, không localStorage)
│       ├── types/          auth.ts, device.ts
│       └── utils/          statusConfig.ts
└── backend/
    └── src/main/java/com/datn/backend/
        ├── config/         SecurityConfig, CorsConfig, SwaggerConfig
        ├── controller/
        ├── service/        interface + impl/
        ├── repository/
        ├── entity/
        ├── dto/            *Request.java, *Response.java, ApiResponse.java
        ├── enums/          DeviceStatus, BorrowStatus, Role, NotificationType, MaintenanceStatus
        ├── exception/      GlobalExceptionHandler, BadRequestException, ResourceNotFoundException
        ├── security/       JwtUtil, JwtAuthFilter, UserDetailsServiceImpl
        └── util/
```

---

## PHẦN 7 — MÔI TRƯỜNG

```bash
# Frontend
cd frontend && npm run dev           # http://localhost:5173

# Backend
cd backend && ./mvnw spring-boot:run # http://localhost:8080
# Swagger: http://localhost:8080/swagger-ui.html

# Database — MySQL Workbench
# Host: localhost | Port: 3306 | Schema: dut_qltbc
```

```
# frontend/.env
VITE_API_BASE_URL=http://localhost:8080/api/v1

# backend/application.properties
spring.datasource.url=jdbc:mysql://localhost:3306/dut_qltbc?useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.jpa.hibernate.ddl-auto=validate
jwt.secret=<min-256-bit>
jwt.expiration=86400000
spring.mail.host=smtp.gmail.com
spring.mail.port=587
borrow.max-days=7
borrow.max-per-user=5
```