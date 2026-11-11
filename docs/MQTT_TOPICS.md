# ĐẶC TẢ MQTT TOPICS & PAYLOAD SCHEMA

## 1. Cấu hình Kết nối Broker (HiveMQ Cloud)
- **Giao thức**: `mqtts://` (MQTT over TLS v1.2/v1.3)
- **Port**: `8883`
- **Keep Alive**: `30 giây`
- **Clean Session**: `true` (kết hợp Re-subscribe tự động khi reconnect)
- **Tài khoản MQTT tách biệt**:
  - `smarthome_backend`: Quyền Publish `.../set`, Subscribe `.../state`, `.../sensors/#`, `.../alerts`, `.../esp32/status`.
  - `smarthome_esp32_home1`: Quyền Subscribe `.../set`, Publish `.../state`, `.../sensors/#`, `.../alerts`, `.../esp32/status`.

---

## 2. Danh sách 14 MQTT Topics Bắt Buộc

| STT | Topic | Chiều dữ liệu | QoS | Retain | Mô tả |
| :-: | :--- | :--- | :-: | :-: | :--- |
| 1 | `smarthome/home1/light1/set` | Backend → ESP32 | `1` | `false` | Lệnh bật/tắt đèn phòng khách |
| 2 | `smarthome/home1/light1/state` | ESP32 → Backend | `1` | `true` | Trạng thái thực tế đèn phòng khách |
| 3 | `smarthome/home1/light2/set` | Backend → ESP32 | `1` | `false` | Lệnh bật/tắt đèn phòng ngủ |
| 4 | `smarthome/home1/light2/state` | ESP32 → Backend | `1` | `true` | Trạng thái thực tế đèn phòng ngủ |
| 5 | `smarthome/home1/fan1/set` | Backend → ESP32 | `1` | `false` | Lệnh bật/tắt quạt & đổi chế độ Manual/Auto |
| 6 | `smarthome/home1/fan1/state` | ESP32 → Backend | `1` | `true` | Trạng thái thực tế quạt & chế độ hiện hành |
| 7 | `smarthome/home1/door1/set` | Backend → ESP32 | `1` | `false` | Lệnh mở/đóng cửa Servo SG90 |
| 8 | `smarthome/home1/door1/state` | ESP32 → Backend | `1` | `true` | Trạng thái lệnh góc Servo SG90 đã thực thi |
| 9 | `smarthome/home1/sensors/temperature` | ESP32 → Backend | `0` | `true` | Giá trị nhiệt độ (`°C`) từ DHT22 |
| 10 | `smarthome/home1/sensors/humidity` | ESP32 → Backend | `0` | `true` | Giá trị độ ẩm (`%`) từ DHT22 |
| 11 | `smarthome/home1/sensors/motion` | ESP32 → Backend | `1` | `true` | Trạng thái phát hiện chuyển động từ PIR |
| 12 | `smarthome/home1/sensors/smoke` | ESP32 → Backend | `1` | `true` | Giá trị đọc ADC / tỷ lệ khói khí từ MQ-2 |
| 13 | `smarthome/home1/alerts` | ESP32 → Backend | `1` | `false` | Bản tin cảnh báo khẩn cấp (khói, chuyển động, lỗi cảm biến) |
| 14 | `smarthome/home1/esp32/status` | ESP32 / Broker (LWT) → Backend | `1` | `true` | Trạng thái kết nối `online/offline`, IP, RSSI, chế độ hệ thống |

> **Nguyên tắc an toàn Retain**:
> - **Mọi topic `.../set` bắt buộc `retain = false`** để khi ESP32 khởi động lại hoặc kết nối lại mạng sẽ không tự động thực thi lại lệnh cũ (đặc biệt là lệnh mở cửa `door1/set`).
> - **Các topic `.../state` và `.../esp32/status` dùng `retain = true`** để khi Backend vừa khởi động lại sẽ nhận được ngay trạng thái hiện hành của phần cứng.

---

## 3. Quy Ước JSON Payload Schema

### 3.1. Bản tin Điều khiển (`smarthome/home1/{deviceId}/set`)
Dùng cho `light1`, `light2`, `fan1`, `door1`:
```json
{
  "requestId": "req_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "homeId": "home1",
  "deviceId": "light1",
  "desiredState": {
    "power": "ON",
    "mode": "MANUAL"
  },
  "requestedBy": "uid_student_01",
  "timestamp": 1762855200000
}
```
Đối với cửa `door1`:
```json
{
  "requestId": "req_4a2c119e-8f12-4c09-a111-998877665544",
  "homeId": "home1",
  "deviceId": "door1",
  "desiredState": {
    "doorState": "OPEN",
    "targetAngle": 90
  },
  "requestedBy": "uid_student_01",
  "timestamp": 1762855205000
}
```

