#pragma once

// ============================================================================
// CAU HINH CHAN GPIO & NGUONG - theo docs/WIRING.md (ESP32 DevKit V1 30 chan)
// ============================================================================

// ---- Chan GPIO ----
#define PIN_LED1        25   // light1 (Den Phong khach - 1 bong LED)
#define PIN_LED2        26   // light2 (Den Phong ngu 1 - 2 bong LED mac song song, moi bong 1 tro 220 ohm)
#define PIN_LED3        23   // light3 (Den Phong ngu 2 - 1 bong LED)
#define PIN_FAN         27   // MOSFET quat 5V
#define PIN_SERVO       13   // Servo SG90 (cua chinh), nguon 5V ngoai
#define PIN_BUZZER      14   // Active buzzer
#define PIN_DHT         4    // DHT22 DATA
#define PIN_PIR         35   // PIR HC-SR501 OUT (input-only)
#define PIN_MQ2         34   // MQ-2 AO qua cau phan ap (ADC1_CH6)
#define PIN_BTN_BEDROOM 18   // Nut vat ly Phong ngu: bat/tat ca 3 den (light2 + light3)
#define PIN_BTN_DOOR    18   // Alias tuong thich nguoc chan D18
#define PIN_BTN_LIGHT   19   // Nut vat ly Phong khach: bat/tat light1 / tat coi / giu 1.8s doi Mode
#define PIN_DOOR_SENSOR 32   // Cam bien tu cua MC-38 (INPUT_PULLUP, GND = DONG)
#define PIN_FLAME       33   // Cam bien lua Flame Sensor DO (INPUT_PULLUP, LOW = CO LUA)
#define PIN_OLED_SDA    21   // OLED 0.96" I2C SDA
#define PIN_OLED_SCL    22   // OLED 0.96" I2C SCK/SCL

// ---- Servo ----
#define DOOR_ANGLE_OPEN    90
#define DOOR_ANGLE_CLOSED  0

// ---- Chu ky (ms) ----
#define DHT_INTERVAL_MS         5000
#define MQ2_INTERVAL_MS         1000
#define STATUS_INTERVAL_MS      3000
#define WIFI_RETRY_MS           4000
#define MQTT_RETRY_MS           1500
#define BUTTON_DEBOUNCE_MS      50
#define MQ2_PREHEAT_MS          25000
#define ALERT_COOLDOWN_MS       30000

// ---- Nguong ----
#define TEMP_THRESHOLD_HIGH     31.0f   // AUTO: bat quat
#define TEMP_THRESHOLD_LOW      29.5f   // AUTO: tat quat
#define SMOKE_THRESHOLD_ADC     2200    // vuot nguong => canh bao
#define SMOKE_CLEAR_MARGIN      150     // hysteresis khi het khoi
#define TEMP_REPORT_DELTA       0.5f
#define HUM_REPORT_DELTA        2.0f

// ---- Chong lap lenh ----
#define REQUEST_ID_RING_SIZE    16
#define COMMAND_MAX_AGE_MS     8000ULL
#define COMMAND_CLOCK_SKEW_MS  2000ULL

#define FIRMWARE_VERSION        "1.0.0"
#define NTP_SERVER              "pool.ntp.org"
