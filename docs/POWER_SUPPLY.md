# THIẾT KẾ NGUỒN CẤP & AN TOÀN ĐIỆN (POWER SUPPLY DESIGN)

## 1. Bảng Tính Toán Dòng Tiêu Thụ Toàn Hệ Thống

Để đảm bảo ESP32 không bị sụt áp (Brownout Reset) khi bật quạt hoặc quay cửa Servo cùng lúc với phát Wi-Fi, nhóm lập bảng ngân sách dòng điện (Current Budget) ở mức `5V`:

| Thành phần | Dòng tiêu thụ trung bình (mA) | Dòng đỉnh / Khởi động (Peak mA) | Nguồn cấp trực tiếp |
| :--- | ---: | ---: | :--- |
| **ESP32 DevKit CP2102 (Wi-Fi TX)** | 160 mA | 350 mA | Đường `5V` vào chân `VIN` (hoặc USB) qua IC AMS1117-3.3 |
| **Cảm biến MQ-2 (Đốt tim sấy)** | 150 mA | 180 mA | Đường `5V Ngoài` |
| **Cảm biến DHT22 + PIR HC-SR501** | 3 mA | 5 mA | `3.3V` (DHT22) & `5V Ngoài` (PIR) |
| **2 × LED 5mm + Active Buzzer** | 45 mA | 60 mA | GPIO / `3.3V` |
| **Quạt mini DC 5V (qua MOSFET)** | 180 mA | 350 mA | Đường `5V Ngoài` |
| **Servo SG90 180° (Khi quay/kẹt nhẹ)** | 220 mA | **650 mA** | Đường `5V Ngoài` + Tụ bù `470–1000µF` |
| **TỔNG CỘNG TOÀN MẠCH** | **~758 mA** | **~1.595 mA (~1.6A)** | **Adapter 5V – 2A (2.000 mA)** |

### Kết luận về khả năng cấp nguồn:
- Tổng dòng đỉnh lý thuyết khi **Wi-Fi đang phát + MQ-2 đang sấy + Quạt vừa khởi động + Servo vừa quay** là khoảng **`1.6A`**.
- Với **Adapter 5V – 2A (`2.000 mA`)** hoặc **Power Bank 5V – 2A/2.4A**, nguồn cấp còn dư khoảng **`20–25%` công suất dự phòng**, đảm bảo hệ thống chạy ổn định liên tục.
- Ngược lại, nếu chỉ cắm cáp USB từ cổng USB 2.0 của laptop (`tối đa 500 mA`) mà không có nguồn 5V ngoài, chắc chắn ESP32 sẽ bị sụt áp và khởi động lại liên tục khi Servo hoặc Quạt chạy.

---

## 2. Giải Pháp Chống Sụt Áp & Khởi Động Ổn Định (Anti-Brownout)

1. **Tụ lọc nguồn đặt sát Servo SG90 (`470µF – 1000µF / 16V`)**:
   - Khi Servo SG90 bắt đầu quay từ trạng thái đứng yên, nó rút dòng tức thời (`inrush current`) lên tới `600–700mA` trong vài chục mili-giây.
   - Tụ hóa `470µF–1000µF` cắm ngay trên đường `5V` và `GND` cạnh chân cắm Servo sẽ phóng điện bù ngay lập tức cho xung dòng này, giữ cho điện áp nguồn của ESP32 không bị tụt xuống dưới ngưỡng Brownout.
2. **Diode Flyback `1N4007` cho Quạt DC 5V**:
   - Quạt DC là tải cảm kháng. Khi MOSFET ngắt đột ngột, cuộn dây quạt sinh ra sức điện động cảm ứng ngược có thể làm hỏng MOSFET hoặc gây nhiễu làm treo ESP32.
   - Mắc 1 diode `1N4007` song song ngược với quạt (**Vạch trắng Cathode nối vào cực `+` của quạt, Anode nối vào cực `-` của quạt**) để triệt tiêu xung ngược.
3. **Khởi động mềm trong Firmware (Staggered Boot Sequence)**:
   - Khi ESP32 vừa cấp điện (`setup()`), không bật cùng lúc Wi-Fi, Servo và Quạt trong cùng một mili-giây:
     1. Khởi tạo các chân GPIO của LED, Quạt, Buzzer về trạng thái `LOW` an toàn.
     2. Đợi `300ms` cho điện áp nguồn ổn định rồi mới đưa Servo về vị trí ban đầu.
     3. Sau đó mới bật radio Wi-Fi để kết nối mạng.

---

## 3. Hai Phương Án Cấp Nguồn Cho Mô Hình Vật Lý

### Phương án 1: Chạy cố định tại bàn bảo vệ bằng Adapter 5V – 2A (Chính)
- Cắm **Adapter 5V – 2A** vào ổ điện, đưa qua **Jack chuyển DC ra domino** vào thanh nguồn `5V` và `GND` trên Breadboard MB-102.
- Từ thanh nguồn `5V` này cấp vào chân `VIN` (hoặc `5V`) của ESP32, đồng thời cấp riêng nhánh cho Servo, MOSFET Quạt, MQ-2 và PIR.

### Phương án 2: Chạy di động hoàn toàn bằng Power Bank 5V – 2A (Khi mang mô hình lên bục thuyết trình)
- Sử dụng **Pin sạc dự phòng (Power Bank) 5V – 2A thương mại có sẵn mạch bảo vệ quá dòng/ngắn mạch** (tuyệt đối không dùng pin cell Lithium 18650 trần không có mạch BMS).
- Dùng cáp USB cấp nguồn vào hệ thống hoặc dùng 2 cổng ra của Power Bank (Cổng 1 cắm cáp USB vào ESP32; Cổng 2 lấy 5V cấp ra thanh nguồn ngoại vi cho Servo/Quạt/MQ-2, **lưu ý hai cổng trên cùng 1 Power Bank đã chung GND hoặc nối dây GND chung**).

---

## 4. Quy Tắc An Toàn Điện & Phòng Cháy Khi Thử Nghiệm
- **Không dùng điện lưới 220V AC** dưới bất kỳ hình thức nào trong mô hình (không dùng relay đóng cắt bóng đèn 220V). Toàn bộ mô hình chỉ dùng điện áp thấp **`3.3V – 5V DC`**.
- **Cách thử cảm biến MQ-2 an toàn**:
  - **CẤM**: Không đốt giấy, không đốt nhựa, không xả khí gas bật lửa nồng độ cao trong phòng học hoặc phòng kín.
  - **NÊN DÙNG**:
    1. Dùng bông tẩm một chút **cồn y tế 70°–90° (Ethanol/Isopropyl Alcohol)** đưa lại gần đầu lưới kim loại của MQ-2 (cách `2–3 cm`) — MQ-2 cực kỳ nhạy với hơi cồn, chỉ số ADC sẽ tăng vọt ngay lập tức mà hoàn toàn không có lửa hay khói độc.
    2. Hoặc dùng chế độ mô phỏng/nút test an toàn trong lúc kiểm thử phần mềm.
- **Lưu ý trách nhiệm**: Cảm biến MQ-2 trong đồ án chỉ phục vụ mục đích học tập và minh họa nguyên lý IoT, **không phải** thiết bị báo cháy chuyên dụng được kiểm định PCCC.
