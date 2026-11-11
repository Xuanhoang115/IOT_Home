# DANH MỤC LINH KIỆN & ĐỐI CHIẾU NGÂN SÁCH (BOM)

Ngân sách tối đa cho phép: **1.000.000 VNĐ**.

> **Phân biệt loại giá**:
> - **Giá tham khảo thị trường VN (Ước tính 2026)**: Mức giá bán lẻ phổ biến tại các cửa hàng linh kiện điện tử sinh viên tại Việt Nam (Hshop, Nshop, Banlinhkien, IC Đầy Rồi, Shopee Mall).
> - **Trạng thái xác minh**: Ghi rõ `Ước tính (Cần chốt hóa đơn khi mua)` để nhóm cập nhật giá thực tế khi thanh toán.

---

## 1. Bảng Chi Tiết Linh Kiện (24 Hạng mục theo Master Prompt)

| STT | Tên linh kiện | Quy cách kỹ thuật | SL | Đơn giá ước tính (VNĐ) | Thành tiền (VNĐ) | Phân loại giá | Ghi chú kỹ thuật & An toàn |
| :-: | :--- | :--- | :-: | ---: | ---: | :---: | :--- |
| 1 | **ESP32 DevKit V1 CP2102** | Bản 30 chân, Wi-Fi + BLE, Micro-USB/Type-C | 1 | 115.000 | 115.000 | Ước tính | Kiểm tra đúng sơ đồ 30 chân trước khi cắm |
| 2 | **Cảm biến DHT22 (AM2302)** | Module có sẵn trở kéo lên (pull-up) hoặc rời | 1 | 65.000 | 65.000 | Ước tính | Cấp nguồn `3.3V`, đọc nhiệt độ & độ ẩm |
| 3 | **LED đơn 5mm** | Đỏ, Xanh lá, Vàng, Trắng | 5 | 1.000 | 5.000 | Ước tính | Dùng 2 LED chính (`light1`, `light2`) + 3 dự phòng |
| 4 | **Điện trở 220Ω / 330Ω** | 1/4W, hạn dòng cho LED | 5 | 500 | 2.500 | Ước tính | Mắc nối tiếp mỗi chân Anode của LED |
| 5 | **Điện trở 10kΩ** | 1/4W (nên mua 1 vỉ 10 con giá ~3.000đ) | 2 (+8) | 3.000 | 3.000 | Ước tính | Dùng làm cầu phân áp 5V → 3.3V cho MQ-2 |
| 6 | **Breadboard MB-102** | 830 lỗ, có 2 đường nguồn hai bên | 1 | 28.000 | 28.000 | Ước tính | Tách riêng đường `5V` ngoại vi và `3.3V` logic |
| 7 | **Dây Jumper Đực–Đực** | Dài 20cm (tép 10 sợi) | 10 | 8.000 | 8.000 | Ước tính | Đi dây trên breadboard |
| 8 | **Dây Jumper Đực–Cái** | Dài 20cm (tép 10 sợi) | 10 | 8.000 | 8.000 | Ước tính | Nối module cảm biến vào breadboard |
| 9 | **Dây Jumper Cái–Cái** | Dài 20cm (tép 10 sợi) | 10 | 8.000 | 8.000 | Ước tính | Nối các module rời |
| 10 | **Quạt mini DC 5V** | Kích thước 30×30mm hoặc 40×40mm, dòng ~0.15–0.25A | 1 | 22.000 | 22.000 | Ước tính | Tuyệt đối không cắm trực tiếp vào GPIO ESP32 |
| 11 | **Module MOSFET điều khiển** | Tương thích mức logic `3.3V` (VD: LR7843 / AOD4184 / D4184) | 1 | 18.000 | 18.000 | Ước tính | Không dùng module IRF520 nếu không kích mở hết ở 3.3V |
| 12 | **Adapter 5V 2A** | Nguồn DC ổn áp 5V – 2A (10W), chân tròn 5.5×2.1mm | 1 | 55.000 | 55.000 | Ước tính | Nguồn chính cấp cho hệ thống |
| 13 | **Buzzer chủ động (Active)** | 3.3V–5V (Module còi chip có transistor kích sẵn) | 1 | 12.000 | 12.000 | Ước tính | Nên chọn module Active Buzzer 3 chân có sẵn transistor |
| 14 | **Nút nhấn (Tactile Button)** | 4 chân hoặc 2 chân cắm breadboard 6×6×5mm | 2 | 1.500 | 3.000 | Ước tính | Dùng `INPUT_PULLUP` nội của ESP32 |
| 15 | **Cáp USB truyền dữ liệu** | Micro-USB hoặc Type-C (có dây data, không phải cáp chỉ sạc) | 1 | 25.000 | 25.000 | Ước tính | Dùng nạp code & debug Serial |
| 16 | **Jack chuyển nguồn DC** | Jack DC cái 5.5×2.1mm ra domino vặn vít | 1 | 6.000 | 6.000 | Ước tính | Đưa nguồn 5V từ Adapter lên Breadboard |
| 17 | **Diode Flyback 1N4007** | Diode chỉnh lưu chống xung ngược cuộn dây quạt | 1 (vỉ 5) | 3.000 | 3.000 | Ước tính | Mắc ngược song song hai cực quạt DC 5V |
| 18 | **Cảm biến chuyển động PIR** | HC-SR501 (nguồn 5V, ngõ ra `OUT` mức logic `3.3V`) | 1 | 28.000 | 28.000 | Ước tính | Ngõ ra `OUT` của HC-SR501 là 3.3V, an toàn cho ESP32 |
| 19 | **Cảm biến khói/khí MQ-2** | Module 4 chân (`VCC`, `GND`, `DO`, `AO`) | 1 | 35.000 | 35.000 | Ước tính | Cần làm nóng 20–30s; ngõ `AO` phải qua cầu phân áp |
| 20 | **Động cơ Servo SG90 180°** | Bánh răng nhựa, góc quay 0–180°, áp 4.8–6V | 1 | 32.000 | 32.000 | Ước tính | Dùng nguồn 5V ngoài, nối chung GND với ESP32 |
| 21 | **Bản lề mini & thanh nối** | Bản lề cửa mô hình + kẹp thép/thanh đẩy nối tay servo | 1 bộ | 15.000 | 15.000 | Ước tính | Lắp cơ cấu đóng/mở cửa phòng khách |
| 22 | **Tụ hóa lọc nguồn Servo** | `470µF` hoặc `1000µF`, điện áp định mức `16V` hoặc `25V` | 1 | 4.000 | 4.000 | Ước tính | Cắm sát chân nguồn `5V` và `GND` của Servo chống sụt áp |
| 23 | **Mô hình nhà Foam / Mica** | Tấm Foam (Fomex) 5mm + keo nến / băng keo 2 mặt | 1 bộ | 120.000 | 120.000 | Ước tính | Chia 3 khu vực: Phòng khách, Phòng ngủ, Phòng bếp |
| 24 | **Power Bank 5V (Tùy chọn)** | Pin sạc dự phòng 10.000mAh đầu ra 5V-2A có mạch bảo vệ | 1 | *0 – 220.000* | *0 (Tận dụng)* | Tùy chọn | Tận dụng sạc dự phòng sẵn có của 1 trong 5 thành viên |

