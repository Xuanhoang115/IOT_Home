# HƯỚNG DẪN ĐẨY & CHẠY MÔ PHỎNG ESP32 LÊN WOKWI WEB (v2.0.0)

Thư mục này đã được đồng bộ **100% tính năng & 14 chân GPIO** với mạch thật **SMART HOME IoT 2026** (kèm màn hình **OLED 0.96"**, **Flame Sensor**, **MC-38**, **nút Tắt còi từ xa**, **chế độ AUTO lưu Flash NVS**).

---

## 1. Các file cần dùng

- [`sketch.ino`](file:///d:/ST23D/2026-2027/LTDD2/Dự%20án/IOT_Home/firmware/wokwi/sketch.ino): Toàn bộ mã nguồn C++ (đã tích hợp sẵn driver OLED SSD1306 nhẹ, chỉ cần 1 file duy nhất).
- [`diagram.json`](file:///d:/ST23D/2026-2027/LTDD2/Dự%20án/IOT_Home/firmware/wokwi/diagram.json): Sơ đồ đầy đủ **14 linh kiện** (ESP32, OLED 0.96", 2 LED, Quạt, Buzzer, Servo SG90, DHT22, PIR, biến trở MQ-2, công tắc Flame D33, công tắc MC-38 D32, 2 nút nhấn D18/D19).
- [`libraries.txt`](file:///d:/ST23D/2026-2027/LTDD2/Dự%20án/IOT_Home/firmware/wokwi/libraries.txt): 4 thư viện (`PubSubClient`, `ArduinoJson`, `DHT sensor library`, `ESP32Servo`).

> **Lưu ý:** Khi chạy mô phỏng trên Wokwi Web, nên **rút cáp USB mạch ESP32 thật** để tránh 2 thiết bị cùng publish dữ liệu song song vào `home1`.

---

## 2. Cách đẩy lên Wokwi Web (3 bước trong 1 phút)

1. Mở trình duyệt và truy cập: **https://wokwi.com/projects/new/esp32**
2. **Dán 3 tab nội dung:**
   - **Tab `sketch.ino`**: Chọn hết (`Ctrl+A`) → xóa → dán toàn bộ file [`sketch.ino`](file:///d:/ST23D/2026-2027/LTDD2/Dự%20án/IOT_Home/firmware/wokwi/sketch.ino).
   - **Tab `diagram.json`**: Chọn hết (`Ctrl+A`) → xóa → dán toàn bộ file [`diagram.json`](file:///d:/ST23D/2026-2027/LTDD2/Dự%20án/IOT_Home/firmware/wokwi/diagram.json).
   - **Tab `Library Manager`**: Bấm dấu `+` tìm và thêm đúng **4 thư viện** trong [`libraries.txt`](file:///d:/ST23D/2026-2027/LTDD2/Dự%20án/IOT_Home/firmware/wokwi/libraries.txt) *(không cần thêm thư viện OLED)*:
     1. `PubSubClient`
     2. `ArduinoJson`
     3. `DHT sensor library`
     4. `ESP32Servo`
3. Bấm nút **Play (`▶`)** (nút màu xanh lá):
   - Màn hình **OLED 0.96"** trên Wokwi sẽ sáng lên 4 dòng thông số sống (`WF:OK MQ:OK [MANU]`, `T/H`, `GAS/PIR`, `D1/D2/F`, `CUA`).
   - Serial Monitor in `[MQTT] >>> KET NOI EMQX THANH CONG! <<<`.
   - Mở Web (`http://localhost:8082`) và Android sẽ thấy **`🟢 ESP32 Online`** ngay lập tức!

---

## 3. Cách test toàn bộ tính năng trên Wokwi Web

| Thao tác trên Wokwi / App | Kết quả mong đợi |
|---|---|
| Bấm bật/tắt **Đèn P.Khách / P.Ngủ / Quạt / Cửa** trên Web hoặc Android | LED đỏ (`D25`), LED vàng (`D26`), LED xanh (`D27`) sáng/tắt ngay; Servo (`D13`) quay `90°`/`0°` kèm tiếng bíp; OLED cập nhật tức thì |
| Bấm nút **`Nut Cua (D18)`** trên Wokwi | Cửa Servo đóng/mở và đồng bộ ngay lên Web & Android |
| Bấm nhanh nút **`Den / Mode (D19)`** trên Wokwi | Bật/tắt Đèn Phòng khách (hoặc tắt còi tại chỗ nếu đang hú) |
| **Nhấn giữ nút `D19` ≥ 1.8 giây** trên Wokwi | Đổi chế độ **`MANUAL ↔ AUTO`** (1 bíp = AUTO, 2 bíp = MANUAL), OLED & Web/Android tự nhảy theo |
| Click **`DHT22`** tăng nhiệt độ `≥ 31°C` (khi đang `AUTO`) | Quạt (`D27`) tự bật; hạ xuống `≤ 29.5°C` quạt tự tắt |
| Click **`PIR`** bấm `Simulate motion` (khi `AUTO`) | Đèn Phòng khách (`D25`) tự bật khi có người, tự tắt khi hết chuyển động |
| Xoay biến trở **`MQ-2 (D34)` > 2200** HOẶC gạt công tắc **`sw_flame` (D33)** sang trái | Còi Buzzer hú âm thanh thật, OLED hiện `!! CANH BAO LUA / KHOI !!`, quạt AUTO bật và đẩy **thông báo FCM** về điện thoại Android |
| Bấm nút **`🔇 Tắt còi`** trên Web/Android | Còi trên Wokwi im ngay lập tức (`[BUZZER] Da tat coi tu xa qua App/Web!`) |
| Gạt công tắc **`sw_door_mc38` (D32)** trái/phải | Mô phỏng cảm biến từ cửa đóng/mở và cập nhật trạng thái `door1` lên Web/Android |
| Bấm nút **Stop (`■`)** trên Wokwi | Sau ~15–25s, LWT kích hoạt → Web & Android báo **`ESP32 Ngoại tuyến`** và lệnh gửi bị **`TIMEOUT`** |
