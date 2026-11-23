# PROJECT CONTEXT – SMART HOME IoT 2026

Tài liệu này lưu giữ ngữ cảnh kỹ thuật xuyên suốt dự án để các thành viên và AI Assistant luôn đồng bộ trước khi bắt đầu nhiệm vụ mới.

---

## 1. Mục tiêu Dự án
Xây dựng hệ thống **Smart Home IoT** hoàn chỉnh (Phần cứng mô hình vật lý ESP32 + HiveMQ Cloud MQTT + Node.js Backend + Firebase Auth/Realtime Database/FCM + Ứng dụng di động React Native Expo SDK 54) cho nhóm 5 sinh viên trong 6 tuần với ngân sách phần cứng tối đa **1.000.000 VNĐ**.

---

## 2. Kiến trúc Hiện tại
- **Mô hình**: Không kết nối MQTT trực tiếp từ Mobile App ở phiên bản đầu; mọi lệnh điều khiển đi qua **Node.js REST API** (xác thực Firebase ID Token, validate bằng Zod), sau đó publish lên **HiveMQ Cloud (MQTT over TLS, QoS 1)**.
- **Đồng bộ trạng thái**: Phân biệt rõ `desiredState` (lệnh mong muốn) và `reportedState` (trạng thái thực tế do ESP32 phản hồi). Mobile App lắng nghe `reportedState`, cảm biến và cảnh báo từ Firebase Realtime Database.
- **Chế độ hoạt động**: Hỗ trợ `MANUAL` và `AUTO` (tự bật quạt theo ngưỡng nhiệt độ có hysteresis, tự kích hoạt còi buzzer cục bộ ngay trên ESP32 khi MQ-2 vượt ngưỡng kể cả khi mất mạng).

---

## 3. Công nghệ Đã Chọn
- **Mobile**: React Native `0.81.5`, Expo SDK `~54.0.36`, TypeScript, Expo Router (hoặc di chuyển an toàn từ React Navigation hiện có), Firebase JS SDK, `expo-notifications`.
- **Backend**: Node.js LTS, Express, TypeScript (`strict: true`), `mqtt` (MQTT.js), `firebase-admin`, `zod`, `dotenv`, `vitest`.
- **Cloud**: Firebase Authentication (Email/Password), Firebase Realtime Database, Firebase Cloud Messaging (FCM), HiveMQ Cloud Serverless (TLS port `8883`).
- **Firmware**: ESP32 DevKit V1 CP2102 (30 chân), C++ (PlatformIO / Arduino IDE), `WiFiClientSecure`, `PubSubClient`, `DHT sensor library`, `ESP32Servo`, `ArduinoJson`.

---

## 4. Những Quyết định Kỹ thuật Đã Chốt & Xử lý Xung đột
1. **Bảo toàn code hiện có trong Workspace**:
   - Thư mục gốc hiện có prototype UI React Native (`App.js`, `src/navigation/AppNavigator.js`, `src/screens/*.js`, `src/components/*.js`) viết bằng JavaScript và `@react-navigation/native-stack`.
   - **Quyết định**: Không xóa hoặc ghi đè `src/` và `App.js` hiện tại. Tạo đầy đủ cấu trúc chuẩn (`mobile/`, `backend/`, `firmware/`, `firebase/`, `docs/`, `scripts/`) và sẽ chuyển đổi/tích hợp các màn hình của nhóm sang TypeScript + kiến trúc chuẩn ở Phase 6.
2. **An toàn GPIO ESP32 với cảm biến MQ-2 (5V → 3.3V)**:
   - Cảm biến MQ-2 cấp nguồn `5V` có chân `AO`/`DO` có thể xuất điện áp lên tới ~4.2V–5V, vượt mức chịu đựng `3.3V` của GPIO ESP32.
   - **Quyết định**: Sử dụng cầu phân áp bằng điện trở có sẵn trong BOM (`10kΩ` nối từ `AO` vào GPIO34 và `2 × 10kΩ` mắc song song = `5kΩ` hoặc phối hợp điện trở xuống `GND`, hoặc cầu phân áp `10kΩ / 10kΩ` nhân hệ số phần mềm) để giới hạn điện áp vào chân ADC1 (`GPIO34`) luôn ≤ `2.5V–3.3V`.
