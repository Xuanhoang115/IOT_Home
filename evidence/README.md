# MINH CHỨNG KIỂM THỬ & BẢO VỆ ĐỒ ÁN (EVIDENCE — MỤC B.4, A.6, C.5)

Thư mục này tổng hợp toàn bộ **ảnh chụp minh chứng (`.png`/`.jpg`)** và **file log kiểm thử tự động (`.log`/`.txt`)** cho hệ thống **SMART HOME IoT 2026**.

---

## Cấu trúc thư mục `evidence/`

```text
evidence/
├── README.md                          # Bảng kiểm tổng hợp minh chứng (file này)
├── 01_broker_mqttx/                   # Minh chứng MQTT Broker (EMQX Cloud + MQTTX)
│   └── MQTTX_TEST_CASES.md            # Kịch bản + JSON mẫu kiểm thử QoS1 / Retain / LWT / ACL
├── 02_backend_tests/                  # Log tự động xuất từ scripts/collect-evidence-logs.ps1
│   ├── 01_backend_typecheck.log
│   ├── 02_backend_vitest.log
│   ├── 03_backend_mqtt_tls.log
│   ├── 04_mobile_typecheck.log
│   ├── 05_render_health_live.log
│   └── 06_git_secret_audit.log
├── 03_esp32_serial/                   # Log Serial Monitor ESP32 / Wokwi + ảnh chụp OLED
├── 04_mobile_app/                     # Ảnh chụp toàn bộ màn hình Mobile / Web App
└── 05_hardware_lab1/                  # Sơ đồ nguyên lý (PNG/PDF) + ảnh mô hình thật Lab 1
```

---

## Bảng Kiểm Minh Chứng Chi Tiết

### 1. Kiểm thử MQTT Broker & MQTTX (`evidence/01_broker_mqttx/`)
| STT | Hạng mục minh chứng | Tên file đề xuất | Trạng thái |
| :---: | :--- | :--- | :---: |
| 1 | EMQX Overview (Address + Port `8883` TLS / `8084` WSS) | `01_emqx_overview.png` | [ ] |
| 2 | EMQX Authentication (3–4 tài khoản riêng biệt) | `02_emqx_authentication_users.png` | [ ] |
| 3 | EMQX Authorization / ACL (tab Username: `mobile`, `esp32`, `backend`) | `03_emqx_authorization_acl.png` | [ ] |
| 4 | EMQX Monitor → Clients (kết nối đồng thời ESP32 + Backend + Mobile + MQTTX) | `04_emqx_multi_clients.png` | [ ] |
| 5 | MQTTX kết nối TLS `:8883` & Subscribe `smarthome/home1/#` | `05_mqttx_tls_subscribe.png` | [ ] |
| 6 | MQTTX Publish `/set` (`QoS 1`, `retain=false`) & nhận `/state` (`retain=true`) | `06_mqttx_publish_set_state.png` | [ ] |
| 7 | MQTTX nhận bản tin LWT `"online": false` khi rút nguồn ESP32 | `07_mqttx_lwt_offline.png` | [ ] |
| 8 | Kiểm thử từ chối: Sai mật khẩu (`Bad User Name or Password`) | `08_mqttx_auth_denied.png` | [ ] |
| 9 | Kiểm thử từ chối: Sai quyền topic ACL (`smarthome_mobile` publish trái phép) | `09_mqttx_acl_denied.png` | [ ] |

### 2. Kiểm thử Backend & REST API (`evidence/02_backend_tests/`)
Chạy 1 lệnh duy nhất để xuất toàn bộ 6 file `.log` tự động:
```powershell
.\scripts\collect-evidence-logs.ps1
```
| STT | Hạng mục minh chứng | File xuất ra | Trạng thái |
| :---: | :--- | :--- | :---: |
| 1 | `npm --prefix backend run typecheck` (0 lỗi TS) | `01_backend_typecheck.log` | [ ] |
| 2 | `npm --prefix backend test` (13/13 Vitest pass) | `02_backend_vitest.log` | [ ] |
| 3 | `npm --prefix backend run test:hivemq` (MQTT TLS `:8883` pass) | `03_backend_mqtt_tls.log` | [ ] |
| 4 | `npx tsc --noEmit` cho `mobile/` (0 lỗi TS) | `04_mobile_typecheck.log` | [ ] |
| 5 | Kiểm tra Render Cloud `/api/health` đang Live | `05_render_health_live.log` | [ ] |
| 6 | Kiểm toán Git sạch 0 file nhạy cảm | `06_git_secret_audit.log` | [ ] |
| 7 | Ảnh chụp terminal pass 100% + ảnh Swagger UI `/docs` (kèm Schemas) | `07_terminal_tests_pass.png`, `08_swagger_ui_docs.png` | [ ] |

