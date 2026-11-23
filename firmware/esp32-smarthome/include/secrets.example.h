#pragma once

// ============================================================================
// SMART HOME IoT 2026 - ESP32 FIRMWARE SECRETS TEMPLATE
// Huong dan: Copy file nay thanh "secrets.h" cung thu muc va dien thong tin that.
// File "secrets.h" da duoc dua vao .gitignore de khong lo mat khau len Git.
// ============================================================================

#define WIFI_SSID           "YOUR_WIFI_2.4GHZ_SSID"
#define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"

#define MQTT_BROKER_HOST    "your-cluster-id.s1.eu.hivemq.cloud"
#define MQTT_BROKER_PORT    8883
#define MQTT_USERNAME       "smarthome_esp32"
#define MQTT_PASSWORD       "your_strong_mqtt_password"

#define HOME_ID             "home1"
#define DEVICE_NODE_ID      "esp32_main"

// Chung chi goc (Root CA) de xac thuc TLS voi HiveMQ Cloud.
// Tai "ISRG Root X1" (PEM) tai https://letsencrypt.org/certs/isrgrootx1.pem
// roi dan NGUYEN VAN noi dung vao giua 2 dong R"EOF( va )EOF" ben duoi.
// Firmware se TU CHOI ket noi neu chua dan chung chi (khong tat xac thuc TLS).
static const char MQTT_ROOT_CA[] = R"EOF(
-----BEGIN CERTIFICATE-----
DAN_NOI_DUNG_ISRG_ROOT_X1_VAO_DAY
-----END CERTIFICATE-----
)EOF";
