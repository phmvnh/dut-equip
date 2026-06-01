INSERT IGNORE INTO buildings (id, name, environment_stability) VALUES
  (1,  'Khu A',                'STABLE'),
  (2,  'Khu B ',               'STABLE'),
  (3,  'Khu C khối 1 ',        'STABLE'),
  (4,  'Khu C khối 2 ',        'STABLE'),
  (5,  'Khu C khối 3 ',        'STABLE'),
  (6,  'Khu C khối 4 ',        'STABLE'),
  (7,  'Khu C khối 5 ',        'STABLE'),
  (8,  'Khu E ',               'STABLE'),
  (9,  'Khu F ',               'STABLE'),
  (10, 'Khu H ',               'STABLE'),
  (11, 'Hội trường F',         'STABLE'),
  (12, 'Khu PFIEV',            'STABLE'),
  (13, 'Khu S Smart Building', 'STABLE'),
  (14, 'Khu D - Khu TN-TH',    'STABLE'),
  (15, 'Khu TN điện',          'STABLE'),
  (16, 'Khu TN cơ khí',        'STABLE'),
  (17, 'Khu G',                'STABLE'),
  (18, 'Viện Cơ khí',          'VOLATILE'),
  (19, 'Xưởng nhiệt',          'VOLATILE'),
  (20, 'PTN nhiệt điện lạnh',  'VOLATILE'),
  (21, 'Xưởng ươm tạo',        'VOLATILE'),
  (22, 'PTN công trình thuỷ',  'VOLATILE'),
  (23, 'Trung tâm AVL',        'VOLATILE'),
  (24, 'Xưởng động lực',       'VOLATILE'),
  (25, 'Xưởng cơ khí',         'VOLATILE'),
  (26, 'TTTN & Động cơ ô tô',  'VOLATILE'),
  (27, 'TN gia công áp lực',   'VOLATILE'),
  (28, 'Thực hành điện',       'VOLATILE'),
  (29, 'Xưởng thực hành',      'VOLATILE'),
  (30, 'Xưởng thực tập XDDD',  'VOLATILE'),
  (31, 'Xưởng điêu khắc',      'VOLATILE'),
  (32, 'Xưởng điện',           'VOLATILE'),
  (33, 'TTNC Điện & Điện tử',  'VOLATILE'),
  (34, 'Nhà kho',              'VOLATILE'),
  (35, 'Nhà thi đấu',          'VOLATILE');

INSERT IGNORE INTO equip_types (id, name, created_at, updated_at) VALUES
  (1,  'Máy tính / Thiết bị CNTT',            NOW(), NOW()), -- Gồm Laptop, PC, Máy chủ
  (2,  'Thiết bị ngoại vi & Văn phòng',       NOW(), NOW()), -- Màn hình rời, Máy scan, Máy in văn phòng
  (3,  'Thiết bị mạng & Viễn thông',          NOW(), NOW()), -- Router, Switch, Máy phát sóng
  (4,  'Thiết bị trình chiếu & Giảng đường',  NOW(), NOW()), -- Máy chiếu, Bảng tương tác, Tivi
  (5,  'Thiết bị âm thanh & Quay phim',       NOW(), NOW()), -- Camera, Micro, Loa, Amply (Thay cho mục 5, 21, 22)
  (6,  'Thiết bị nguồn & Lưu điện',           NOW(), NOW()), -- UPS, Máy biến áp, Biến tần
  (7,  'Thiết bị đo lường & Thử nghiệm điện', NOW(), NOW()), -- Đồng hồ vạn năng, Dao động ký (Oscilloscope)
  (8,  'Bộ kit vi điều khiển & Nhúng',        NOW(), NOW()), -- Raspberry Pi, Arduino, Kit vi xử lý
  (9,  'Hệ thống điều khiển tự động hóa',     NOW(), NOW()), -- Bộ thí nghiệm PLC, Mô hình cơ điện tử
  (10, 'Thiết bị gia công & Tạo mẫu',         NOW(), NOW()), -- Máy CNC, Máy in 3D, Máy hàn, Máy cắt
  (11, 'Thiết bị & Dụng cụ thí nghiệm cơ lý', NOW(), NOW()), -- Bơm thủy lực, Thiết bị đo cơ khí, Thử tải
  (12, 'Thiết bị trắc địa & Khảo sát',        NOW(), NOW()), -- Máy kinh vĩ, Máy toàn đạc, GPS chuyên dụng
  (13, 'Thiết bị thí nghiệm hóa - sinh',      NOW(), NOW()), -- Tủ hút, Máy ly tâm, Kính hiển vi, Dụng cụ thủy tinh
  (14, 'Thiết bị kiểm định vật liệu xây dựng',NOW(), NOW()), -- Máy nén bê tông, Máy kéo thép
  (15, 'Thiết bị điện tử y sinh',             NOW(), NOW()); -- Hoặc các thiết bị đặc thù khác nếu cần

INSERT IGNORE INTO users (full_name, email, password_hash, role, faculty, is_active, created_at, updated_at)
VALUES (
  'Quản trị viên',
  'admin@dut.udn.vn',
  '$2a$12$pO7VG4HapUphlwF7Qk.dEuK.w8yHD1LxIxVNPHokSjkl2uD3jMxnC', -- admindut123@
  'ADMIN',
  'Phòng Quản lý Tài sản Công',
  true,
  NOW(),
  NOW()
);