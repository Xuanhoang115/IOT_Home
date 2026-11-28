# SMART HOME IoT 2026 – Ứng dụng Di động Quản lý Nhà Thông minh

Đồ án môn **Lập trình Di động** – Nhóm 5 sinh viên – Thời gian thực hiện: **6 tuần** – Ngân sách phần cứng tối đa: **1.000.000 VNĐ**.

---

## 1. Giới thiệu Dự án

Hệ thống **Smart Home IoT 2026** là giải pháp quản lý và điều khiển mô hình nhà thông minh vật lý theo thời gian thực, kết hợp giữa:
- **Mobile & Web App (React Native + Expo SDK 54 + TypeScript)**: Giao diện điều khiển thiết bị 1 chạm, theo dõi cảm biến trực quan, cảnh báo khói/lửa thời gian thực, lịch sử hoạt động và chuyển đổi chế độ `MANUAL` / `AUTO` bảo vệ bằng mã PIN.
- **Backend REST API, Swagger UI & MQTT Bridge (Node.js + Express + TypeScript + MQTT.js)**: Triển khai trên Render Cloud kèm tài liệu OpenAPI 3.1 (`/docs`), xác thực Firebase Auth, kiểm tra phân quyền, gửi lệnh qua EMQX Cloud (TLS `:8883`) và đồng bộ trạng thái `reportedState`, cảm biến, cảnh báo vào Firebase Realtime Database + FCM Android.
- **MQTT Broker (EMQX Cloud Serverless & Eclipse Mosquitto Lab 2)**: Xác thực 3 tài khoản độc lập (`smarthome_backend`, `smarthome_esp32`, `smarthome_mobile`), phân quyền Topic ACL tối thiểu và mã hóa TLS (`:8883` / WSS `:8084`).
- **Firmware ESP32 (DevKit V1 30 chân & Wokwi Simulator v2.0.0)**: Đọc cảm biến (`DHT22`, `PIR HC-SR501`, `MQ-2`, `Flame`, `MC-38`), hiển thị màn hình `OLED SSD1306`, điều khiển cơ cấu chấp hành (`LED`, `Quạt DC`, `Servo SG90`, `Buzzer`), lưu cấu hình Flash NVS và vận hành an toàn ngay cả khi mất mạng.

---

## 2. Kiến trúc Tổng quan

1. **Luồng điều khiển**:
   `Mobile / Web App` → `Node.js REST API (Verify Firebase ID Token + Zod)` / `EMQX WSS (:8084)` → `EMQX Cloud (MQTT TLS :8883, QoS 1)` → `ESP32` → `LED / Quạt / Cửa Servo / Tắt còi`
2. **Luồng phản hồi trạng thái (`reportedState` / ACK)**:
   `ESP32` → `EMQX Cloud` → `Node.js` → `Firebase Realtime Database` → `Mobile / Web App`
3. **Luồng dữ liệu cảm biến & Cảnh báo**:
   `DHT22 / PIR / MQ-2 / Flame` → `ESP32` → `EMQX Cloud` → `Node.js` → `Firebase Realtime Database & FCM Android` → `Mobile / Web App`

Chi tiết kiến trúc xem tại [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 3. Cấu trúc Thư mục Dự án

```text
IOT_Home/
├── mobile/                     # Ứng dụng chính (Expo SDK 54 + React Native + TypeScript)
│   ├── app/                    # 10 màn hình chuẩn (Login, Dashboard, Devices, Sensors, Alerts...)
│   ├── components/             # UI Design System (DeviceCard, RoomCard, Responsive, Skeleton...)
│   ├── contexts/               # SmartHomeContext đồng bộ REST + MQTT WSS + Firebase Auth
│   ├── hooks/                  # useSmartHome, useResponsiveLayout
│   ├── services/               # api.ts, directCloudMqtt.ts, firebaseAuth.ts
│   ├── styles/                 # neumorphicTheme.ts (WCAG AA tokens)
│   ├── types/                  # Kiểu dữ liệu TypeScript đồng bộ Backend
│   └── .env.example
├── backend/                    # Node.js + Express + TypeScript + Swagger OpenAPI 3.1
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── docs/               # openApiSpec.ts (Swagger UI Dark Theme tại /docs)
│   │   ├── middleware/
│   │   ├── mqtt/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── types/
│   ├── simulator/              # Công cụ giả lập ESP32 qua MQTT
│   ├── tests/                  # 13 Unit & Integration tests (Vitest)
│   └── .env.example
├── broker/                     # Cấu hình MQTT Broker tự dựng (Mosquitto 2.0 + ACL + Docker)
│   ├── mosquitto.conf
│   ├── acl.conf
│   ├── docker-compose.yml
│   └── README.md
├── firmware/
│   ├── esp32-smarthome/        # Firmware C++ cho mạch thật ESP32 30 chân (kèm OLED + NVS)
│   │   └── include/secrets.example.h
│   └── wokwi/                  # Mô phỏng Wokwi v2.0.0 (sketch.ino, diagram.json, OLED SSD1306)
│       └── secrets.example.h
├── firebase/
│   └── database.rules.json     # Firebase Realtime Database Security Rules
├── docs/                       # Tài liệu kỹ thuật, phần cứng, kiểm thử và triển khai
├── scripts/                    # Script hỗ trợ kiểm thử
├── README.md
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

## 5. Hướng dẫn Chạy Nhanh & Triển khai Thực tế

### 5.1. Tài liệu Swagger OpenAPI 3.1 (Render Cloud Live)
- **Swagger UI:** `https://smarthome-iot-backend.onrender.com/docs`
- **OpenAPI Spec:** `https://smarthome-iot-backend.onrender.com/openapi.json`
- **Healthcheck:** `https://smarthome-iot-backend.onrender.com/api/health`

### 5.2. Kiểm thử & Chạy Backend cục bộ (`backend/`)
```powershell
npm --prefix backend install
npm --prefix backend run typecheck
npm --prefix backend test
npm --prefix backend run dev
```

### 5.3. Chạy Ứng dụng Mobile & Web (`mobile/` — Expo SDK 54 + TypeScript)
```powershell
cd mobile
# Copy .env.example -> .env.local và điền cấu hình Firebase + EMQX smarthome_mobile
npx expo start --web -c      # Chạy giao diện Web tại http://localhost:8081
npx expo start --tunnel -c   # Kết nối với Android Development Build
```

### 5.4. Firmware ESP32 & Mô phỏng Wokwi (`firmware/`)
- **Mạch thật ESP32 30 chân:** Xem hướng dẫn tại [firmware/esp32-smarthome/README.md](firmware/esp32-smarthome/README.md) (copy `include/secrets.example.h` → `include/secrets.h`).
- **Mô phỏng Wokwi v2.0.0 (OLED SSD1306 + đầy đủ cảm biến):** Xem tại [firmware/wokwi/README.md](firmware/wokwi/README.md).
- **Cấu hình MQTT Broker tự dựng (Mosquitto + ACL):** Xem tại [broker/README.md](broker/README.md).
