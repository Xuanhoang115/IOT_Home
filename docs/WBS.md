# WORK BREAKDOWN STRUCTURE (WBS) – LỊCH TRÌNH 6 TUẦN (5 THÀNH VIÊN)

## Phân công Vai trò Nhóm (5 Sinh viên)

| Mã TV | Vai trò chính | Trách nhiệm cốt lõi |
| :---: | :--- | :--- |
| **TV1** | **Mobile Lead (React Native / Expo)** | Thiết kế UI/UX, xây dựng 10 màn hình, tích hợp API & Firebase listener trên App |
| **TV2** | **Firebase & Cloud Architect** | Quản lý Firebase Auth, Realtime Database Schema, Security Rules, Seed Data & FCM |
| **TV3** | **Backend & API Engineer** | Xây dựng Node.js + Express + TypeScript, MQTT Bridge, Zod validation, Simulator & Tests |
| **TV4** | **Embedded & Hardware Engineer** | Lắp ráp mạch ESP32, cảm biến, MOSFET, Servo, nguồn 5V, viết Firmware C++ & làm mô hình |
| **TV5** | **QA, MQTT Broker & Technical PM** | Cấu hình HiveMQ Cloud, MQTTX, kiểm thử tích hợp E2E, quản lý tiến độ, báo cáo & video |

---

## Chi Tiết Công Việc 6 Tuần

### Tuần 1 – Phân tích và Thiết kế
| Mã CV | Công việc | Phụ trách | Deadline | Sản phẩm bàn giao (Deliverables) |
| :---: | :--- | :---: | :---: | :--- |
| `W1.1` | Thiết kế kiến trúc hệ thống, wireframe 10 màn hình, khởi tạo Git repository & cấu trúc thư mục | **TV1** | Cuối Ngày 3 - Tuần 1 | `docs/ARCHITECTURE.md`, Wireframe UI, Git repo chuẩn |
| `W1.2` | Tạo project Firebase, thiết kế Realtime Database schema & cấu hình Email/Password Auth | **TV2** | Cuối Ngày 5 - Tuần 1 | `firebase/database.rules.json`, `docs/FIREBASE_SETUP.md` |
| `W1.3` | Đặc tả API Contract (OpenAPI/Markdown), khởi tạo khung project Backend TypeScript | **TV3** | Cuối Ngày 6 - Tuần 1 | Khung `backend/`, đặc tả endpoint & Zod schema |
| `W1.4` | Chốt danh mục linh kiện (BOM ≤ 1.000.000đ), sơ đồ chân GPIO ESP32 30 chân & thiết kế nguồn | **TV4** | Cuối Ngày 5 - Tuần 1 | `docs/BOM.md`, `docs/WIRING.md`, `docs/POWER_SUPPLY.md` |
| `W1.5` | Tạo cluster HiveMQ Cloud (TLS 8883), quy ước MQTT Topics và kiểm thử kết nối bằng MQTTX | **TV5** | Cuối Ngày 7 - Tuần 1 | `docs/MQTT_TOPICS.md`, `docs/HIVEMQ_SETUP.md`, ảnh chụp MQTTX |

---

### Tuần 2 – Xây dựng Module Độc lập
| Mã CV | Công việc | Phụ trách | Deadline | Sản phẩm bàn giao (Deliverables) |
| :---: | :--- | :---: | :---: | :--- |
| `W2.1` | Xây dựng màn hình Splash, Login, Register, Dashboard và khung điều hướng chuẩn | **TV1** | Cuối Ngày 6 - Tuần 2 | UI chạy trên Expo Go (iPhone 14 Plus & Android) |
| `W2.2` | Viết Firebase Security Rules chống giả mạo `reportedState` và script seed dữ liệu mẫu | **TV2** | Cuối Ngày 5 - Tuần 2 | `scripts/seed-firebase.ts`, dữ liệu mẫu trên Firebase |
| `W2.3` | Lập trình kết nối Node.js ↔ HiveMQ Cloud (TLS) và công cụ giả lập ESP32 (`simulator`) | **TV3** | Cuối Ngày 6 - Tuần 2 | `backend/src/mqtt/`, `backend/simulator/` chạy ổn định |
| `W2.4` | Lắp mạch trên breadboard và viết firmware cơ bản: ESP32 kết nối Wi-Fi + đọc DHT22 + bật/tắt LED | **TV4** | Cuối Ngày 6 - Tuần 2 | Firmware đọc đúng nhiệt độ/độ ẩm, điều khiển 2 LED |
| `W2.5` | Kiểm thử bản tin MQTT qua MQTTX với Simulator và viết bộ Test Cases ban đầu | **TV5** | Cuối Ngày 7 - Tuần 2 | `docs/TEST_PLAN.md`, biên bản test MQTT |

---

### Tuần 3 – Tích hợp Điều khiển Thiết bị
| Mã CV | Công việc | Phụ trách | Deadline | Sản phẩm bàn giao (Deliverables) |
| :---: | :--- | :---: | :---: | :--- |
| `W3.1` | Kết nối Mobile App với REST API điều khiển và lắng nghe `reportedState` từ Firebase | **TV1** | Cuối Ngày 6 - Tuần 3 | Màn hình Devices & Room Details có trạng thái `PENDING`/ACK |
| `W3.2` | Đồng bộ hóa `desiredState`, `reportedState` và `esp32/status` (Online/Offline) trên Firebase | **TV2** | Cuối Ngày 5 - Tuần 3 | Luồng đồng bộ Realtime DB < 1 giây |
| `W3.3` | Hoàn thiện API `POST /api/devices/:id/commands`, cơ chế `requestId`, ACK và timeout `8000ms` | **TV3** | Cuối Ngày 5 - Tuần 3 | API điều khiển đầy đủ validation & xử lý timeout |
| `W3.4` | Lắp mạch Quạt DC 5V (qua MOSFET), Servo SG90 (nguồn 5V ngoài + tụ lọc) và nhận lệnh MQTT TLS | **TV4** | Cuối Ngày 6 - Tuần 3 | ESP32 bật/tắt quạt, đóng/mở cửa servo không bị reset nguồn |
| `W3.5` | Kiểm thử End-to-End luồng điều khiển Đèn, Quạt, Cửa từ điện thoại xuống mạch thật | **TV5** | Cuối Ngày 7 - Tuần 3 | Báo cáo kết quả test điều khiển E2E |

