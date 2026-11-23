# Firmware ESP32 – Smart Home IoT 2026 (Arduino IDE)

Board: **ESP32 DevKit V1 CP2102 (30 chân)**. Chân GPIO xem [`include/config.h`](include/config.h) và [`docs/WIRING.md`](../../docs/WIRING.md).
Sketch: [`esp32-smarthome.ino`](esp32-smarthome.ino) (tên file phải trùng tên thư mục).

## 1. Cài đặt Arduino IDE (2.x) trên Windows
1. **File → Preferences → Additional boards manager URLs**, thêm:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
2. **Tools → Board → Boards Manager**, cài **esp32 by Espressif Systems** (bản 3.x).
3. **Sketch → Include Library → Manage Libraries**, cài:
   - `PubSubClient` (Nick O'Leary)
   - `ArduinoJson` (Benoit Blanchon) – **bản 7.x**
   - `DHT sensor library` (Adafruit) và `Adafruit Unified Sensor`
   - `ESP32Servo` (Kevin Harrington / John K. Bennett)
4. Cài driver **CP210x** nếu Windows chưa nhận cổng COM.
5. **Tools**: Board = `ESP32 Dev Module`, Upload Speed = `460800`, Port = cổng COM của mạch.

## 2. Cấu hình an toàn (không commit)
1. Copy `include/secrets.example.h` thành `include/secrets.h` (đã bị `.gitignore` chặn).
2. Điền `WIFI_SSID`, `WIFI_PASSWORD` (Wi-Fi **2.4 GHz**), `MQTT_BROKER_HOST`, `MQTT_USERNAME`, `MQTT_PASSWORD` (tài khoản `smarthome_esp32`).
3. Dán chứng chỉ **ISRG Root X1** (PEM) vào `MQTT_ROOT_CA`. Tải tại https://letsencrypt.org/certs/isrgrootx1.pem
   Nếu chưa dán, firmware **từ chối kết nối** (không tắt xác thực TLS).

## 3. Nạp và theo dõi
- Mở `esp32-smarthome.ino` → **Verify** → **Upload**. Nếu bị treo ở `Connecting...`, giữ nút **BOOT** trên mạch trong lúc upload.
- **Tools → Serial Monitor**, baud `115200`. Kỳ vọng: `[WiFi]`, `[MQTT] Da ket noi`.

## Hành vi chính
- Khởi động ở trạng thái an toàn: đèn/quạt tắt, **cửa Sđóng** (không thực thi lại lệnh cũ).
- LWT trên `smarthome/home1/esp32/status`; reconnect Wi-Fi/MQTT không dùng `delay()`.
- Ring buffer 16 `requestId`: lệnh trùng chỉ gửi lại ACK với `isDuplicate: true`.
- MQ-2 (ADC1 GPIO34): làm nóng 25 s, trung bình 5 mẫu; vượt ngưỡng → **buzzer bật ngay**, quạt AUTO bật, kể cả mất mạng. Nút `GPIO19` khi đang báo động sẽ tắt còi.
- Quạt AUTO: bật ≥ 31,0 °C, tắt ≤ 29,5 °C (hysteresis).
- PIR chỉ báo cáo, **không** điều khiển cửa.
- Nút `GPIO18` đảo cửa, nút `GPIO19` đảo đèn 1 (debounce 50 ms), gửi `source: PHYSICAL_BUTTON`.

## Hạn chế đã biết
- PubSubClient publish **QoS 0**. Subscribe và LWT dùng QoS 1. ACK có thể mất trên đường truyền và backend sẽ báo timeout.
- Sketch chưa được Verify hoặc nạp lên bo trong đợt này.

## 4. Kiểm tra lệnh MQTT trên Windows

Từ thư mục gốc, tạo file cấu hình cục bộ nếu file chưa tồn tại.

```powershell
$secretsPath = 'firmware/esp32-smarthome/include/secrets.h'
if (!(Test-Path -LiteralPath $secretsPath)) {
    Copy-Item 'firmware/esp32-smarthome/include/secrets.example.h' $secretsPath
}
git check-ignore -- $secretsPath
[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
```

Sau khi Verify và Upload, chờ Serial Monitor báo kết nối MQTT. ESP32 cần đồng bộ NTP trước khi kết nối TLS. Dùng MQTTX qua TLS, theo dõi `smarthome/home1/light1/state` và `smarthome/home1/esp32/status`. Dùng LED để thử trước.

1. Publish tới `smarthome/home1/light1/set` với QoS 1, Retain tắt. Payload gồm `homeId: "home1"`, `deviceId: "light1"`, `requestId` mới, `desiredState: {"power":"ON"}` và `timestamp` dạng số epoch milliseconds vừa lấy từ PowerShell. Kiểm tra LED và phản hồi có cùng `requestId`.
2. Gửi lại cùng payload trong 8 giây. Kiểm tra phản hồi có `isDuplicate: true` và firmware không chạy lại lệnh.
3. Dùng `requestId` mới, yêu cầu tắt LED nhưng đặt `timestamp` cũ hơn 8 giây. LED phải giữ nguyên và không có ACK cho ID này. Thử tương tự với `deviceId` khác topic.
4. Ngắt Wi-Fi để kiểm tra LWT offline. Khôi phục Wi-Fi và kiểm tra trạng thái online cùng bản tin đồng bộ thiết bị.
