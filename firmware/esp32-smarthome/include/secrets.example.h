#pragma once

// ============================================================================
// SMART HOME IoT 2026 - ESP32 FIRMWARE SECRETS TEMPLATE
// Hướng dẫn: Copy file này thành "secrets.h" cùng thư mục và điền thông tin thật.
// File "secrets.h" đã được đưa vào .gitignore để không lộ mật khẩu lên Git.
// ============================================================================

#define WIFI_SSID           "YOUR_WIFI_2.4GHZ_SSID"
#define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"

#define MQTT_BROKER_HOST    "your-cluster-id.s1.eu.hivemq.cloud"
#define MQTT_BROKER_PORT    8883
#define MQTT_USERNAME       "smarthome_esp32"
#define MQTT_PASSWORD       "your_strong_mqtt_password"

#define HOME_ID             "home1"
#define DEVICE_NODE_ID      "esp32_main"
