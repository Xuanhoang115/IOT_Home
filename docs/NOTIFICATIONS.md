# THIẾT KẾ HỆ THỐNG THÔNG BÁO (3 TRẠNG THÁI) & HƯỚNG DẪN CẤU HÌNH

## 1. Phân Biệt Rõ Cơ Chế Cảnh Báo Theo 3 Trạng Thái Ứng Dụng

Một sai lầm phổ biến trong các đồ án sinh viên là nhầm lẫn giữa **Firebase Realtime Database listener (`onValue`)** và **Remote Push Notification (FCM / APNs)**. Hệ thống này tách bạch rõ ràng như sau:

| Trạng thái App | Cơ chế hoạt động chính | Hành vi hiển thị trên Điện thoại |
| :--- | :--- | :--- |
| **1. Foreground** *(App đang mở trên màn hình)* | - **Chính**: Listener `onValue(ref(db, 'alerts/home1'))` của Firebase Realtime Database nhận bản tin tức thời (< 200ms).<br>- **Phụ**: `expo-notifications` (`setNotificationHandler`) hiển thị Local/In-app Notification Banner kèm âm thanh. | Hiển thị **Banner Cảnh Báo Đỏ** ngay trên đỉnh màn hình App + cập nhật danh sách trong màn hình `Alerts` (hoạt động **100% trên cả Expo Go và Development Build**). |
| **2. Background** *(App đang thu nhỏ dưới nền)* | - Kết nối WebSocket của Realtime DB có thể bị hệ điều hành (iOS/Android) đóng băng.<br>- **Backend Node.js** gọi `firebase-admin` (`messaging().sendEachForMulticast`) hoặc Expo Push Service qua **FCM / APNs** để đánh thức thiết bị. | Hệ điều hành hiển thị thông báo trên thanh trạng thái / màn hình khóa. Khi người dùng nhấn vào thông báo, App mở ra và điều hướng thẳng tới màn hình **`Alerts`**. |
| **3. Terminated (Killed)** *(App đã bị vuốt tắt hoàn toàn)* | - Không còn code JavaScript nào của App chạy nền.<br>- **Chỉ có Remote Push Notification (FCM trên Android / APNs trên iOS)** từ Backend mới hiển thị được thông báo. | Hệ điều hành nhận push từ FCM/APNs và hiển thị thông báo. Khi người dùng nhấn vào thông báo, hàm `useLastNotificationResponse()` trong App bắt sự kiện lúc khởi động và chuyển hướng tới màn hình **`Alerts`**. |

---

## 2. Lưu Ý Quan Trọng Về Expo Go (SDK 54) Trên iPhone 14 Plus & Android

1. **Giới hạn thực tế của Expo Go**:
   - Từ **Expo SDK 53/54**, ứng dụng **Expo Go không còn hỗ trợ nhận Remote Push Notification (FCM/APNs)** trực tiếp như các bản SDK cũ.
   - Trên **iOS (iPhone 14 Plus)**, để cấu hình APNs Key cho Remote Push cũng bắt buộc phải có tài khoản **Apple Developer Program trả phí (\$99/năm)**.
2. **Giải pháp chuẩn của dự án để luôn Demo thành công 100%**:
   - **Tầng 1 (Chắc chắn chạy trên mọi máy, kể cả Expo Go trên iPhone 14 Plus)**:
     - Cảnh báo **Foreground** qua Firebase Realtime Database listener + Banner cảnh báo trực quan trong App + Local Notification thông qua `expo-notifications` (`scheduleNotificationAsync`) khi App đang hoạt động.
     - Đồng thời **Buzzer tại mạch ESP32 kêu ngay lập tức** độc lập với mạng.
   - **Tầng 2 (Khi chạy trên Android Development Build / EAS Build có cấu hình `google-services.json`)**:
     - Nhận đầy đủ **Remote Push Notification ở cả trạng thái Background và Terminated** hoàn toàn miễn phí qua Firebase Cloud Messaging (FCM).

---

## 3. Hướng Dẫn Tạo Expo Development Build (Khi Cần Test Remote Push Thật)

Nếu nhóm muốn kiểm thử Remote Push ở trạng thái `Background` và `Terminated` trên máy Android (hoặc iOS có tài khoản Apple Developer):

```powershell
# 1. Cài đặt EAS CLI
npm install -g eas-cli

# 2. Đăng nhập tài khoản Expo
eas login

# 3. Cấu hình EAS cho thư mục mobile
cd mobile
eas build:configure

# 4. Tạo bản Development Build cho Android (tải file .apk cài vào máy)
eas build --profile development --platform android
```

---

## 4. Cơ Chế Chống Gửi Cảnh Báo Trùng Liên Tục (Anti-Spam Cooldown)

Khi cảm biến `MQ-2` phát hiện khói, giá trị ADC có thể duy trì ở mức cao liên tục trong 30–60 giây. Để tránh gửi hàng chục thông báo làm treo điện thoại:
- **Trên ESP32**: Chỉ publish lên `smarthome/home1/alerts` ngay khi chuyển trạng thái từ `NORMAL → ABNORMAL`, và áp dụng thời gian nghỉ (`alertCooldownMs = 30000ms` = 30 giây) trước khi gửi lại bản tin cảnh báo tiếp theo nếu khói vẫn còn.
- **Trên Backend Node.js**: Lưu bộ nhớ đệm `lastAlertTimestampByType`. Nếu hai cảnh báo cùng loại (`SMOKE_DETECTED` hoặc `MOTION_DETECTED`) cách nhau dưới `60 giây`, Backend chỉ cập nhật `latestSensors` chứ không bắn lặp lại Push Notification.
