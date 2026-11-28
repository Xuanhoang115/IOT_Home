# SƠ ĐỒ ĐẤU NỐI CHÂN GPIO (PINOUT) – ESP32 DEVKIT V1 CP2102 (30 CHÂN)

> **Bản vẽ sơ đồ nguyên lý sắc nét (Vector SVG / xuất PNG & PDF nộp Lab 1):**
> - File SVG gốc: [docs/schematics/esp32_smarthome_schematic.svg](schematics/esp32_smarthome_schematic.svg)
> - Trang xuất PNG (3200×2120) / PDF A4 ngang: mở [docs/schematics/index.html](schematics/index.html) bằng trình duyệt.
> - Mô phỏng Wokwi tương tác: [firmware/wokwi/diagram.json](../firmware/wokwi/diagram.json)

## 1. Nguyên Tắc Chọn Chân GPIO Trên ESP32 30 Chân

Trước khi đấu dây, nhóm bắt buộc tuân thủ các quy tắc phần cứng của dòng chip **ESP32-WROOM-32 (DevKit V1 30 chân)**:
1. **Không dùng các chân Flash SPI nội (`GPIO 6, 7, 8, 9, 10, 11`)**: Tuyệt đối không kết nối.
2. **Lưu ý các chân Strapping (`GPIO 0, 2, 5, 12, 15`)**: Nếu kéo `GPIO 12` lên mức `HIGH` lúc cấp nguồn, ESP32 sẽ lỗi điện áp flash và không boot được. Do đó **không dùng GPIO 12** cho cảm biến có trở kéo lên.
3. **Các chân chỉ đọc (`Input-Only`: `GPIO 34, 35, 36, 39`)**: Không có điện trở `PULLUP`/`PULLDOWN` nội và không xuất được tín hiệu ra, nhưng rất lý tưởng để đọc cảm biến `ADC1` (`MQ-2`) hoặc `PIR`.
4. **Xung đột `ADC2` và Wi-Fi**: Khi bật Wi-Fi, toàn bộ các chân thuộc bộ `ADC2` (`GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27`) **không thể dùng `analogRead()`**. Do đó cảm biến analog `MQ-2` bắt buộc phải nối vào **ADC1 (`GPIO 34`)**.

---

## 2. Bảng Phân Bổ Chân GPIO Chính Thức