3. **Chọn chân ADC1 thay vì ADC2 khi dùng Wi-Fi**:
   - Trên ESP32, bộ `ADC2` không hoạt động khi bật Wi-Fi.
   - **Quyết định**: Bắt buộc gắn chân analog của MQ-2 vào cụm **ADC1** (`GPIO34`).
4. **Nguồn cấp cho Quạt DC 5V và Servo SG90**:
   - Không cấp nguồn từ chân `3V3` của ESP32 cho Servo hoặc Quạt để tránh sụt áp làm brownout reset ESP32.
   - **Quyết định**: Dùng nguồn `Adapter 5V 2A` qua jack DC nối trực tiếp vào đường nguồn 5V cấp cho Servo (kèm tụ lọc `470–1000µF`) và Quạt (qua module MOSFET + diode flyback), nối chung `GND` với ESP32.
5. **Ngân sách BOM ≤ 1.000.000 VNĐ**:
   - Tổng chi phí ước tính linh kiện điện tử + mô hình foam là **~618.000 VNĐ** (chưa tính Power Bank) và **~838.000 VNĐ** (nếu mua thêm Power Bank 10.000mAh), nằm hoàn toàn trong ngân sách 1.000.000 VNĐ.

---

## 5. Phần Đã Hoàn Thành
- [x] **Kiểm tra & phân tích hiện trạng Workspace**: Đã khảo sát toàn bộ `package.json`, `App.js`, `app.json` và 13 file trong `src/`.
- [x] **PHASE 1 – Phân tích yêu cầu và thiết kế kiến trúc**:
  - Hoàn thành tài liệu kiến trúc tổng thể (`docs/ARCHITECTURE.md`).
  - Hoàn thành WBS 6 tuần cho 5 thành viên (`docs/WBS.md`).
  - Hoàn thành đối chiếu BOM, ngân sách, dòng tiêu thụ và an toàn điện (`docs/BOM.md`, `docs/POWER_SUPPLY.md`, `docs/WIRING.md`).
  - Hoàn thành đặc tả MQTT Topics & JSON Schema (`docs/MQTT_TOPICS.md`).
  - Hoàn thành tài liệu hướng dẫn Firebase, HiveMQ, Notifications, Test Plan, Deployment (`docs/*.md`) và `firebase/database.rules.json`.
- [x] **PHASE 2 – Khởi tạo cấu trúc Project & Quản lý ngữ cảnh**:
  - Tạo đầy đủ cấu trúc thư mục `mobile/`, `backend/`, `firmware/esp32-smarthome/`, `firebase/`, `docs/`, `scripts/`.
  - Tạo `README.md`, `PROJECT_CONTEXT.md`, `TASKS.md`, `.env.example` và cập nhật `.gitignore`.
- [x] **PHASE 3 – Thiết lập HiveMQ Cloud & Bộ kiểm thử MQTTX**:
  - Cập nhật chi tiết hướng dẫn ACL, TLS `:8883` và kịch bản LWT trong `docs/HIVEMQ_SETUP.md`.
  - Tạo bộ collection import trực tiếp vào MQTTX Desktop (`scripts/mqttx-smarthome-collection.json`) và script CLI kiểm tra kết nối TLS (`scripts/test-hivemq.ts`).
- [x] **PHASE 4 – Xây dựng Backend Node.js + Express + TypeScript + MQTT.js + Simulator + Vitest**:
  - Hoàn thiện source code `backend/src/` (`strict: true`) với Zod validation, Rate Limiter, Error Handler, Command Service (tách `desiredState` và `reportedState`, timeout 8s, deduplication), Sensor & Alert Service (throttling lưu lịch sử cảm biến 60s, anti-spam cooldown cảnh báo 60s).
  - Xây dựng ESP32 Simulator (`backend/simulator/esp32-simulator.ts`) có ring-buffer 16 `requestId` chống trùng lặp lệnh, LWT và giả lập cảm biến.
  - Viết bộ Unit Test & Integration Test bằng Vitest + Supertest (`backend/tests/`).
- [x] **PHASE 5 – Tích hợp Firebase Admin SDK, Auth Middleware & Seed Data**:
  - Tích hợp `firebase-admin` trong `backend/src/services/firebaseService.ts` kèm cơ chế fallback tự động sang `In-Memory Store` (nạp sẵn dữ liệu mẫu `home1`) khi người dùng chưa điền khóa thật vào `backend/.env`.
  - Hoàn thiện `backend/scripts/seed-firebase.ts` để đẩy 10 nhánh dữ liệu mẫu lên Firebase Realtime Database.
