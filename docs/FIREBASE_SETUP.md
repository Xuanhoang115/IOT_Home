# HƯỚNG DẪN THIẾT LẬP FIREBASE (AUTH, REALTIME DATABASE & FCM)

## 1. Các Dịch Vụ Firebase Sử Dụng
1. **Firebase Authentication**: Phương thức đăng nhập `Email/Password`.
2. **Firebase Realtime Database**: Lưu trữ cây dữ liệu thời gian thực của ngôi nhà (`home1`).
3. **Firebase Cloud Messaging (FCM)**: Gửi thông báo đẩy khi có cảnh báo khói/chuyển động bất thường.

---

## 2. Thiết Kế Schema Firebase Realtime Database

Cây dữ liệu JSON chuẩn tuân thủ đúng 10 nhánh bắt buộc trong Master Prompt:

```json
{
  "users": {
    "uid_student_01": {
      "email": "student1@smarthome.edu.vn",
      "displayName": "Nguyễn Văn A (TV1)",
      "role": "owner",
      "createdAt": 1762850000000
    }
  },
  "userHomes": {
    "uid_student_01": {
      "home1": true
    }
  },
  "homes": {
    "home1": {
      "name": "Mô Hình Nhà Thông Minh Nhóm 5",
      "systemMode": "MANUAL",
      "autoConfig": {
        "tempThresholdHigh": 31.0,
        "tempThresholdLow": 29.5,
        "smokeThresholdAdc": 2200,
        "motionAutoLight": false
      },
      "esp32Status": {
        "online": true,
        "lastSeen": 1762855230000,
        "rssi": -58,
        "firmwareVersion": "1.0.0"
      }
    }
  },
  "rooms": {
    "home1": {
      "living_room": {
        "id": "living_room",
        "name": "Phòng khách",
        "icon": "sofa",
        "deviceIds": ["light1", "fan1", "door1"]
      },
      "bedroom": {
        "id": "bedroom",
        "name": "Phòng ngủ",
        "icon": "bed",
        "deviceIds": ["light2"]
      },
      "kitchen": {
        "id": "kitchen",
        "name": "Phòng bếp",
        "icon": "kitchen",
        "deviceIds": []
      }
    }
  },
  "devices": {
    "home1": {
      "light1": {
        "id": "light1",
        "name": "Đèn Phòng khách",
        "type": "light",
        "roomId": "living_room",
        "desiredState": { "power": "OFF" },
        "reportedState": { "power": "OFF" },
        "lastCommandStatus": "ACKED",
        "lastUpdated": 1762855200000
      },
      "light2": {
        "id": "light2",
        "name": "Đèn Phòng ngủ",
        "type": "light",
        "roomId": "bedroom",
        "desiredState": { "power": "OFF" },
        "reportedState": { "power": "OFF" },
        "lastCommandStatus": "ACKED",
        "lastUpdated": 1762855200000
      },
      "fan1": {
        "id": "fan1",
        "name": "Quạt Thông gió",
        "type": "fan",
        "roomId": "living_room",
        "desiredState": { "power": "OFF", "mode": "MANUAL" },
        "reportedState": { "power": "OFF", "mode": "MANUAL" },
        "lastCommandStatus": "ACKED",
        "lastUpdated": 1762855200000
      },
      "door1": {
        "id": "door1",
        "name": "Cửa Chính (Servo)",
        "type": "door",
        "roomId": "living_room",
        "desiredState": { "doorState": "CLOSED", "targetAngle": 0 },
        "reportedState": {
          "doorState": "CLOSED",
          "currentAngle": 0,
          "positionVerified": false
        },
        "lastCommandStatus": "ACKED",
        "lastUpdated": 1762855200000
      }
    }
  },
  "latestSensors": {
    "home1": {
      "temperature": { "value": 28.5, "unit": "C", "roomId": "living_room", "updatedAt": 1762855210000 },
      "humidity": { "value": 65.0, "unit": "%", "roomId": "living_room", "updatedAt": 1762855210000 },
      "motion": { "motionDetected": false, "roomId": "living_room", "updatedAt": 1762855212000 },
      "smoke": { "rawAdc": 980, "smokeLevelPercent": 23.9, "abnormal": false, "roomId": "kitchen", "updatedAt": 1762855215000 }
    }
  },
  "sensorReadings": {
    "home1": {
      "sr_1762855200000": {
        "temperature": 28.5,
        "humidity": 65.0,
        "smokeRawAdc": 980,
        "motionDetected": false,
        "timestamp": 1762855200000
      }
    }
  },
  "commands": {
    "home1": {
      "req_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d": {
        "requestId": "req_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "deviceId": "light1",
        "desiredState": { "power": "ON" },
        "status": "ACKED",
        "requestedBy": "uid_student_01",
        "createdAt": 1762855200000,
        "ackedAt": 1762855200350
      }
    }
  },
  "alerts": {
    "home1": {
      "alt_1762855220000_mq2": {
        "id": "alt_1762855220000_mq2",
        "type": "SMOKE_DETECTED",
        "severity": "CRITICAL",
        "roomId": "kitchen",
        "message": "Phát hiện nồng độ khói/khí vượt ngưỡng tại Phòng bếp!",
        "acknowledged": false,
        "timestamp": 1762855220000
      }
    }
  },
  "activityLogs": {
    "home1": {
      "log_1762855200350": {
        "id": "log_1762855200350",
        "deviceId": "light1",
        "action": "TURN_ON",
        "source": "REMOTE_COMMAND",
        "actorUid": "uid_student_01",
        "timestamp": 1762855200350
      }
    }
  },
  "notificationTokens": {
    "uid_student_01": {
      "token_iphone14plus": {
        "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
        "platform": "ios",
        "updatedAt": 1762855000000
      }
    }
  }
}
```

---

## 3. Nguyên Tắc Bảo Mật Trong `firebase/database.rules.json`
- Người dùng phải đăng nhập (`auth != null`) và có `root.child('userHomes').child(auth.uid).child($homeId).val() === true` mới được **đọc** dữ liệu của `$homeId`.
- **Chặn người dùng giả mạo `reportedState`**: Toàn bộ quyền ghi vào `devices/$homeId`, `latestSensors/$homeId`, `sensorReadings/$homeId`, `commands/$homeId`, `alerts/$homeId`, `activityLogs/$homeId` đều đặt `.write: false` đối với Client SDK. Chỉ có **Backend Node.js (dùng Firebase Admin SDK có quyền bypass rules)** mới được phép ghi sau khi xác thực hoặc nhận bản tin từ ESP32.

---

## 4. Các Bước Tạo Project Trên Firebase Console
1. Truy cập [Firebase Console](https://console.firebase.google.com/), tạo project `smart-home-iot-2026`.
2. Vào **Authentication** → **Sign-in method** → Bật **Email/Password**.
3. Vào **Realtime Database** → **Create Database** (chọn vùng `asia-southeast1` Singapore để độ trễ thấp nhất tại Việt Nam) → Copy nội dung file [`firebase/database.rules.json`](../firebase/database.rules.json) dán vào tab **Rules** và nhấn **Publish**.
4. Vào **Project Settings** → **General** → Thêm **Web App** để lấy bộ `firebaseConfig` điền vào `mobile/.env`.
5. Vào **Project Settings** → **Service accounts** → Nhấn **Generate new private key** để lấy thông tin `project_id`, `client_email`, `private_key` điền vào `backend/.env` (**Tuyệt đối không commit file JSON này lên Git**).
