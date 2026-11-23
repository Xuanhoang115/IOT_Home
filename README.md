# SMART HOME IoT 2026 – Ứng dụng Di động Quản lý Nhà Thông minh

Đồ án môn **Lập trình Di động** – Nhóm 5 sinh viên – Thời gian thực hiện: **6 tuần** – Ngân sách phần cứng tối đa: **1.000.000 VNĐ**.

---

## 1. Giới thiệu Dự án

Hệ thống **Smart Home IoT 2026** là giải pháp quản lý và điều khiển mô hình nhà thông minh vật lý theo thời gian thực, kết hợp giữa:
- **Mobile App (React Native + Expo SDK 54)**: Giao diện điều khiển thiết bị, theo dõi cảm biến, cảnh báo khói/chuyển động, lịch sử hoạt động và chuyển đổi chế độ `Manual` / `Auto`.
- **Backend REST API & MQTT Bridge (Node.js + Express + TypeScript + MQTT.js)**: Xác thực người dùng qua Firebase Auth, kiểm tra phân quyền, gửi lệnh điều khiển qua HiveMQ Cloud (TLS) và đồng bộ trạng thái thực tế (`reportedState`), dữ liệu cảm biến, cảnh báo vào Firebase Realtime Database + FCM.
- **Cloud (Firebase + HiveMQ Cloud)**: Lưu trữ trạng thái thời gian thực, phân quyền truy cập, thông báo đẩy và truyền thông điệp MQTT bảo mật qua TLS.
- **Firmware (ESP32 DevKit CP2102 30 chân)**: Đọc cảm biến (`DHT22`, `PIR HC-SR501`, `MQ-2`), điều khiển cơ cấu chấp hành (`LED`, `Quạt DC 5V qua MOSFET`, `Servo SG90`, `Buzzer`), hỗ trợ nút nhấn vật lý và vận hành an toàn cả khi mất kết nối mạng.

---

## 2. Kiến trúc Tổng quan

1. **Luồng điều khiển**:
   `Mobile App` → `Node.js REST API (Verify Firebase ID Token + Zod)` → `HiveMQ Cloud (MQTT over TLS, QoS 1)` → `ESP32` → `LED / Quạt / Cửa Servo`
2. **Luồng phản hồi trạng thái (`reportedState` / ACK)**:
   `ESP32` → `HiveMQ Cloud` → `Node.js` → `Firebase Realtime Database` → `Mobile App`
3. **Luồng dữ liệu cảm biến & Cảnh báo**:
   `DHT22 / PIR / MQ-2` → `ESP32` → `HiveMQ Cloud` → `Node.js` → `Firebase Realtime Database & FCM` → `Mobile App`