- [x] **PHASE 6 – Xây dựng Ứng dụng Mobile React Native (Expo SDK 54 + TypeScript)**:
  - Chuẩn hóa cấu trúc `mobile/` theo đúng Master Prompt (`mobile/app/`, `mobile/components/`, `mobile/contexts/`, `mobile/hooks/`, `mobile/services/`, `mobile/types/`, `mobile/App.tsx`, `mobile/package.json`, `mobile/tsconfig.json`).
  - Hoàn thiện đủ 10 màn hình chuẩn: `SplashScreen`, `LoginScreen`, `RegisterScreen`, `DashboardScreen`, `DevicesScreen`, `RoomDetailScreen`, `SensorsScreen`, `AlertsScreen`, `HistoryScreen`, `SettingsScreen`.
  - Sửa triệt để các lỗi trong `src/screens/LoginScreen.js` và 4 file rỗng `0 byte` trong `src/components/`.
  - Liên kết `App.js` ở thư mục gốc vào `mobile/App.tsx` để chạy ngay bằng `npm start` với `node_modules` sẵn có.

---

## 6. Phần Chưa Hoàn Thành
- [ ] **PHASE 7**: Sketch ESP32 đã có mã và kiểm tra thời hạn lệnh. Còn Verify, nạp bo và thử MQTT với HiveMQ thật. Backend đã qua TypeScript typecheck và 12 bài Vitest cục bộ. Các bài này không biên dịch sketch.
- [ ] **PHASE 8 – 12**: Tích hợp điều khiển, cảm biến/cảnh báo, thông báo đẩy, kiểm thử toàn diện và đóng gói báo cáo bảo vệ.

---

## 7. Lỗi / Vấn Đề Đang Ghi Nhận trong Code Cũ (`src/`)
- [x] Đã khắc phục hoàn toàn lỗi thiếu import `Alert` và gán sự kiện `handleLogin` trong [`src/screens/LoginScreen.js`](src/screens/LoginScreen.js).
- [x] Đã khắc phục hoàn toàn 4 file rỗng (`0 byte`) trong `src/components/` (`BottomNav.js`, `CategoryTabs.js`, `header.js`, `SearchBar.js`).

---

## 8. Lệnh Chạy Dự Án (PowerShell trên Windows)
```powershell
# 1. Cài đặt thư viện và kiểm tra kiểu TypeScript + chạy Unit/Integration Test cho Backend
npm --prefix backend install
npm --prefix backend run typecheck
npm --prefix backend test

# 2. Chạy Backend Server (Chế độ dev, hỗ trợ cả Firebase thật và In-Memory khi chưa điền .env)
npm --prefix backend run dev

# 3. Chạy ESP32 Hardware & MQTT Simulator
npm --prefix backend run simulator

# 4. Kiểm tra kết nối HiveMQ Cloud TLS & Seed dữ liệu mẫu lên Firebase
npm --prefix backend run test:hivemq
npm --prefix backend run seed

# 5. Chạy thử giao diện Mobile hiện có (Expo SDK 54)
npm start
```

---

## 9. Danh Sách Biến Môi Trường Cần Thiết (Chỉ ghi tên biến, KHÔNG lưu giá trị bí mật)

### Backend (`backend/.env`)
- `PORT`
- `NODE_ENV`
- `CORS_ORIGIN`
- `HOME_ID`
- `COMMAND_TIMEOUT_MS`
- `HIVEMQ_HOST`
- `HIVEMQ_PORT`
- `HIVEMQ_PROTOCOL`
- `HIVEMQ_USERNAME`
- `HIVEMQ_PASSWORD`
- `HIVEMQ_CLIENT_ID_PREFIX`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_URL`

### Mobile (`mobile/.env`)
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_HOME_ID`
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_DATABASE_URL`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_EAS_PROJECT_ID`

### Firmware (`firmware/esp32-smarthome/include/secrets.h`)
- `WIFI_SSID`
- `WIFI_PASSWORD`
- `MQTT_BROKER_HOST`
- `MQTT_BROKER_PORT`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`
- `HOME_ID`

---

## 10. Bước Tiếp Theo
Hoàn tất xác minh Phase 7 theo README firmware. Phase 8 cần kiểm thử tích hợp với thiết bị thật. App TypeScript hiện dùng React Navigation, token dev và polling REST. Expo Router, Firebase Auth/RTDB phía mobile và push vẫn còn thiếu so với yêu cầu.
