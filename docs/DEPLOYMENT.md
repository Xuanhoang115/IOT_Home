# HƯỚNG DẪN TRIỂN KHAI & VẬN HÀNH HỆ THỐNG (DEPLOYMENT GUIDE)

## 1. Yêu Cầu Môi Trường Trên Windows 10/11
- **Node.js**: Phiên bản LTS (`v20.x` hoặc `v22.x`).
- **Trình quản lý gói**: `npm` (đi kèm Node.js).
- **IDE**: Visual Studio Code + PlatformIO IDE extension (hoặc Arduino IDE `2.3+` kèm board package `esp32 by Espressif Systems`).
- **Công cụ kiểm thử MQTT**: MQTTX Desktop.
- **Thiết bị di động**: iPhone 14 Plus (cài sẵn **Expo Go**) hoặc điện thoại Android cùng kết nối chung mạng Wi-Fi LAN với laptop chạy Backend.

---

## 2. Quy Trình Khởi Chạy Hệ Thống Khi Demo / Bảo Vệ Đồ Án

### Bước 1: Kiểm tra địa chỉ IPv4 LAN của Laptop chạy Backend
Mở PowerShell trên Windows:
```powershell
ipconfig
```
Ghi lại địa chỉ **IPv4 Address** của card Wi-Fi (ví dụ: `192.168.1.15`). Điền địa chỉ này vào biến `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.15:3000/api` trong `mobile/.env`.

### Bước 2: Khởi động Backend Node.js
```powershell
cd backend
cp .env.example .env
# Điền thông tin HiveMQ và Firebase Admin vào backend/.env
npm install
npm run dev
```
Kiểm tra nhanh Backend đã sống chưa:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health"
```

### Bước 3: (Tùy chọn khi chưa cắm mạch thật) Chạy ESP32 Simulator
```powershell
cd backend
npm run simulator
```

### Bước 4: Nạp Firmware và Cấp nguồn cho Mô hình ESP32
1. Sao chép `firmware/esp32-smarthome/include/secrets.example.h` thành `secrets.h` và điền `WIFI_SSID`, `WIFI_PASSWORD` (khuyên dùng **Wi-Fi Hotspot 2.4GHz phát từ điện thoại của thành viên nhóm** khi đi bảo vệ ở giảng đường để không phụ thuộc Wi-Fi trường) cùng thông tin HiveMQ.
2. Cắm cáp USB nạp firmware vào ESP32 DevKit CP2102 (cần cài driver **Silicon Labs CP210x USB to UART Bridge** trên Windows nếu chưa có).
3. Sau khi nạp xong, rút cáp USB khỏi laptop và cắm **Adapter 5V – 2A** (hoặc **Power Bank 5V – 2A**) vào mô hình.

### Bước 5: Khởi động Ứng dụng Di động (Expo SDK 54)
```powershell
cd mobile
cp .env.example .env
npm install
npx expo start -c
```
Dùng camera trên **iPhone 14 Plus** quét mã QR hiển thị trên cửa sổ PowerShell để mở ứng dụng trong **Expo Go**.

---

## 3. Checklist Chuẩn Bị Trước Giờ Bảo Vệ 30 Phút
1. [ ] Bật Wi-Fi Hotspot 2.4GHz có tên và mật khẩu cố định (trùng với cấu hình đã nạp trong ESP32).
2. [ ] Kết nối Laptop chạy Backend vào cùng Wi-Fi Hotspot đó, kiểm tra lại IP LAN trong `mobile/.env`.
3. [ ] Cấp nguồn cho mô hình trước ít nhất **1 phút** để cảm biến `MQ-2` hoàn tất quá trình sấy nóng (`Preheat`).
4. [ ] Chuẩn bị sẵn bông tẩm cồn y tế 70° trong lọ kín để demo cảnh báo `MQ-2` sạch sẽ, an toàn, chuyên nghiệp.
5. [ ] Mở sẵn một tab **MQTTX Desktop** và **Firebase Realtime Database Console** trên màn hình Laptop để hội đồng chấm thi thấy rõ luồng bản tin nhảy theo thời gian thực khi thao tác trên điện thoại.
