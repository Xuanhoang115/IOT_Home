# Kịch bản & Payload mẫu kiểm thử MQTT Broker trên MQTTX (Mục B.4)

> **Thông số kết nối chung trên MQTTX:**
> - **Host:** `mqtts://<your-emqx-host>` (Port `8883`, SSL/TLS = **ON**, CA signed server certificate)
> - **Username / Password:** dùng lần lượt `smarthome_backend`, `smarthome_mobile`, hoặc `smarthome_tester`.

---

## Test 1: Kết nối TLS `:8883` & Subscribe toàn bộ nhà
1. Kết nối bằng `smarthome_backend` (hoặc `smarthome_mobile`).
2. Bấm **+ New Subscription**:
   - **Topic:** `smarthome/home1/#`
   - **QoS:** `1`
3. Chụp ảnh danh sách bản tin cảm biến (`sensors/temperature`, `sensors/humidity`, `sensors/smoke`) và `esp32/status` đang đổ về realtime → lưu thành `05_mqttx_tls_subscribe.png`.

---

## Test 2: Publish lệnh `/set` (`QoS 1`, `retain = false`) & nhận `/state` (`retain = true`)
1. Chọn **Topic:** `smarthome/home1/light1/set`
2. Thiết lập **QoS = `1`**, **Retain = `false` (TẮT)**
3. Gửi payload JSON:
```json
{
  "requestId": "req_mqttx_001",
  "homeId": "home1",
  "deviceId": "light1",
  "desiredState": { "power": "ON" },
  "requestedBy": "mqttx_demo",
  "timestamp": 1795855000000
}
```
4. Quan sát ESP32/Wokwi bật LED 1 và lập tức phản hồi bản tin trên topic `smarthome/home1/light1/state` có `"reportedState": {"power": "ON"}`, `"isDuplicate": false` (cờ **Retained = true**).
5. Chụp ảnh → lưu thành `06_mqttx_publish_set_state.png`.

---

## Test 3: Kiểm thử chống lặp lệnh (`isDuplicate: true`) cho ESP32
1. Gửi lại **NGUYÊN VĂN payload trên với CÙNG `requestId: "req_mqttx_001"`** lần thứ 2.
2. Quan sát:
   - Trên MQTTX nhận lại `/state` có **`"isDuplicate": true`**.
   - Trên Serial Monitor ESP32 in thông báo bỏ qua lệnh trùng (không đảo trạng thái sai).
3. Chụp ảnh Serial Monitor → lưu vào `evidence/03_esp32_serial/02_esp32_command_duplicate.png`.

---

## Test 4: Kiểm thử bản tin LWT (`"online": false`) khi ESP32 mất điện đột ngột
1. Đang Subscribe `smarthome/home1/#` trên MQTTX.
2. Rút nguồn USB mạch ESP32 thật (hoặc bấm nút **Stop** trên Wokwi).
3. Chờ hết KeepAlive (~30–45 giây): Broker EMQX tự phát bản tin LWT lên topic `smarthome/home1/esp32/status`:
```json
{
  "homeId": "home1",
  "deviceId": "esp32_main",
  "online": false,
  "reason": "lwt_unexpected_disconnect",
  "timestamp": 0
}
```
4. Chụp ảnh bản tin LWT trên MQTTX → lưu thành `07_mqttx_lwt_offline.png`.

---

## Test 5: Kiểm thử từ chối bảo mật (Sai mật khẩu & Sai quyền ACL)
1. **Sai mật khẩu:** Tạo kết nối mới trên MQTTX với `smarthome_mobile` + mật khẩu sai (`wrong_pass_123`) → bấm Connect → EMQX từ chối (`Error: Connection refused: Not authorized / Bad User Name or Password`). Chụp ảnh → `08_mqttx_auth_denied.png`.
2. **Sai quyền Topic ACL:** Đăng nhập bằng tài khoản **`smarthome_mobile`** (đúng mật khẩu), thử **Publish** lên topic trái phép:
   - Topic: `smarthome/home1/light1/state` *(hoặc `smarthome/home2/light1/set`)*
   - QoS: `1`
   - Payload: `{"test": "unauthorized"}`
   - EMQX sẽ trả về lỗi **Not authorized / ACL Deny** (chặn publish ngoài `smarthome/home1/+/set`). Chụp ảnh → `09_mqttx_acl_denied.png`.
