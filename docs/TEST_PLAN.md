# KẾ HOẠCH KIỂM THỬ (TEST PLAN) – 16 TIÊU CHÍ NGHIỆM THU

## 1. Chiến Lược Kiểm Thử 4 Tầng

1. **Unit Tests (Backend - Vitest)**:
   - Kiểm tra Zod validation schemas cho lệnh điều khiển (`light1`, `light2`, `fan1`, `door1`) và payload cảm biến.
   - Kiểm tra logic chống lặp bản tin (`requestId` deduplication).
   - Kiểm tra logic hysteresis của chế độ `Auto` và cooldown chống spam cảnh báo.
2. **Integration Tests (Backend API + Mock Firebase/MQTT - Vitest & Supertest)**:
   - Kiểm tra bảo mật Auth Middleware (`401 Unauthorized` khi thiếu token, `403 Forbidden` khi không có quyền `home1`).
   - Kiểm tra các endpoint: `GET /api/health`, `GET /api/rooms`, `GET /api/devices`, `POST /api/devices/:id/commands`, `GET /api/sensors/latest`, `GET /api/alerts`, `GET /api/history`.
   - Kiểm tra cơ chế timeout lệnh điều khiển khi ESP32 không phản hồi `reportedState`.
3. **Simulation Tests (Backend + MQTTX + ESP32 Simulator)**:
   - Chạy `backend/simulator/` kết nối thật tới HiveMQ Cloud để kiểm thử toàn bộ luồng Mobile ↔ Backend ↔ HiveMQ ↔ Firebase trước khi nạp vào mạch thật.
4. **Hardware-in-the-Loop (HIL) & End-to-End Tests (Trên Mô hình Thật)**:
   - Thực hiện 16 kịch bản nghiệm thu bắt buộc bên dưới.

---

## 2. Bảng 16 Kịch Bản Kiểm Thử Nghiệm Thu (Acceptance Test Cases)

| Mã TC | Tên kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi |
| :---: | :--- | :--- | :--- |
| `TC-01` | **Đăng ký, Đăng nhập & Đăng xuất trên Điện thoại** | Mở App trên iPhone 14 Plus / Android → Đăng nhập bằng tài khoản Email/Password đã cấp quyền `home1` | Đăng nhập thành công, lấy được ID Token và vào màn hình `Dashboard` |
| `TC-02` | **MQTTX kết nối HiveMQ Cloud (TLS)** | Mở MQTTX Desktop → Kết nối `mqtts://<host>:8883` → Subscribe `smarthome/home1/#` | Kết nối TLS thành công, thấy các bản tin trạng thái và cảm biến chảy về |
| `TC-03` | **ESP32 kết nối Broker & Báo Online** | Cấp nguồn cho ESP32 → Quan sát Serial Monitor và màn hình `Dashboard` trên App | ESP32 kết nối Wi-Fi + HiveMQ TLS, publish `online: true` lên `esp32/status`, App hiện chấm xanh **ESP32 Online** |
| `TC-04` | **App bật/tắt LED thật (`light1`, `light2`)** | Nhấn công tắc Đèn Phòng khách trên App | Nút hiện trạng thái `Đang xử lý...` → LED trên mô hình sáng → ESP32 gửi `reportedState: ON` → App chuyển công tắc sang `BẬT` |
| `TC-05` | **App bật/tắt Quạt DC 5V thật (`fan1`)** | Nhấn công tắc Quạt trên App (chế độ `MANUAL`) | Module MOSFET kích dẫn, quạt 5V quay êm, ESP32 không bị sụt áp/reset, App cập nhật trạng thái quạt `BẬT` |
| `TC-06` | **App mở/đóng Cửa bằng Servo SG90 (`door1`)** | Nhấn nút Mở Cửa trên App, sau đó nhấn Nút nhấn vật lý tại cửa | Servo SG90 quay đúng góc mở (`90°`) và góc đóng (`0°`), App cập nhật trạng thái lệnh Servo tương ứng |
| `TC-07` | **DHT22 gửi Nhiệt độ & Độ ẩm thực tế** | Quan sát thông số trên `Dashboard` & `Sensors`, hà hơi nhẹ vào DHT22 | Nhiệt độ và độ ẩm trên App tăng lên theo thời gian thực |
| `TC-08` | **PIR phát hiện Chuyển động** | Đưa tay qua trước cảm biến `PIR HC-SR501` | ESP32 publish `motionDetected: true`, màn hình `Sensors` / `Dashboard` cập nhật trạng thái có chuyển động |
| `TC-09` | **MQ-2 tạo Cảnh báo Khói/Khí an toàn** | Đưa bông tẩm một chút cồn y tế lại gần đầu đọc `MQ-2` (sau khi đã sấy 30s) | Giá trị ADC vượt ngưỡng, ESP32 phát bản tin lên `smarthome/home1/alerts` |
| `TC-10` | **Buzzer hoạt động tại Mô hình** | Tiếp nối `TC-09` (hoặc ngắt Wi-Fi rồi đưa bông cồn vào `MQ-2`) | Buzzer trên mô hình kêu cảnh báo ngay lập tức kể cả khi mất kết nối Backend |
| `TC-11` | **Firebase cập nhật Trạng thái chuẩn xác** | Mở Firebase Console → Realtime Database trong lúc bật/tắt thiết bị | `desiredState` và `reportedState` trong nhánh `devices/home1` cập nhật đúng thực tế |
| `TC-12` | **Lịch sử Hoạt động (`History`) được lưu** | Vào màn hình `History` trên App sau khi bật đèn, mở cửa | Hiển thị danh sách lịch sử có thời gian, tên thiết bị, nguồn tác động (`App` / `Nút vật lý` / `Auto`) |
| `TC-13` | **Cảnh báo xuất hiện trong App (`Alerts`)** | Quan sát App khi `TC-09` xảy ra ở trạng thái Foreground (và Background nếu dùng Dev Build) | Hiện Banner cảnh báo ngay trên App và lưu vào danh sách màn hình `Alerts` |
| `TC-14` | **Phát hiện Mất mạng & Xử lý Timeout / Reconnect** | Rút nguồn ESP32 → Thử bấm bật đèn trên App → Cấp nguồn lại cho ESP32 | Khi rút nguồn: LWT báo ESP32 **Offline**; bấm lệnh trên App sau 8s báo **Timeout lỗi**; khi cấp nguồn lại: ESP32 tự kết nối lại và **không** tự mở cửa cũ |
| `TC-15` | **Mô hình chạy bằng Nguồn riêng độc lập** | Rút cáp USB khỏi máy tính, cấp nguồn bằng Adapter 5V 2A hoặc Power Bank 5V 2A | Toàn bộ hệ thống (ESP32, Quạt, Servo, Cảm biến) hoạt động ổn định độc lập |
| `TC-16` | **Hồ sơ Tài liệu, Sơ đồ & Video Demo hoàn chỉnh** | Kiểm tra thư mục `docs/`, `README.md`, `TASKS.md`, `PROJECT_CONTEXT.md` | Đầy đủ tài liệu kiến trúc, sơ đồ đấu dây, BOM, WBS 6 tuần và kịch bản bảo vệ |
