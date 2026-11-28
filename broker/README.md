# Cấu hình MQTT Broker (Lab 2 — Eclipse Mosquitto & EMQX Cloud)

Thư mục này chứa bộ tệp cấu hình MQTT Broker tự dựng (Eclipse Mosquitto 2.0) làm minh chứng cấu hình chuẩn **Authentication + ACL + TLS/WebSocket** song song với bản triển khai Cloud đang chạy trên **EMQX Cloud Serverless** (`:8883` TLS / `:8084` WSS).

## Cấu trúc thư mục
- `mosquitto.conf`: Cấu hình cổng `1883` (MQTT), `8883` (MQTT TLS), `9001` (WebSocket), bật `allow_anonymous false`, trỏ tới `passwd` và `acl.conf`.
- `acl.conf`: Phân quyền Topic theo nguyên tắc đặc quyền tối thiểu cho `smarthome_backend`, `smarthome_esp32`, `smarthome_mobile`, `smarthome_tester`.
- `docker-compose.yml`: Khởi chạy nhanh container `eclipse-mosquitto:2.0`.

## Khởi tạo file mật khẩu & chạy cục bộ (tùy chọn)
```bash
# Tạo file mật khẩu (không commit file passwd lên Git)
docker run --rm -it -v ${PWD}:/work eclipse-mosquitto:2.0 sh -c "
  mosquitto_passwd -b -c /work/passwd smarthome_backend '<mat-khau-backend>' &&
  mosquitto_passwd -b /work/passwd smarthome_esp32 '<mat-khau-esp32>' &&
  mosquitto_passwd -b /work/passwd smarthome_mobile '<mat-khau-mobile>' &&
  mosquitto_passwd -b /work/passwd smarthome_tester '<mat-khau-tester>'
"

# Khởi chạy Broker
docker compose up -d
```

## Ghi chú bảo mật
- File `broker/passwd` và `broker/certs/` chứa thông tin nhạy cảm, tuyệt đối không đẩy lên GitHub.