Chi tiết kiến trúc xem tại [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 3. Cấu trúc Thư mục Dự án

> **Lưu ý hiện trạng Workspace**: Hiện tại thư mục gốc đang chứa bản prototype UI ban đầu (`App.js`, `src/`, `package.json`) sử dụng JavaScript và `@react-navigation`. Để không làm hỏng code đang chạy của nhóm, các file gốc được giữ nguyên và cấu trúc chuẩn theo Master Prompt được khởi tạo đầy đủ bên dưới để sẵn sàng tích hợp/di chuyển ở Phase 6.

```text
IOT_Home/
├── mobile/                     # Ứng dụng React Native (Expo SDK 54 + TypeScript + Expo Router)
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── contexts/
│   ├── types/
│   ├── assets/
│   └── .env.example
├── src/                        # [Hiện có] Prototype UI ban đầu (React Navigation + JS)
├── backend/                    # Node.js + Express + TypeScript + MQTT.js + Firebase Admin
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── mqtt/
│   │   ├── schemas/
│   │   └── types/
│   ├── simulator/              # Công cụ giả lập ESP32 qua MQTT
│   ├── tests/                  # Unit & Integration tests (Vitest)
│   └── .env.example
├── firmware/
│   └── esp32-smarthome/        # Code C++ Arduino / PlatformIO cho ESP32 30 chân
│       └── include/
│           └── secrets.example.h
├── firebase/
│   └── database.rules.json     # Firebase Realtime Database Security Rules
├── docs/                       # Tài liệu kỹ thuật, phần cứng, kiểm thử và triển khai
│   ├── ARCHITECTURE.md
│   ├── WBS.md
│   ├── BOM.md
│   ├── MQTT_TOPICS.md
│   ├── FIREBASE_SETUP.md
│   ├── HIVEMQ_SETUP.md
│   ├── WIRING.md
│   ├── POWER_SUPPLY.md
│   ├── NOTIFICATIONS.md
│   ├── TEST_PLAN.md
│   └── DEPLOYMENT.md
├── scripts/                    # Script hỗ trợ seed dữ liệu & kiểm thử
├── README.md
├── TASKS.md
├── PROJECT_CONTEXT.md
└── .gitignore
```

---

## 4. Danh sách Tài liệu Kỹ thuật (`docs/`)

- [Kiến trúc hệ thống (ARCHITECTURE.md)](docs/ARCHITECTURE.md)
- [Phân rã công việc 6 tuần (WBS.md)](docs/WBS.md)
- [Danh mục linh kiện & Ngân sách (BOM.md)](docs/BOM.md)
- [Đặc tả MQTT Topics & Payloads (MQTT_TOPICS.md)](docs/MQTT_TOPICS.md)
- [Sơ đồ đấu nối chân GPIO & Chuyển mức điện áp (WIRING.md)](docs/WIRING.md)
- [Thiết kế nguồn cấp & An toàn điện (POWER_SUPPLY.md)](docs/POWER_SUPPLY.md)
- [Hướng dẫn cài đặt Firebase (FIREBASE_SETUP.md)](docs/FIREBASE_SETUP.md)
- [Hướng dẫn cài đặt HiveMQ Cloud & MQTTX (HIVEMQ_SETUP.md)](docs/HIVEMQ_SETUP.md)
- [Thiết kế thông báo 3 trạng thái (NOTIFICATIONS.md)](docs/NOTIFICATIONS.md)
- [Kế hoạch kiểm thử (TEST_PLAN.md)](docs/TEST_PLAN.md)
- [Hướng dẫn triển khai & vận hành (DEPLOYMENT.md)](docs/DEPLOYMENT.md)

---

## 5. Hướng dẫn Chạy Nhanh (Quick Start trên Windows PowerShell)

### 5.1. Kiểm thử & Chạy Backend + ESP32 Simulator (Phase 3, 4, 5)
```powershell
# Cài đặt dependencies cho Backend
npm --prefix backend install

# Kiểm tra TypeScript strict & chạy bộ Unit + Integration Tests (Vitest)
npm --prefix backend run typecheck
npm --prefix backend test

# Khởi động Backend Server (tự động dùng In-Memory Seed Data nếu chưa cấu hình backend/.env)
npm --prefix backend run dev

# Chạy ESP32 Simulator (Self-test hoặc kết nối HiveMQ TLS khi đã cấu hình backend/.env)
npm --prefix backend run simulator

# Kiểm tra kết nối HiveMQ Cloud TLS (:8883) và Seed dữ liệu lên Firebase Realtime Database
npm --prefix backend run test:hivemq
npm --prefix backend run seed
```

### 5.2. Chạy Ứng Dụng Mobile (Expo SDK 54 + TypeScript - 10 Màn hình chuẩn)
```powershell
npm start
```

### 5.3. Các Phase Tiếp Theo
- **Phase 7**: Sketch ESP32 đã có mã. Còn Verify, nạp bo và kiểm tra MQTT trên thiết bị. Xem [hướng dẫn firmware trên Windows](firmware/esp32-smarthome/README.md).
- **Phase 8 – 12**: Tích hợp điều khiển, cảm biến/cảnh báo, thông báo đẩy 3 trạng thái, kiểm thử toàn diện & báo cáo bảo vệ.
