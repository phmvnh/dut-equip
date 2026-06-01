# DUT Equip — Frontend

Giao diện web cho hệ thống **Quản lý Thiết bị Công — ĐH Bách Khoa Đà Nẵng**.
Phục vụ hai vai trò: **Giảng viên** (mượn/trả, xem lịch sử) và **Admin**
(quản lý thiết bị, duyệt đơn, bảo trì, thông báo).

## Tech stack

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS 3** — theming trắng + xanh `#2563eb`
- **Zustand 5** — state (auth token lưu in-memory, không localStorage)
- **TanStack Query 5** — cache & sync server state
- **React Router 7** — routing + guard cho khu Admin
- **Axios 1.15** — HTTP client, interceptor bắt 401 → logout
- **STOMP + SockJS** — chat & notification realtime
- **Recharts** — biểu đồ dashboard
- **qrcode.react** — QR thiết bị

## Yêu cầu

- Node.js 20+
- npm 10+
- Backend chạy ở `http://localhost:8080` (xem [../backend/README.md](../backend/README.md))

## Cấu hình

Tạo file `.env` ở thư mục `frontend/`:

```
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Khi chạy LAN (test trên điện thoại) dùng `npm run dev:lan` và chỉnh
`VITE_API_BASE_URL` sang IP LAN của máy backend.

## Scripts

```bash
npm install            # cài dependencies
npm run dev            # http://localhost:5173 (localhost only)
npm run dev:lan        # mở 0.0.0.0 cho thiết bị LAN truy cập
npm run build          # type-check + build production vào dist/
npm run preview        # preview bản build
npm run lint           # ESLint
```

## Cấu trúc thư mục

```
frontend/src/
├── api/            axiosClient.ts + *Api.ts theo module (auth, equip, borrow, ...)
├── components/     Navbar, DeviceRowCard, FilterBar, StatusPill, ...
├── pages/
│   ├── HomePage.tsx                Danh sách thiết bị (public + giảng viên)
│   ├── LoginPage.tsx
│   ├── NotificationsPage.tsx
│   ├── MobileEquipQRPage.tsx       Quét QR xem nhanh thiết bị
│   ├── account/                    Tab cá nhân giảng viên
│   │   ├── AccountPage.tsx         Layout
│   │   ├── ProfileTab.tsx
│   │   ├── ChangePasswordTab.tsx
│   │   ├── MyEquipTab.tsx          Thiết bị đang mượn
│   │   ├── HistoryTab.tsx          Lịch sử mượn
│   │   └── CompensationsTab.tsx
│   └── admin/                      Khu Admin (bọc AdminGuard)
│       ├── AdminPage.tsx           Layout sidebar
│       ├── DashboardPage.tsx
│       ├── EquipmentsPage.tsx
│       ├── EquipTypesPage.tsx
│       ├── BuildingsPage.tsx
│       ├── BorrowPage.tsx          Duyệt đơn mượn
│       ├── MaintenancePage.tsx
│       ├── CompensationsPage.tsx
│       ├── UsersPage.tsx
│       ├── NotificationsPage.tsx
│       ├── ChatPage.tsx
│       ├── ActivityLogsPage.tsx
│       ├── AdminProfilePage.tsx
│       └── SettingsPage.tsx
├── routes/         AppRouter.tsx, AdminGuard.tsx
├── store/          authStore.ts (Zustand, in-memory)
├── types/          auth.ts, device.ts, ...
└── utils/          statusConfig.ts, ...
```

## Quy ước

- **Ngôn ngữ giao diện:** tiếng Việt toàn bộ
- **Auth:** token JWT lưu trong Zustand store (in-memory). Reload trang =
  phải đăng nhập lại — đây là chủ đích, không phải bug
- **Routing:**
  - `/` — HomePage (public, hiển thị danh sách thiết bị)
  - `/login` — đăng nhập
  - `/account/*` — khu giảng viên
  - `/admin/*` — khu Admin, có `AdminGuard` redirect về `/login` nếu role ≠ `ADMIN`
- **API call:** tạo file `*Api.ts` trong `src/api/` thay vì gọi axios trực tiếp trong component
- **State server:** dùng React Query thay vì useState + useEffect

## Luồng đăng nhập

```
"/" (HomePage public) → "Đăng nhập" → "/login"
POST /api/v1/auth/login
  ├── role=ADMIN → "/admin/dashboard"
  ├── role=USER  → "/"
  └── lỗi → "Email hoặc mật khẩu không đúng"
Token hết hạn (24h) → axios interceptor bắt 401 → logout → "/login"
```

Chi tiết business rules và luồng đầy đủ xem [CLAUDE.md](../CLAUDE.md) ở root.