### 3.2. Bản tin Phản hồi Trạng thái & ACK (`smarthome/home1/{deviceId}/state`)
```json
{
  "requestId": "req_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "homeId": "home1",
  "deviceId": "light1",
  "reportedState": {
    "power": "ON",
    "mode": "MANUAL"
  },
  "status": "OK",
  "source": "REMOTE_COMMAND",
  "isDuplicate": false,
  "timestamp": 1762855200350
}
```
> Ghi chú:
> - Trường `source` có thể là `"REMOTE_COMMAND"` (từ App), `"PHYSICAL_BUTTON"` (nhấn nút trên mô hình), `"AUTO_RULE"` (tự động theo nhiệt độ/cảm biến) hoặc `"BOOT_SYNC"` (đồng bộ khi khởi động).
> - Đối với `door1/state`, `reportedState` bổ sung `"positionVerified": false` để minh bạch rằng trạng thái dựa trên lệnh xung PWM cấp cho Servo SG90 (chưa có công tắc từ xác nhận vật lý).

### 3.3. Bản tin Cảm biến (`smarthome/home1/sensors/{type}`)
- **`smarthome/home1/sensors/temperature`**:
```json
{
  "homeId": "home1",
  "sensorId": "dht22_temp",
  "type": "temperature",
  "value": 29.4,
  "unit": "C",
  "status": "OK",
  "timestamp": 1762855210000
}
```
- **`smarthome/home1/sensors/humidity`**:
```json
{
  "homeId": "home1",
  "sensorId": "dht22_hum",
  "type": "humidity",
  "value": 68.5,
  "unit": "%",
  "status": "OK",
  "timestamp": 1762855210000
}
```
- **`smarthome/home1/sensors/motion`**:
```json
{
  "homeId": "home1",
  "sensorId": "pir_living",
  "type": "motion",
  "motionDetected": true,
  "timestamp": 1762855212000
}
```
- **`smarthome/home1/sensors/smoke`**:
```json
{
  "homeId": "home1",
  "sensorId": "mq2_kitchen",
  "type": "smoke",
  "rawAdc": 1420,
  "smokeLevelPercent": 34.6,
  "thresholdAdc": 2200,
  "isWarmedUp": true,
  "abnormal": false,
  "timestamp": 1762855215000
}
```

### 3.4. Bản tin Cảnh báo (`smarthome/home1/alerts`)
```json
{
  "alertId": "alt_1762855220000_mq2",
  "homeId": "home1",
  "type": "SMOKE_DETECTED",
  "severity": "CRITICAL",
  "deviceId": "mq2_kitchen",
  "roomId": "kitchen",
  "message": "Cảnh báo! Nồng độ khói/khí tại Phòng bếp vượt ngưỡng an toàn (ADC: 2650/2200).",
  "buzzerTriggered": true,
  "autoFanTriggered": true,
  "timestamp": 1762855220000
}
```

### 3.5. Bản tin Trạng thái ESP32 & Last Will (`smarthome/home1/esp32/status`)
- **Khi ESP32 Online**:
```json
{
  "homeId": "home1",
  "deviceId": "esp32_main",
  "online": true,
  "systemMode": "AUTO",
  "tempThresholdHigh": 31.0,
  "tempThresholdLow": 29.5,
  "smokeThresholdAdc": 2200,
  "rssi": -58,
  "uptimeSeconds": 1420,
  "firmwareVersion": "1.0.0",
  "timestamp": 1762855230000
}
```
- **Khi ESP32 mất kết nối đột ngột (Do HiveMQ phát tự động qua LWT)**:
```json
{
  "homeId": "home1",
  "deviceId": "esp32_main",
  "online": false,
  "reason": "lwt_unexpected_disconnect",
  "timestamp": 0
}
```

---

## 4. Xử Lý Bản Tin Trùng (Idempotency / Deduplication) với QoS 1
Do MQTT `QoS 1` đảm bảo chuyển phát **"ít nhất một lần" (At-least-once)**, một bản tin có thể tới ESP32 hoặc Backend nhiều hơn 1 lần khi mạng chập chờn:
1. **Trên ESP32**: Lưu mảng vòng (ring buffer) gồm `16 requestId` vừa thực thi gần nhất. Nếu nhận lại một `requestId` đã có trong bộ đệm, ESP32 **không kích lại phần cứng** (tránh đảo trạng thái hoặc làm giật Servo), mà chỉ gửi lại bản tin `.../state` xác nhận (`"isDuplicate": true`) để Backend nhận được ACK.
2. **Trên Backend**: Kiểm tra `requestId` và `timestamp` trước khi ghi `activityLogs` hoặc phát thông báo đẩy để không tạo 2 dòng lịch sử giống hệt nhau.