| Thiết bị / Cảm biến | Phòng (Mô hình) | Chân Linh kiện | Chân ESP32 (30-pin) | Nguồn cấp | Ghi chú bắt buộc |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **LED 1 (`light1`)** | Phòng khách | Anode (`+`) qua trở `220Ω` | **`GPIO 25`** | GPIO 3.3V | Cathode (`-`) nối `GND` |
| **LED 2 (`light2`)** | Phòng ngủ | Anode (`+`) qua trở `220Ω` | **`GPIO 26`** | GPIO 3.3V | Cathode (`-`) nối `GND` |
| **Quạt DC 5V (`fan1`)** | Phòng khách / Bếp | Chân `SIG/PWM` của Module MOSFET | **`GPIO 27`** | **5V Ngoài** | Quạt lấy nguồn 5V qua MOSFET, có diode `1N4007` chống xung ngược |
| **Cửa Servo SG90 (`door1`)** | Cửa chính (P.Khách) | Dây tín hiệu (Cam/Vàng) | **`GPIO 13`** | **5V Ngoài** | Dây Đỏ nối `5V Ngoài` (có tụ `470–1000µF`), Dây Nâu nối `GND chung` |
| **Buzzer chủ động** | Trung tâm nhà | Chân `I/O` (Module 3 chân) | **`GPIO 14`** | `3.3V` / `5V` | Dùng module Active Buzzer có transistor kích sẵn |
| **Cảm biến DHT22** | Phòng khách | Chân `DATA` (Chân 2) | **`GPIO 4`** | **`3.3V`** | Nếu dùng DHT22 4 chân rời thì mắc trở kéo lên `10kΩ` lên `3.3V` |
| **Cảm biến PIR HC-SR501** | Phòng khách | Chân `OUT` (Giữa) | **`GPIO 35`** | `5V Ngoài` | Ngõ ra `OUT` của HC-SR501 tự động ở mức `3.3V`, vào chân Input-Only `GPIO 35` |
| **Cảm biến khói MQ-2** | Phòng bếp | Chân `AO` *(qua cầu phân áp)* | **`GPIO 34` (ADC1_CH6)** | `5V Ngoài` | **Bắt buộc qua cầu phân áp 2 điện trở `10kΩ`** trước khi vào `GPIO 34` |
| **Nút nhấn 1 (`BTN_DOOR`)** | Cửa chính | 1 chân vào GPIO, 1 chân xuống `GND` | **`GPIO 18`** | `INPUT_PULLUP` | Nhấn tay để đóng/mở cửa tại mô hình (chống rung phần mềm `50ms`) |
| **Nút nhấn 2 (`BTN_LIGHT`)** | Phòng khách | 1 chân vào GPIO, 1 chân xuống `GND` | **`GPIO 19`** | `INPUT_PULLUP` | Nhấn tay bật/tắt đèn hoặc tắt còi báo động khẩn cấp |
| **Màn hình OLED 0.96" I2C** | Trung tâm nhà | `SDA` & `SCK` (`GM009605v4.3`) | **`GPIO 21` (SDA), `GPIO 22` (SCK)** | **`3.3V`** | Giao tiếp I2C `100kHz`, bộ đệm `oledLineCache` 4 dòng không gây trễ MQTT |
| **Cảm biến từ cửa `MC-38`** | Cửa chính | 1 dây vào GPIO, 1 dây xuống `GND` | **`GPIO 32`** | `INPUT_PULLUP` | Công tắc từ Reed Switch xác thực cửa đã khép kín (`positionVerified`) |
| **Cảm biến lửa `Flame Sensor`** | Phòng bếp | Chân `DO` (Module đỏ `FE-01`) | **`GPIO 33`** | `3.3V` / `5V` | Tự động ghi nhận mức nghỉ `flameIdleLevel`, kích còi Buzzer ngay khi phát hiện lửa |

---

## 3. Sơ Đồ Mạch Chuyển Mức Điện Áp Cho MQ-2 (5V → Max 2.5V)

Cảm biến `MQ-2` hoạt động với nguồn đốt nóng `VCC = 5V`. Khi nồng độ khói cao, điện áp chân `AO` có thể lên gần `5V`. Chân GPIO của ESP32 chỉ chịu được tối đa `3.3V` (quá áp sẽ làm hỏng chân ADC hoặc cháy chip).

Sử dụng **2 điện trở `10kΩ`** có sẵn trong danh mục BOM:

```text
[MQ-2 Chân AO (0V - 5V)]
          │
          ├─── [ Điện trở R1 = 10kΩ ] ───┬───> Nối vào chân GPIO 34 (ADC1_CH6 của ESP32)
                                         │
                               [ Điện trở R2 = 10kΩ ]
                                         │
                                        GND (Chung với ESP32)
```

- **Công thức điện áp vào `GPIO 34`**:
  $$V_{\text{GPIO34}} = V_{\text{AO}} \times \frac{R_2}{R_1 + R_2} = V_{\text{AO}} \times \frac{10\text{k}\Omega}{10\text{k}\Omega + 10\text{k}\Omega} = 0.5 \times V_{\text{AO}}$$
- Khi $V_{\text{AO}} = 5.0\text{V}$ (mức cực đại), $V_{\text{GPIO34}} = 2.5\text{V} < 3.3\text{V}$ — **an toàn tuyệt đối** và khớp hoàn hảo với dải tuyến tính của bộ ADC1 trên ESP32 (`0V – 2.45V` ở mức suy hao `ADC_11db`).

---

