# KỊCH BẢN TRÌNH DIỄN & BẢO VỆ ĐỒ ÁN (DEMO SCRIPT – 5 ĐẾN 7 PHÚT)

Tài liệu này hướng dẫn kịch bản trình diễn trực tiếp trước Hội đồng chấm đồ án môn **Lập trình Di động (SMART HOME IoT 2026)** cho nhóm 5 sinh viên.

---

## 1. Chuẩn Bị Trước Giờ Bảo Vệ (3 Phút)

1. **Phần cứng (TV4)**:
   - Cắm nguồn cho mạch ESP32 (qua cáp USB hoặc Power Bank 5V 2A).
   - Kiểm tra nhanh các chân: Đèn Phòng khách (`D25`), Đèn Phòng ngủ + Còi (`D26` + `D14`), Quạt MOSFET (`D27`), Cảm biến nhiệt ẩm `DHT22` (`D4`), Nút nhấn Đèn (`D19`), Nút nhấn Cửa (`D18`).
2. **Backend & Web Dashboard (TV2, TV3)**:
   - Cửa sổ PowerShell 1 (chạy Backend + MQTT Bridge):
     ```powershell
     cd "D:\ST23D\2026-2027\LTDD2\Dự án\IOT_Home\backend"
     node --import tsx src/index.ts
     ```
   - Cửa sổ PowerShell 2 (chạy Giao diện Web Neumorphism):
     ```powershell
     cd "D:\ST23D\2026-2027\LTDD2\Dự án\IOT_Home"
     npm.cmd run web
     ```
3. **Thiết bị Di động (TV1, TV5)**:
   - Mở trình duyệt trên máy tính tại `http://localhost:8081` và Safari trên iPhone tại `http://<IP_LAN_MAY_TINH>:8081` (cùng mạng Wi-Fi/Hotspot).
   - Đăng nhập bằng tài khoản Firebase đã cấp quyền `home1`.

---

## 2. Kịch Bản Demo 6 Bước Trước Hội Đồng

### Bước 1: Giới thiệu Giao diện Neumorphism & Đồng bộ Đa nền tảng (1 phút – TV1)
- Trình chiếu song song màn hình **Web trên Laptop** và **iPhone**.
- Giới thiệu màn hình **Home (`Dashboard`)**:
  - Thẻ **My Location** hiển thị nhiệt độ, độ ẩm thực tế từ cảm biến `DHT22` gửi về mỗi 5 giây.
  - Lưới 4 khu vực (**Master Bedroom**, **Dining & Kitchen**, **Living Room**, **Smart Entrance**) với trạng thái từng phòng rõ ràng.
- Chuyển sang nút tròn **Thermostat (`🌡️`)** ở chính giữa thanh điều hướng dưới đáy để trình diễn vòng xoay nhiệt độ và nút chuyển giao diện Sáng/Tối (`☀️ / 🌙`).

### Bước 2: Điều khiển Thiết bị 2 Chiều & Cơ chế Chờ Xác Nhận `reportedState` (1.5 phút – TV1 & TV3)
- Bấm công tắc **Living Room** (hoặc vào tab **Devices** bật **Đèn Phòng khách** `light1` và **Đèn Phòng ngủ** `light2`).
- Giải thích điểm nhấn kỹ thuật:
  - Khi bấm nút, App chuyển sang trạng thái **`⏳ Đang gửi lệnh... (PENDING)`**, gửi lệnh qua REST API → Backend → MQTT TLS (`qos = 1, retain = false`) xuống ESP32.
  - Chỉ khi ESP32 thực sự bật chân GPIO và trả bản tin `reportedState` (`ACKED`) về lại MQTT → Firebase, công tắc trên cả Web và iPhone mới chuyển sang **`ON`**.
- **Bấm nút nhấn vật lý trên breadboard (`D19` và `D18`)**:
  - Đèn LED trên mạch đổi trạng thái ngay lập tức (kể cả khi mất mạng) và giao diện trên Web + iPhone tự động đổi trạng thái theo trong vòng 1–2 giây.

### Bước 3: Chế độ Tự động (`AUTO`) có Hysteresis theo Nhiệt độ Thực tế (1.5 phút – TV4)
- Trên màn hình **Thermostat (`🌡️`)**, bấm nút tròn **`MODE`** để chuyển hệ thống sang **`AUTO`**.
- Dùng tay áp nhẹ hoặc hà hơi ấm vào cảm biến **`DHT22`**:
  - Khi nhiệt độ tăng vượt ngưỡng **`31.0°C`**, ESP32 tự động kích MOSFET (`D27`) bật **Quạt Thông gió (`fan1`)** và đồng bộ trạng thái `ON (AUTO_RULE)` lên App.
  - Khi buông tay để nhiệt độ hạ xuống dưới **`29.5°C`**, quạt tự động tắt (cơ chế **Hysteresis 1.5°C** chống bật/tắt liên tục ở ngưỡng biên).

### Bước 4: Cảnh báo Khói Khẩn cấp & Đồng bộ Xác nhận Cảnh báo (1 phút – TV2 & TV5)
- Tại màn hình **Thermostat (`🌡️`)** hoặc **Alerts**, bấm nút **`TEST SIM`** (hoặc kích hoạt cảnh báo khói):
  - Banner đỏ **`🚨 CẢNH BÁO KHẨN CẤP`** bật lên đồng thời trên cả máy tính và iPhone.
- Bấm nút **Xác nhận (`Acknowledge`)** trên iPhone:
  - Banner cảnh báo trên cả iPhone và máy tính cùng biến mất ngay lập tức nhờ đồng bộ trên Firebase Realtime Database.

### Bước 5: Kịch bản Rút Nguồn ESP32 – Phát hiện Offline & Timeout An toàn (1 phút – TV3 & TV5)
- **Rút cáp nguồn USB của ESP32** ngay trước mặt Hội đồng:
  - Giải thích cơ chế **MQTT Watchdog + LWT**: Sau vài giây không còn gói tin cảm biến live từ ESP32, thanh trạng thái trên App tự động chuyển từ **`🟢 ESP32 Online`** sang **`🔴 ESP32 Offline`**.
- Thử bấm bật **Đèn Phòng khách** khi ESP32 đang rút nguồn:
  - Công tắc hiện `⏳ Đang gửi lệnh...`, giữ nguyên trạng thái cũ và sau đúng **8 giây** báo **`⚠️ Lỗi Timeout`** (tuyệt đối không báo bật giả).
- **Cắm lại cáp nguồn USB cho ESP32**:
  - ESP32 khởi động ở trạng thái an toàn (Cửa đóng, không tự chạy lại lệnh cũ nhờ `retain = false` trên topic `/set`), tự kết nối lại Wi-Fi + MQTT TLS, và App tự động chuyển lại **`🟢 ESP32 Online`**.

### Bước 6: Kiểm tra Lịch sử Hoạt động (`History`) & Bảo mật Firebase (30 giây – TV2)
- Mở tab **History** trên App để cho Hội đồng thấy toàn bộ nhật ký điều khiển đều ghi rõ nguồn tác động (`REMOTE_COMMAND`, `PHYSICAL_BUTTON`, `AUTO_RULE`, `BOOT_SYNC`) kèm dấu thời gian chính xác.
