# HƯỚNG DẪN CÀI ĐẶT HIVEMQ CLOUD & KIỂM THỬ VỚI MQTTX (PHASE 3)

## 1. Khởi Tạo Cluster Trên HiveMQ Cloud (Miễn Phí)
1. Đăng ký hoặc đăng nhập tài khoản tại [HiveMQ Cloud Console](https://console.hivemq.cloud/).
2. Chọn tạo cluster gói **Serverless (Free)** — hỗ trợ tối đa 100 kết nối đồng thời và 10GB lưu lượng/tháng (đáp ứng hoàn toàn nhu cầu đồ án).
3. Sau khi cluster khởi tạo xong, ghi lại các thông số tại tab **Overview**:
   - **Cluster URL**: ví dụ `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.s1.eu.hivemq.cloud`
   - **TLS Port (MQTT over TLS)**: `8883`
   - **WebSocket TLS Port**: `8884`

---

## 2. Tạo Thông Tin Đăng Nhập & Phân Quyền ACL (Access Management)
Vào mục **Access Management** của Cluster, tạo **3 tài khoản riêng biệt** để tách biệt quyền hạn giữa Backend, mạch ESP32 và công cụ kiểm thử MQTTX:

| Username | Dùng cho thành phần | Topic Filter | Quyền hạn (Permissions) |
| :--- | :--- | :--- | :--- |
| `smarthome_backend` | Node.js Backend Server | `smarthome/home1/#` | **Publish & Subscribe** |
| `smarthome_esp32` | Mạch ESP32 (hoặc Simulator) | `smarthome/home1/+/set`<br>`smarthome/home1/+/state`<br>`smarthome/home1/sensors/#`<br>`smarthome/home1/alerts`<br>`smarthome/home1/esp32/status` | Subscribe (`+/set`)<br>Publish (`+/state`, `sensors/#`, `alerts`, `esp32/status`) |
| `smarthome_tester` | Ứng dụng MQTTX Desktop (Debug) | `smarthome/home1/#` | **Publish & Subscribe** |

> **Nguyên tắc bảo mật bắt buộc**:
> - Không dùng chung một tài khoản cho cả Backend và ESP32 để tránh xung đột `Client ID` làm ngắt kết nối lẫn nhau (reconnect loop).
> - Mật khẩu chỉ lưu trong file cục bộ `backend/.env` và `firmware/esp32-smarthome/include/secrets.h` (đã được chặn bởi `.gitignore`). **Tuyệt đối không commit thông tin thật lên Git.**

---

## 3. Cấu Hình MQTTX Desktop Trên Windows 10/11

1. Tải và cài đặt [MQTTX Desktop](https://mqttx.app/).
2. Nhấn **New Connection (`+`)** hoặc dùng chức năng **Import** để nạp file mẫu [`scripts/mqttx-smarthome-collection.json`](../scripts/mqttx-smarthome-collection.json) rồi thay `<YOUR_HIVEMQ_CLUSTER_HOST>` và `<YOUR_PASSWORD>` bằng thông tin thật của nhóm.
3. Nếu nhập tay, điền chính xác các thông số sau:
   - **Name**: `SmartHome-HiveMQ-Tester`
   - **Client ID**: `mqttx_tester_01`
   - **Protocol**: `mqtts://`
   - **Host**: `<Cluster_URL_của_nhóm>` (ví dụ: `abc123xyz.s1.eu.hivemq.cloud`)
   - **Port**: `8883`
   - **Username**: `smarthome_tester`
   - **Password**: `<Mật_khẩu_của_nhóm>`
   - **SSL/TLS**: `ON` (`Enable`)
   - **SSL Secure**: `ON` (Sử dụng CA Certificate mặc định của hệ điều hành / ISRG Root X1)
   - **MQTT Version**: `3.1.1` hoặc `5.0`
   - **Keep Alive**: `30`
   - **Clean Start / Clean Session**: `true`
4. Nhấn **Connect**. Khi góc trên bên phải hiện chấm xanh **Connected**, kết nối TLS đã thành công (`TC-02`).

---

## 4. Các Kịch Bản Kiểm Thử Chuẩn Trên MQTTX Desktop

### Kịch bản 1: Theo dõi toàn bộ 14 Topics của hệ thống
- Nhấn **+ New Subscription**:
  - **Topic**: `smarthome/home1/#`
  - **QoS**: `1`
  - **Alias**: `Toàn bộ ngôi nhà (home1)`

### Kịch bản 2: Giả lập lệnh bật/tắt thiết bị từ Backend xuống ESP32 (`retain = false`)
- Ở khung Publish bên dưới:
  - **Topic**: `smarthome/home1/light1/set`
  - **QoS**: `1`
  - **Retain**: **Bỏ tích (`false`)** *(Bắt buộc để tránh ESP32 tự bật lại hoặc tự mở cửa khi khởi động lại)*
  - **Payload (JSON)**:
    ```json
    {
      "requestId": "req_test_mqttx_001",
      "homeId": "home1",
      "deviceId": "light1",
      "desiredState": {
        "power": "ON",
        "mode": "MANUAL"
      },
      "requestedBy": "mqttx_tester",
      "timestamp": 1762855200000
    }
    ```
- **Kết quả kỳ vọng**: ESP32 (hoặc `npm run simulator`) nhận lệnh, bật LED 1 và trả về bản tin xác nhận trên topic `smarthome/home1/light1/state` với `retain = true` và `"status": "OK"`.

### Kịch bản 3: Kiểm thử Last Will and Testament (LWT) khi ESP32 mất điện đột ngột (`TC-14`)
1. Tạo thêm một kết nối trên MQTTX tên là `ESP32-LWT-Simulation`:
   - Mở mục **Last-Will and Testament** ở phần cấu hình kết nối:
     - **Last-Will Topic**: `smarthome/home1/esp32/status`
     - **Last-Will QoS**: `1`
     - **Last-Will Retain**: `true`
     - **Last-Will Payload**:
       ```json
       {
         "homeId": "home1",
         "deviceId": "esp32_main",
         "online": false,
         "reason": "lwt_unexpected_disconnect",
         "timestamp": 0
       }
       ```
2. Kết nối `ESP32-LWT-Simulation` và publish bản tin Online (`"online": true`, `retain = true`) lên `smarthome/home1/esp32/status`.
3. Hoặc chạy trực tiếp **ESP32 Simulator** trong dự án (`cd backend && npm run simulator`) và nhấn phím **`k`** (Kill ungracefully) để giả lập rút nguồn đột ngột.
4. **Kết quả kỳ vọng**: Trên cửa sổ `SmartHome-HiveMQ-Tester`, sau khoảng 30–45 giây (hết chu kỳ Keep-Alive), HiveMQ Cloud tự động phát bản tin LWT `"online": false` tới mọi client đang subscribe.

---

## 5. Kiểm Thử Kết Nối HiveMQ Tự Động Bằng Script CLI

Sau khi điền thông tin HiveMQ thật vào `backend/.env`, chạy lệnh sau trên PowerShell để kiểm tra kết nối TLS 8883, quyền Publish/Subscribe và độ trễ:

```powershell
cd backend
npm run test:hivemq
```