## 4. Sơ Đồ Đấu Nối Quạt DC 5V Qua Module MOSFET & Servo SG90

```text
[Adapter 5V - 2A]
   ├── (+) 5V_EXT ──┬──> Chân VIN của ESP32 (hoặc cấp ESP32 qua USB / Power Bank)
   │                ├──> Chân VCC (Đỏ) của Servo SG90  [+ Tụ lọc 470µF–1000µF nối sát VCC-GND]
   │                ├──> Chân VIN+ của Module MOSFET ──> Cực (+) Quạt 5V (Mắc song song Diode 1N4007 ngược chiều)
   │                ├──> Chân VCC của MQ-2 (5V)
   │                └──> Chân VCC của PIR HC-SR501 (5V)
   │
   └── (-) GND_COMMON ──> Nối chung GND của ESP32 + GND Servo + GND MOSFET + GND Cảm biến
```
> **Cảnh báo bắt buộc**: Nếu không nối chung `GND` giữa nguồn `5V Ngoài` và chân `GND` của ESP32, xung PWM điều khiển Servo SG90 và tín hiệu kích MOSFET sẽ bị trôi áp (floating), khiến Servo quay loạn và MOSFET không hoạt động.

---

## 5. Phương Án Thi Công Nối Thẳng Trực Tiếp (Không Dùng Breadboard — Star-Bus)

Trên mô hình nhà thật, nhóm đấu dây trực tiếp **Point-to-Point** kết hợp **3 nút gom nguồn/mass chung (Domino / kẹp nối / mối hàn bọc gen co nhiệt)** thay cho breadboard để giảm tiếp xúc lỏng và gọn gàng hơn:

1. **Nút gom `GND Chung` (Star Ground — 1 điểm duy nhất):** Gom toàn bộ dây âm (`GND`) của Adapter `5V-2A`, ESP32 (`GND`), OLED, DHT22, PIR, MQ-2, nhánh `R2 (10kΩ)` của cầu phân áp, Flame, MC-38, 2 LED, MOSFET Quạt, Buzzer, Servo SG90 và 2 nút nhấn vào cùng 1 điểm rồi đấu chắc về chân `GND` của ESP32.
2. **Nút gom `5V Ngoài` (`5V_EXT`):** Lấy từ cực `(+)` Adapter `5V-2A` chia trực tiếp tới Servo SG90 (kẹp sát tụ `470–1000µF`), MOSFET `VIN+`, MQ-2 `VCC` và PIR `VCC`.
3. **Nút gom `3.3V`:** Lấy từ chân `3V3` của ESP32 chia trực tiếp tới OLED `VCC`, DHT22 `VCC`, Flame `VCC` và Active Buzzer `VCC`.
4. **Dây tín hiệu đấu thẳng 1–1 đúng chân GPIO** (`D25 → LED1`, `D26 → LED2`, `D27 → MOSFET`, `D13 → Servo`, `D14 → Buzzer`, `D4 → DHT22`, `D35 → PIR`, `D32 → MC-38`, `D33 → Flame`, `D18/D19 → Nút nhấn`, `D21/D22 → OLED`) **với 3 lưu ý bảo vệ bắt buộc đấu trực tiếp trên dây (in-line, bọc gen co nhiệt cách điện):**
   - **Cầu phân áp MQ-2 (`D34`):** Không nối thẳng `AO (5V)` vào `D34`; đấu chữ **T** trực tiếp trên dây: `AO → [10kΩ] → mối giữa vào D34`, từ mối giữa đó mắc `[10kΩ] → nút GND Chung`.
   - **LED rời (`D25`, `D26`):** Nối nối tiếp điện trở `220Ω` trên dây trước chân Anode (`+`) mỗi LED (nếu dùng module LED có sẵn trở thì nối thẳng).
   - **Quạt DC 5V (`D27`):** Hàn/kẹp Diode `1N4007` ngược chiều (vạch bạc về cực `+5V`) trực tiếp song song 2 cực quạt.