---

### Tuần 4 – Cảm biến, Chế độ Auto và Cảnh báo
| Mã CV | Công việc | Phụ trách | Deadline | Sản phẩm bàn giao (Deliverables) |
| :---: | :--- | :---: | :---: | :--- |
| `W4.1` | Xây dựng màn hình `Sensors`, `Alerts`, `History`, `Settings` và công tắc chuyển `Manual/Auto` | **TV1** | Cuối Ngày 6 - Tuần 4 | Đủ 10 màn hình trên ứng dụng Mobile |
| `W4.2` | Lưu trữ lịch sử cảm biến có giới hạn tần suất (throttling), phân trang `activityLogs` & `alerts` | **TV2** | Cuối Ngày 5 - Tuần 4 | Cấu trúc lưu trữ tối ưu dung lượng trên Firebase |
| `W4.3` | Xử lý sự kiện cảm biến PIR, MQ-2, tạo cảnh báo khẩn cấp và chống spam thông báo (cooldown) | **TV3** | Cuối Ngày 5 - Tuần 4 | Service xử lý cảnh báo + tích hợp FCM |
| `W4.4` | Lắp cảm biến PIR, MQ-2 (có cầu phân áp 3.3V), Buzzer, nút nhấn vật lý và logic `Manual/Auto` (hysteresis quạt) | **TV4** | Cuối Ngày 6 - Tuần 4 | Firmware hoàn chỉnh có chống rung nút nhấn & còi báo động |
| `W4.5` | Kiểm thử kịch bản cảm biến (khói an toàn, chuyển động) và kịch bản mất kết nối Wi-Fi/MQTT | **TV5** | Cuối Ngày 7 - Tuần 4 | Biên bản test cảm biến, LWT và tự kết nối lại |

---

### Tuần 5 – Hoàn thiện, Kiểm thử Tự động và Lắp Mô hình
| Mã CV | Công việc | Phụ trách | Deadline | Sản phẩm bàn giao (Deliverables) |
| :---: | :--- | :---: | :---: | :--- |
| `W5.1` | Tinh chỉnh giao diện trên iPhone 14 Plus & Android, hoàn thiện thông báo 3 trạng thái | **TV1** | Cuối Ngày 5 - Tuần 5 | Giao diện mượt, rõ ràng, xử lý đầy đủ trạng thái lỗi |
| `W5.2` | Kiểm thử bảo mật Firebase Database Rules (chặn đọc/ghi trái phép và chặn sửa `reportedState`) | **TV2** | Cuối Ngày 4 - Tuần 5 | Báo cáo kiểm thử bảo mật Rules |
| `W5.3` | Viết Unit Test & Integration Test (Vitest), bổ sung rate limiting và logging có kiểm soát | **TV3** | Cuối Ngày 5 - Tuần 5 | Bộ test `backend/tests/` pass 100% |
| `W5.4` | Dựng mô hình nhà bằng foam/mica, cố định dây dẫn, kiểm tra nguồn Adapter 5V 2A và Power Bank | **TV4** | Cuối Ngày 6 - Tuần 5 | Mô hình nhà thông minh hoàn chỉnh chạy độc lập |
| `W5.5` | Chạy toàn bộ kịch bản Integration Test, quản lý danh sách bug và xác nhận fix lỗi | **TV5** | Cuối Ngày 7 - Tuần 5 | Bug log = 0 lỗi nghiêm trọng (Critical/High) |

---

### Tuần 6 – Nghiệm thu, Đóng gói và Bảo vệ Đồ án
| Mã CV | Công việc | Phụ trách | Deadline | Sản phẩm bàn giao (Deliverables) |
| :---: | :--- | :---: | :---: | :--- |
| `W6.1` | Đóng gói bản final Mobile App, chuẩn bị kịch bản demo trực tiếp trên iPhone 14 Plus | **TV1** | Cuối Ngày 3 - Tuần 6 | Source code `mobile/` hoàn chỉnh |
| `W6.2` | Hoàn thiện tài liệu cấu hình Firebase, hướng dẫn Notifications & dọn dẹp dữ liệu demo | **TV2** | Cuối Ngày 3 - Tuần 6 | `docs/FIREBASE_SETUP.md`, `docs/NOTIFICATIONS.md` |
| `W6.3` | Đóng gói Backend final, tài liệu API và kịch bản chạy Simulator dự phòng khi bảo vệ | **TV3** | Cuối Ngày 3 - Tuần 6 | Source code `backend/`, `docs/DEPLOYMENT.md` |
| `W6.4` | Kiểm tra lần cuối mô hình phần cứng, quay video demo thực tế đầy đủ 16 tiêu chí nghiệm thu | **TV4** | Cuối Ngày 4 - Tuần 6 | Mô hình vật lý + Video Demo Full HD |
| `W6.5` | Tổng hợp báo cáo cuối kỳ, slide thuyết trình, bảng câu hỏi phản biện và tổ chức chạy thử bảo vệ | **TV5** | Cuối Ngày 6 - Tuần 6 | Báo cáo Word/PDF, Slide thuyết trình, Biên bản nghiệm thu |