---

## 2. Tổng Hợp Chi Phí & Phân Tích Ngân Sách

| Phương án | Tổng chi phí ước tính | So với trần 1.000.000 VNĐ | Đánh giá |
| :--- | ---: | ---: | :--- |
| **Phương án A (Khuyến nghị)**: Mua toàn bộ linh kiện (Mục 1 → 23) + tận dụng Power Bank có sẵn của thành viên nhóm | **620.500 VNĐ** | **Dư 379.500 VNĐ** (Dự phòng hỏng linh kiện & phí ship) | **Rất an toàn**, tiết kiệm, đầy đủ tính năng và linh kiện bảo vệ |
| **Phương án B**: Mua mới hoàn toàn cả Power Bank 10.000mAh chính hãng (Mục 1 → 24) | **840.500 VNĐ** | **Dư 159.500 VNĐ** | Vẫn nằm trong ngân sách 1.000.000 VNĐ |

---

## 3. Phát Hiện Xung Đột Kỹ Thuật & Giải Pháp Tối Thiểu Khả Thi (MVP Resolution)

Qua đối chiếu giữa danh sách BOM và đặc tính kỹ thuật của ESP32, có **3 điểm quan trọng** cần xử lý:

1. **Xung đột số lượng điện trở `10kΩ` cho cầu phân áp MQ-2**:
   - Trong BOM gốc ghi `Điện trở 10kΩ ×2`.
   - Nếu dùng 2 điện trở `10kΩ` mắc thành cầu phân áp `1:1` (`R1 = 10kΩ`, `R2 = 10kΩ`), điện áp tối đa `5V` từ chân `AO` của MQ-2 sẽ giảm xuống tối đa `2.5V`. Mức `2.5V` này hoàn toàn nằm trong dải đo tốt nhất của bộ ADC1 ESP32 (`0V – 2.45V/3.1V` ở `ADC_11db`) và tuyệt đối an toàn cho chân GPIO (`< 3.3V`)!
   - **Giải pháp**: Dùng đúng 2 điện trở `10kΩ` tạo cầu phân áp `1:1` cho chân `AO` của MQ-2 (hoặc mua 1 vỉ 10 con `10kΩ` chỉ tốn `3.000 VNĐ` để có thể ghép `10kΩ / 20kΩ` tạo tỷ lệ `2/3`).
2. **Xung đột loại Module MOSFET điều khiển quạt ở mức logic `3.3V`**:
   - Nhiều cửa hàng bán module `IRF520` giá rẻ nhưng `IRF520` có điện áp ngưỡng kích cực cổng $V_{GS(th)}$ từ `2V–4V`, nên khi cấp `3.3V` từ GPIO ESP32 thì MOSFET mở rất yếu hoặc không quay nổi quạt.
   - **Giải pháp**: Khi mua mục số 11, bắt buộc chọn **Module MOSFET Logic-Level (`LR7843`, `AOD4184` hoặc `D4184`)** có opto/driver hoặc mở bão hòa hoàn toàn ở `3.3V`.
3. **Buzzer 3.3V trực tiếp từ GPIO ESP32**:
   - Chân GPIO ESP32 chỉ nên cấp dòng liên tục tối đa `12–20mA`.
   - **Giải pháp**: Ở mục số 13, chọn **Module Active Buzzer 3 chân (`VCC`, `GND`, `I/O`)** đã tích hợp sẵn transistor kích trên mạch (giá `12.000 VNĐ`), giúp chân GPIO chỉ tốn `< 2mA` dòng điều khiển.