### 3. Kiểm thử Firmware ESP32 / Wokwi (`evidence/03_esp32_serial/`)
| STT | Hạng mục minh chứng | Tên file đề xuất | Trạng thái |
| :---: | :--- | :--- | :---: |
| 1 | Copy toàn bộ log Serial Monitor (Wi-Fi, NTP, MQTT TLS, `/set`, `isDuplicate: true`, cảm biến, reconnect) | `esp32_serial_monitor.log` | [ ] |
| 2 | Ảnh chụp Serial Monitor: Kết nối Wi-Fi + NTP + MQTT TLS thành công | `01_esp32_boot_wifi_mqtt.png` | [ ] |
| 3 | Ảnh chụp Serial Monitor: Nhận lệnh `/set` + chống lặp `isDuplicate: true` | `02_esp32_command_duplicate.png` | [ ] |
| 4 | Ảnh chụp Serial Monitor: Đọc cảm biến DHT22 / PIR / MQ-2 / Flame & tự reconnect Wi-Fi | `03_esp32_sensors_reconnect.png` | [ ] |
| 5 | Ảnh chụp Wokwi v2.0.0 đang chạy (OLED sáng + MQTT Online) | `04_wokwi_live_simulation.png` | [ ] |

### 4. Kiểm thử Ứng dụng Mobile / Web (`evidence/04_mobile_app/`)
| STT | Màn hình / Kịch bản | Tên file đề xuất | Trạng thái |
| :---: | :--- | :--- | :---: |
| 1 | Màn hình Đăng nhập (Login Firebase Auth) | `01_login.png` | [ ] |
| 2 | Màn hình Tổng quan (Dashboard + thao tác nhanh + thời tiết DHT22) | `02_dashboard.png` | [ ] |
| 3 | Màn hình Thiết bị: trạng thái `PENDING` → `ACKED` | `03_devices_pending_acked.png` | [ ] |
| 4 | Màn hình Chi tiết phòng (Room Detail: Servo góc mở/đóng, chế độ PIN) | `04_room_detail.png` | [ ] |
| 5 | Màn hình Cảm biến realtime (Vòng nhiệt độ DHT22, độ ẩm, MQ-2, PIR) | `05_sensors_realtime.png` | [ ] |
| 6 | Màn hình Cảnh báo (Alerts + Banner cảnh báo khói/lửa + nút Tắt còi + FCM Android) | `06_alerts_smoke_fcm.png` | [ ] |
| 7 | Màn hình Lịch sử (có đủ `REMOTE_COMMAND`, `PHYSICAL_BUTTON`, `AUTO_RULE`) | `07_history_all_sources.png` | [ ] |
| 8 | Màn hình Cài đặt + kịch bản ESP32 Offline & Timeout 8 giây (TC-14) | `08_settings_offline_timeout.png` | [ ] |

### 5. Phần cứng & Sơ đồ mạch Lab 1 (`evidence/05_hardware_lab1/`)
| STT | Hạng mục minh chứng | Tên file đề xuất | Trạng thái |
| :---: | :--- | :--- | :---: |
| 1 | Sơ đồ nguyên lý xuất từ `docs/schematics/index.html` (PNG & PDF) | `ESP32_SmartHome_Schematic_Lab1.png` / `.pdf` | [ ] |
| 2 | Ảnh tổng thể mô hình nhà thật | `01_model_overview.jpg` | [ ] |
| 3 | Ảnh cận cảnh ESP32 + cầu phân áp MQ-2 (`10kΩ / 10kΩ`) | `02_esp32_mq2_divider.jpg` | [ ] |
| 4 | Ảnh cận cảnh nguồn `5V-2A` ngoài + nút gom `GND Chung` + MOSFET Quạt + Tụ Servo | `03_power_5v_star_gnd.jpg` | [ ] |
| 5 | Ảnh cận cảnh cửa Servo SG90 + cảm biến từ `MC-38` | `04_door_servo_mc38.jpg` | [ ] |
| 6 | Ảnh cận cảnh màn hình OLED 0.96" đang sáng hiển thị thông số thực | `05_oled_live.jpg` | [ ] |
