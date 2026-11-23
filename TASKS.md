# TASKS – SMART HOME IoT 2026

Bảng theo dõi tiến độ theo 12 Phase bắt buộc và phân công cho 5 thành viên:
- **TV1**: Mobile Engineer (UI/UX, Expo, Navigation, Screens)
- **TV2**: Firebase & Cloud Architect (Auth, Realtime DB, Rules, Seed Data)
- **TV3**: Backend Engineer (Node.js, Express, MQTT.js, Zod, Simulator, Tests)
- **TV4**: Embedded & Hardware Engineer (ESP32 Firmware, Sensors, Actuators, Nguồn & Mô hình)
- **TV5**: QA, MQTT Broker & Technical PM (HiveMQ, MQTTX, Test Plan, WBS, Báo cáo & Demo)

---

## PHASE 1: Phân tích yêu cầu và thiết kế kiến trúc
- [x] **[TV1, TV5]** Khảo sát workspace hiện tại và đối chiếu cấu trúc dự án (`PROJECT_CONTEXT.md`)
- [x] **[TV1, TV3]** Thiết kế kiến trúc tổng thể Mobile – Backend – HiveMQ – ESP32 – Firebase (`docs/ARCHITECTURE.md`)
- [x] **[TV5]** Lập WBS 6 tuần cho 5 thành viên kèm deadline và deliverables (`docs/WBS.md`)
- [x] **[TV4]** Lập BOM chi tiết, đối chiếu ngân sách ≤ 1.000.000 VNĐ, kiểm tra dòng tiêu thụ & pinout ESP32 (`docs/BOM.md`, `docs/WIRING.md`, `docs/POWER_SUPPLY.md`)
- [x] **[TV3, TV5]** Quy ước MQTT Topics, JSON Schema, QoS, Retained, LWT, chống lặp lệnh (`docs/MQTT_TOPICS.md`)
- [x] **[TV2]** Thiết kế schema Firebase Realtime Database và Security Rules (`firebase/database.rules.json`, `docs/FIREBASE_SETUP.md`)
- [x] **[TV1, TV2, TV3, TV5]** Tài liệu hóa thông báo 3 trạng thái, kế hoạch kiểm thử và hướng dẫn triển khai (`docs/NOTIFICATIONS.md`, `docs/TEST_PLAN.md`, `docs/DEPLOYMENT.md`)

## PHASE 2: Tạo cấu trúc project, README, TASKS, PROJECT_CONTEXT
- [x] **[TV1, TV3, TV4]** Khởi tạo cấu trúc thư mục `mobile/`, `backend/`, `firmware/esp32-smarthome/`, `firebase/`, `docs/`, `scripts/`
- [x] **[TV5]** Tạo `README.md`, `PROJECT_CONTEXT.md`, `TASKS.md`
- [x] **[TV2, TV3, TV4]** Tạo `.env.example` cho `mobile/`, `backend/` và `secrets.example.h` cho `firmware/`, cập nhật `.gitignore`

## PHASE 3: HiveMQ + MQTTX
- [x] **[TV5]** Cấu hình HiveMQ Cloud cluster, tạo credentials riêng cho `backend` và `esp32`, cấu hình TLS port `8883` (`docs/HIVEMQ_SETUP.md`)
- [x] **[TV5]** Tạo bộ script/cấu hình mẫu kiểm thử Publish/Subscribe và LWT trên MQTTX Desktop (`scripts/mqttx-smarthome-collection.json`, `scripts/test-hivemq.ts`)

## PHASE 4: Node.js + MQTT.js + Simulator
- [x] **[TV3]** Khởi tạo `backend/package.json`, `tsconfig.json` (`strict: true`), cấu hình Express + Zod + Rate Limiter + Error Handler
- [x] **[TV3]** Xây dựng MQTT service kết nối HiveMQ Cloud (TLS, Reconnect, xử lý duplicate message, timeout lệnh) (`backend/src/mqtt/mqttClient.ts`, `backend/src/services/commandService.ts`)
- [x] **[TV3]** Xây dựng các REST API endpoints (`/api/health`, `/api/rooms`, `/api/devices`, `/api/devices/:id`, `POST /api/devices/:id/commands`, `/api/sensors/latest`, `/api/alerts`, `/api/history`, `POST /api/notifications/register-token`)
- [x] **[TV3]** Xây dựng ESP32 Simulator (`backend/simulator/esp32-simulator.ts`) phản hồi ACK, `reportedState` và giả lập cảm biến
- [x] **[TV3]** Viết Unit Test & Integration Test với Vitest (`backend/tests/`)

## PHASE 5: Firebase Auth + Realtime Database
- [x] **[TV2]** Tích hợp Firebase Admin SDK vào Backend để verify ID Token và kiểm tra quyền truy cập `home1` (`backend/src/services/firebaseService.ts`, `backend/src/middleware/authMiddleware.ts`)
- [x] **[TV2]** Đồng bộ dữ liệu từ MQTT sang Firebase (`devices`, `latestSensors`, `sensorReadings`, `commands`, `alerts`, `activityLogs`)
- [x] **[TV2]** Viết script seed dữ liệu mẫu (`backend/scripts/seed-firebase.ts`) để chạy app ngay khi chưa cắm phần cứng

## PHASE 6: React Native Expo App
- [x] **[TV1]** Chuẩn hóa Mobile App (Expo SDK 54 + TypeScript) trong `mobile/`, bảo toàn và sửa toàn bộ lỗi trong `src/`
- [x] **[TV1]** Triển khai đủ 10 màn hình: `Splash/Loading`, `Login`, `Register`, `Dashboard`, `Devices`, `Room Details`, `Sensors`, `Alerts`, `History`, `Settings` (`mobile/app/`)
- [x] **[TV1, TV2]** Tích hợp REST API & đồng bộ trạng thái realtime (`mobile/contexts/SmartHomeContext.tsx`, `mobile/services/api.ts`), xử lý trạng thái `PENDING` chờ `reportedState`/ACK kèm timeout

## PHASE 7: ESP32 Firmware
- [x] **[TV4]** Cấu hình sketch Arduino IDE cho ESP32 DevKit CP2102 30 chân (`firmware/esp32-smarthome/esp32-smarthome.ino`, `include/config.h`) — *đã build & nạp lên bo thật (COM5)*
- [x] **[TV4]** Lập trình kết nối Wi-Fi, MQTT over TLS (`WiFiClientSecure`), Last Will and Testament, tự động reconnect không dùng `delay()` dài (`esp32-smarthome.ino`) — *đã test kết nối EMQX Cloud TLS :8883 trên mạch thật*
- [x] **[TV4]** Lập trình đọc cảm biến (`DHT22`, `PIR`, `MQ-2`), điều khiển `LED`, `Quạt MOSFET`, `Servo SG90`, `Buzzer` và nút nhấn vật lý có debounce — *đã test thực tế: 2 LED, Quạt MOSFET, DHT22, 2 nút nhấn vật lý*
- [x] **[TV4]** Kiểm tra thời hạn lệnh MQTT và đối chiếu thiết bị trong firmware trước khi tác động GPIO.
- [x] **[TV4]** Verify sketch với Arduino IDE, nạp lên bo và kiểm tra NTP, TLS, lệnh quá hạn, lệnh trùng, reconnect và LWT theo README firmware.

## PHASE 8: Tích hợp điều khiển
- [x] **[TV1, TV3, TV4]** Kiểm thử luồng điều khiển End-to-End: Mobile/Web → Backend API → MQTT TLS → ESP32 → Phản hồi `reportedState` → Firebase → Mobile/Web (2 Đèn LED + Quạt MOSFET)
- [x] **[TV3, TV4]** Kiểm thử xử lý lệnh trùng (`requestId`), timeout khi ESP32 offline và đồng bộ 2 nút nhấn vật lý (`BTN_LIGHT` D19, `BTN_DOOR` D18) lên App theo thời gian thực

## PHASE 9: Cảm biến, cửa tự động, cảnh báo
- [x] **[TV3, TV4]** Triển khai chế độ `Manual` / `Auto` (tự bật quạt có hysteresis theo nhiệt độ ≥ 31°C, tắt ≤ 29.5°C; còi Buzzer cảnh báo độc lập)
- [x] **[TV4]** Lắp đặt và tích hợp thực tế Cảm biến chuyển động `PIR HC-SR501` (`D35`), Cảm biến khói `MQ-2` (`D34` có Auto-Baseline), Cảm biến lửa `Flame Sensor` (`D33`), Màn hình `OLED 0.96" I2C` (`D21/D22`), và tối ưu `Smart Detach` + cảm biến từ `MC-38` (`D32`) cho Cửa *(Phần hàn gắn cơ học Servo để sau)*

## PHASE 10: Notification
- [x] **[TV1, TV2, TV3]** Triển khai cảnh báo `Foreground` (in-app banner), đồng bộ xác nhận cảnh báo thời gian thực giữa iPhone và máy tính, chống spam cảnh báo trùng *(Phần Android Development Build FCM để sau vì đang dùng iPhone)*

## PHASE 11: Kiểm thử và sửa lỗi
- [x] **[TV5, Toàn nhóm]** Thực hiện đầy đủ Test Cases trong `docs/TEST_PLAN.md` (Unit, Integration, E2E, mất mạng, Watchdog Offline & Timeout 8s)

## PHASE 12: Báo cáo và chuẩn bị bảo vệ
- [x] **[TV4, TV5]** Tổng hợp kịch bản trình diễn bảo vệ đồ án (`docs/DEMO_SCRIPT.md`), tài liệu kiến trúc & kiểm thử (`docs/`) *(Phần lắp thêm linh kiện Servo/MQ-2/PIR và build Android APK để sau khi có linh kiện)*
