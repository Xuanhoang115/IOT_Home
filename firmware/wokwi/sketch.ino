// ============================================================================
// SMART HOME IoT 2026 - ESP32 FIRMWARE CHO WOKWI WEB SIMULATOR (v2.0.0)
// Dong bo 100% tinh nang voi mach that ESP32 DevKit V1 (30 chan):
// - WiFi Wokwi-GUEST + EMQX Cloud MQTT TLS :8883, LWT, chong lap QoS 1
// - 2 Den LED (D25, D26), Quat (D27), Coi Buzzer (D14), Servo SG90 (D13)
// - Cam bien DHT22 (D4), PIR (D35), MQ-2 bien tro (D34), Flame (D33), MC-38 (D32)
// - Man hinh OLED 0.96" SSD1306 I2C (SDA=D21, SCL=D22) - khong can cai thu vien ngoai
// - 2 Nut nhan vat ly: D18 (Cua), D19 (Bam nhanh: Den/Tat coi | Giu 1.8s: MANUAL<->AUTO)
// - Ho tro nut "Tat coi" tu xa (buzzer/set), cau hinh AUTO dong + Flash NVS
// ============================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <Preferences.h>
#include <sys/time.h>

// ---------------------------------------------------------------------------
// 1. CAU HINH WIFI & MQTT BROKER (Wokwi Web / VS Code Wokwi)
// Copy secrets.example.h -> secrets.h (khong commit len Git) hoac dien truc tiep tren Wokwi Web
// ---------------------------------------------------------------------------
#if __has_include("secrets.h")
  #include "secrets.h"
#else
  #define WIFI_SSID           "Wokwi-GUEST"
  #define WIFI_PASSWORD       ""
  #define MQTT_BROKER_HOST    "<your-broker-host>"
  #define MQTT_BROKER_PORT    8883
  #define MQTT_USERNAME       "smarthome_esp32"
  #define MQTT_PASSWORD       "<your-password>"
#endif

#define HOME_ID             "home1"
#define DEVICE_NODE_ID      "esp32_main"
#define FIRMWARE_VERSION    "2.0.0-wokwi"

// ---------------------------------------------------------------------------
// 2. CAU HINH 14 CHAN GPIO (KHOP 100% VOI config.h CUA MACH THAT)
// ---------------------------------------------------------------------------
#define PIN_LED1        25   // light1 (Den Phong khach)
#define PIN_LED2        26   // light2 (Den Phong ngu)
#define PIN_FAN         27   // fan1 (Quat thong gio - LED xanh mo phong)
#define PIN_SERVO       13   // door1 (Servo SG90 Cua chinh)
#define PIN_BUZZER      14   // Active/Piezo Buzzer (doc lap voi light2)
#define PIN_DHT         4    // DHT22 (Nhiet do, Do am)
#define PIN_PIR         35   // PIR HC-SR501 (Chuyen dong)
#define PIN_MQ2         34   // Bien tro ADC (0..4095) mo phong khoi MQ-2
#define PIN_FLAME       33   // Cong tac mo phong Flame Sensor (LOW = CO LUA)
#define PIN_DOOR_SENSOR 32   // Cong tac mo phong MC-38 cua (LOW = DONG KHIT)
#define PIN_OLED_SDA    21   // OLED 0.96" I2C SDA
#define PIN_OLED_SCL    22   // OLED 0.96" I2C SCL
#define PIN_BTN_DOOR    18   // Nut nhan Cua (INPUT_PULLUP)
#define PIN_BTN_LIGHT   19   // Nut nhan Den / Tat coi / Giu 1.8s doi Mode (INPUT_PULLUP)

#define DOOR_ANGLE_OPEN    90
#define DOOR_ANGLE_CLOSED  0

// Chu ky hoat dong (ms)
#define DHT_INTERVAL_MS         5000
#define MQ2_INTERVAL_MS         1000
#define STATUS_INTERVAL_MS      3000
#define WIFI_RETRY_MS           4000
#define MQTT_RETRY_MS           2000
#define BUTTON_DEBOUNCE_MS      50
#define ALERT_COOLDOWN_MS       30000

// Nguong mac dinh cho che do AUTO
#define TEMP_THRESHOLD_HIGH     31.0f
#define TEMP_THRESHOLD_LOW      29.5f
#define SMOKE_THRESHOLD_ADC     2200
#define SMOKE_CLEAR_MARGIN      150

#define REQUEST_ID_RING_SIZE    16
#define OLED_I2C_ADDR           0x3C

// ---------------------------------------------------------------------------
// 3. DRIVER OLED SSD1306 128x64 I2C NHE (TICH HOP SAN - KHONG CAN THU VIEN)
// ---------------------------------------------------------------------------
static bool oledReady = false;
static bool oledWireStarted = false;
static char oledLineCache[8][24] = {{0}};

static const uint8_t PROGMEM OLED_FONT_5X7[][5] = {
  {0x00,0x00,0x00,0x00,0x00}, // ' '
  {0x00,0x00,0x5F,0x00,0x00}, // '!'
  {0x00,0x07,0x00,0x07,0x00}, // '"'
  {0x14,0x7F,0x14,0x7F,0x14}, // '#'
  {0x24,0x2A,0x7F,0x2A,0x12}, // '$'
  {0x23,0x13,0x08,0x64,0x62}, // '%'
  {0x36,0x49,0x55,0x22,0x50}, // '&'
  {0x00,0x05,0x03,0x00,0x00}, // '\''
  {0x00,0x1C,0x22,0x41,0x00}, // '('
  {0x00,0x41,0x22,0x1C,0x00}, // ')'
  {0x14,0x08,0x3E,0x08,0x14}, // '*'
  {0x08,0x08,0x3E,0x08,0x08}, // '+'
  {0x00,0x50,0x30,0x00,0x00}, // ','
  {0x08,0x08,0x08,0x08,0x08}, // '-'
  {0x00,0x60,0x60,0x00,0x00}, // '.'
  {0x20,0x10,0x08,0x04,0x02}, // '/'
  {0x3E,0x51,0x49,0x45,0x3E}, // '0'
  {0x00,0x42,0x7F,0x40,0x00}, // '1'
  {0x42,0x61,0x51,0x49,0x46}, // '2'
  {0x21,0x41,0x45,0x4B,0x31}, // '3'
  {0x18,0x14,0x12,0x7F,0x10}, // '4'
  {0x27,0x45,0x45,0x45,0x39}, // '5'
  {0x3C,0x4A,0x49,0x49,0x30}, // '6'
  {0x01,0x71,0x09,0x05,0x03}, // '7'
  {0x36,0x49,0x49,0x49,0x36}, // '8'
  {0x06,0x49,0x49,0x29,0x1E}, // '9'
  {0x00,0x36,0x36,0x00,0x00}, // ':'
  {0x00,0x56,0x36,0x00,0x00}, // ';'
  {0x08,0x14,0x22,0x41,0x00}, // '<'
  {0x14,0x14,0x14,0x14,0x14}, // '='
  {0x00,0x41,0x22,0x14,0x08}, // '>'
  {0x02,0x01,0x51,0x09,0x06}, // '?'
  {0x32,0x49,0x79,0x41,0x3E}, // '@'
  {0x7E,0x11,0x11,0x11,0x7E}, // 'A'
  {0x7F,0x49,0x49,0x49,0x36}, // 'B'
  {0x3E,0x41,0x41,0x41,0x22}, // 'C'
  {0x7F,0x41,0x41,0x22,0x1C}, // 'D'
  {0x7F,0x49,0x49,0x49,0x41}, // 'E'
  {0x7F,0x09,0x09,0x09,0x01}, // 'F'
  {0x3E,0x41,0x49,0x49,0x7A}, // 'G'
  {0x7F,0x08,0x08,0x08,0x7F}, // 'H'
  {0x00,0x41,0x7F,0x41,0x00}, // 'I'
  {0x20,0x40,0x41,0x3F,0x01}, // 'J'
  {0x7F,0x08,0x14,0x22,0x41}, // 'K'
  {0x7F,0x40,0x40,0x40,0x40}, // 'L'
  {0x7F,0x02,0x0C,0x02,0x7F}, // 'M'
  {0x7F,0x04,0x08,0x10,0x7F}, // 'N'
  {0x3E,0x41,0x41,0x41,0x3E}, // 'O'
  {0x7F,0x09,0x09,0x09,0x06}, // 'P'
  {0x3E,0x41,0x51,0x21,0x5E}, // 'Q'
  {0x7F,0x09,0x19,0x29,0x46}, // 'R'
  {0x46,0x49,0x49,0x49,0x31}, // 'S'
  {0x01,0x01,0x7F,0x01,0x01}, // 'T'
  {0x3F,0x40,0x40,0x40,0x3F}, // 'U'
  {0x1F,0x20,0x40,0x20,0x1F}, // 'V'
  {0x3F,0x40,0x38,0x40,0x3F}, // 'W'
  {0x63,0x14,0x08,0x14,0x63}, // 'X'
  {0x07,0x08,0x70,0x08,0x07}, // 'Y'
  {0x61,0x51,0x49,0x45,0x43}  // 'Z'
};

void oledCmd(uint8_t cmd) {
  Wire.beginTransmission(OLED_I2C_ADDR);
  Wire.write(0x00);
  Wire.write(cmd);
  Wire.endTransmission();
}

void oledPrintLine(uint8_t page, const char* str) {
  if (!oledReady || page > 7) return;
  if (strncmp(oledLineCache[page], str, 23) == 0) return;
  strncpy(oledLineCache[page], str, 23);
  oledLineCache[page][23] = '\0';

  oledCmd(0xB0 + page);
  oledCmd(0x00);
  oledCmd(0x10);

  uint8_t col = 0;
  for (size_t i = 0; str[i] != '\0' && col + 6 <= 128; i++) {
    char c = str[i];
    if (c >= 'a' && c <= 'z') c -= 32;
    if (c < 32 || c > 90) c = ' ';
    uint8_t idx = (uint8_t)(c - 32);

    Wire.beginTransmission(OLED_I2C_ADDR);
    Wire.write(0x40);
    for (uint8_t b = 0; b < 5; b++) {
      Wire.write(pgm_read_byte(&OLED_FONT_5X7[idx][b]));
    }
    Wire.write(0x00);
    Wire.endTransmission();
    col += 6;
  }

  while (col < 128) {
    Wire.beginTransmission(OLED_I2C_ADDR);
    Wire.write(0x40);
    uint8_t chunk = (128 - col > 24) ? 24 : (128 - col);
    for (uint8_t k = 0; k < chunk; k++) Wire.write(0x00);
    Wire.endTransmission();
    col += chunk;
  }
}

void oledClear() {
  if (!oledReady) return;
  for (uint8_t page = 0; page < 8; page++) {
    oledLineCache[page][0] = '\x01';
    oledPrintLine(page, "");
  }
}

bool oledInit(int sdaPin, int sclPin) {
  if (!oledWireStarted) {
    Wire.begin(sdaPin, sclPin);
    Wire.setClock(100000);
    oledWireStarted = true;
  }
  Wire.beginTransmission(OLED_I2C_ADDR);
  if (Wire.endTransmission() != 0) {
    oledReady = false;
    return false;
  }
  const uint8_t initCmds[] = {
    0xAE, 0xD5, 0x80, 0xA8, 0x3F, 0xD3, 0x00, 0x40,
    0x8D, 0x14, 0x20, 0x02, 0xA1, 0xC8, 0xDA, 0x12,
    0x81, 0xCF, 0xD9, 0xF1, 0xDB, 0x40, 0xA4, 0xA6, 0xAF
  };
  for (size_t i = 0; i < sizeof(initCmds); i++) {
    oledCmd(initCmds[i]);
  }
  oledReady = true;
  oledClear();
  oledPrintLine(0, "SMART HOME IoT 2026");
  oledPrintLine(3, "WOKWI SIMULATOR...");
  return true;
}

// ---------------------------------------------------------------------------
// 4. DOI TUONG TOAN CUC & TRANG THAI HE THONG
// ---------------------------------------------------------------------------
WiFiClientSecure secureClient;
PubSubClient mqtt(secureClient);
DHT dht(PIN_DHT, DHT22);
Servo doorServo;
Preferences prefs;

static char topicPrefix[48];

// Trang thai thiet bi & Cau hinh AUTO luu trong Flash NVS
bool light1On = false;
bool light2On = false;
bool fanOn = false;
bool fanAuto = false;
bool motionAutoLight = true;
float cfgTempHigh = TEMP_THRESHOLD_HIGH;
float cfgTempLow = TEMP_THRESHOLD_LOW;
int cfgSmokeAdc = SMOKE_THRESHOLD_ADC;
bool doorOpen = false;
int doorAngle = DOOR_ANGLE_CLOSED;
bool flameDetected = false;

// Am thanh phan hoi & Servo
unsigned long doorBeepUntil = 0;
int doorBeepRemaining = 0;
unsigned long nextDoorBeepAt = 0;
bool buzzerSounding = false;

// Cam bien
float lastTemp = NAN, lastHum = NAN;
bool motionState = false, reportedMotion = false;
int dhtFailCount = 0;
bool dhtErrorAlerted = false;

// MQ-2
int mq2Samples[5] = {0, 0, 0, 0, 0};
int mq2Index = 0;
bool mq2Filled = false;
int mq2Avg = 0;
int mq2Raw = 0;
bool smokeAlarm = false;
bool buzzerMuted = false;
bool alertPending = false;
unsigned long lastAlertSentMs = 0;
bool tempFanLatch = false;

// Bo dem vong chong trung requestId (64 byte de nhan du UUID 40+ ky tu tu Backend)
char requestIdRing[REQUEST_ID_RING_SIZE][64];
uint8_t requestIdHead = 0;
uint8_t requestIdCount = 0;

// Dinh thoi
unsigned long tWifi = 0, tMqtt = 0, tDht = 0, tMq2 = 0, tStatus = 0, tOled = 0;
unsigned long bootMs = 0;

struct Button {
  uint8_t pin;
  bool stable;
  bool lastRead;
  unsigned long changedAt;
};
Button btnDoor = {PIN_BTN_DOOR, HIGH, HIGH, 0};

// ---------------------------------------------------------------------------
// 5. TIEN ICH
// ---------------------------------------------------------------------------
uint64_t nowMs() {
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  if (tv.tv_sec > 1700000000L) {
    return (uint64_t)tv.tv_sec * 1000ULL + (uint64_t)(tv.tv_usec / 1000);
  }
  return (uint64_t)millis();
}

bool seenRequestId(const char* id) {
  for (int i = 0; i < requestIdCount; i++) {
    if (strcmp(requestIdRing[i], id) == 0) return true;
  }
  return false;
}

void rememberRequestId(const char* id) {
  strncpy(requestIdRing[requestIdHead], id, sizeof(requestIdRing[0]) - 1);
  requestIdRing[requestIdHead][sizeof(requestIdRing[0]) - 1] = '\0';
  requestIdHead = (requestIdHead + 1) % REQUEST_ID_RING_SIZE;
  if (requestIdCount < REQUEST_ID_RING_SIZE) requestIdCount++;
}

void buildTopic(char* out, size_t len, const char* suffix) {
  snprintf(out, len, "%s/%s", topicPrefix, suffix);
}

bool publishJson(const char* suffix, JsonDocument& doc, bool retain) {
  if (!mqtt.connected()) return false;
  char topic[96];
  buildTopic(topic, sizeof(topic), suffix);
  char payload[640];
  size_t n = serializeJson(doc, payload, sizeof(payload));
  if (n == 0 || n >= sizeof(payload)) return false;
  return mqtt.publish(topic, (const uint8_t*)payload, n, retain);
}

void saveAutoConfigToFlash() {
  prefs.putBool("fanAuto", fanAuto);
  prefs.putBool("pirLight", motionAutoLight);
  prefs.putFloat("tHigh", cfgTempHigh);
  prefs.putFloat("tLow", cfgTempLow);
  prefs.putInt("smokeAdc", cfgSmokeAdc);
}

// ---------------------------------------------------------------------------
// 6. DIEU KHIEN PHAN CUNG (TACH DOC LAP COI VOI DEN PHONG NGU!)
// ---------------------------------------------------------------------------
void applyOutputs() {
  digitalWrite(PIN_LED1, light1On ? HIGH : LOW);
  digitalWrite(PIN_LED2, light2On ? HIGH : LOW);
  digitalWrite(PIN_FAN, fanOn ? HIGH : LOW);

  bool wantBuzzer = (smokeAlarm && !buzzerMuted) || (millis() < doorBeepUntil);
  if (wantBuzzer && !buzzerSounding) {
    // Dung tone() de wokwi-buzzer phat am thanh that tren trinh duyet Wokwi Web
    tone(PIN_BUZZER, smokeAlarm ? 2400 : 1800);
    buzzerSounding = true;
  } else if (!wantBuzzer && buzzerSounding) {
    noTone(PIN_BUZZER);
    digitalWrite(PIN_BUZZER, LOW);
    buzzerSounding = false;
  }
}

void triggerFeedbackBeep(int count) {
  doorBeepRemaining = count;
  doorBeepUntil = millis() + 90;
  applyOutputs();
}

void setDoor(bool open, int angle) {
  doorOpen = open;
  doorAngle = constrain(angle, 0, 180);
  doorServo.write(doorAngle);
  triggerFeedbackBeep(open ? 1 : 2);
  tOled = 0;
}

// ---------------------------------------------------------------------------
// 7. PUBLISH MQTT (KHOP 100% BACKEND & WEB/ANDROID)
// ---------------------------------------------------------------------------
void publishDeviceState(const char* deviceId, const char* requestId,
                        const char* source, bool isDuplicate) {
  JsonDocument doc;
  doc["requestId"] = requestId;
  doc["homeId"] = HOME_ID;
  doc["deviceId"] = deviceId;
  JsonObject rs = doc["reportedState"].to<JsonObject>();

  if (strcmp(deviceId, "light1") == 0) {
    rs["power"] = light1On ? "ON" : "OFF";
    rs["mode"] = "MANUAL";
  } else if (strcmp(deviceId, "light2") == 0) {
    rs["power"] = light2On ? "ON" : "OFF";
    rs["mode"] = "MANUAL";
  } else if (strcmp(deviceId, "fan1") == 0) {
    rs["power"] = fanOn ? "ON" : "OFF";
    rs["mode"] = fanAuto ? "AUTO" : "MANUAL";
  } else if (strcmp(deviceId, "door1") == 0) {
    rs["doorState"] = doorOpen ? "OPEN" : "CLOSED";
    rs["currentAngle"] = doorAngle;
    bool reedClosed = (digitalRead(PIN_DOOR_SENSOR) == LOW);
    rs["positionVerified"] = (!doorOpen && reedClosed);
  }

  doc["status"] = "OK";
  doc["source"] = source;
  doc["isDuplicate"] = isDuplicate;
  doc["timestamp"] = nowMs();

  char suffix[40];
  snprintf(suffix, sizeof(suffix), "%s/state", deviceId);
  publishJson(suffix, doc, true);
}

void publishAllStates(const char* source) {
  char reqId[40];
  snprintf(reqId, sizeof(reqId), "boot_%lu", millis());
  publishDeviceState("light1", reqId, source, false);
  publishDeviceState("light2", reqId, source, false);
  publishDeviceState("fan1", reqId, source, false);
  publishDeviceState("door1", reqId, source, false);
}

void publishStatus(bool online, bool retain = false) {
  JsonDocument doc;
  doc["homeId"] = HOME_ID;
  doc["deviceId"] = DEVICE_NODE_ID;
  doc["online"] = online;
  doc["systemMode"] = fanAuto ? "AUTO" : "MANUAL";
  doc["tempThresholdHigh"] = cfgTempHigh;
  doc["tempThresholdLow"] = cfgTempLow;
  doc["smokeThresholdAdc"] = cfgSmokeAdc;
  doc["motionAutoLight"] = motionAutoLight;
  doc["rssi"] = WiFi.RSSI();
  doc["uptimeSeconds"] = (millis() - bootMs) / 1000UL;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["timestamp"] = nowMs();
  publishJson("esp32/status", doc, retain);
}

void publishTemperature(float t) {
  JsonDocument doc;
  doc["homeId"] = HOME_ID;
  doc["sensorId"] = "dht22_temp";
  doc["type"] = "temperature";
  doc["value"] = serialized(String(t, 1));
  doc["unit"] = "C";
  doc["roomId"] = "living_room";
  doc["status"] = "OK";
  doc["timestamp"] = nowMs();
  publishJson("sensors/temperature", doc, false);
}

void publishHumidity(float h) {
  JsonDocument doc;
  doc["homeId"] = HOME_ID;
  doc["sensorId"] = "dht22_hum";
  doc["type"] = "humidity";
  doc["value"] = serialized(String(h, 1));
  doc["unit"] = "%";
  doc["roomId"] = "living_room";
  doc["status"] = "OK";
  doc["timestamp"] = nowMs();
  publishJson("sensors/humidity", doc, false);
}

void publishMotion(bool detected) {
  JsonDocument doc;
  doc["homeId"] = HOME_ID;
  doc["sensorId"] = "pir_living";
  doc["type"] = "motion";
  doc["motionDetected"] = detected;
  doc["roomId"] = "living_room";
  doc["timestamp"] = nowMs();
  publishJson("sensors/motion", doc, false);
}

void publishSmoke() {
  JsonDocument doc;
  doc["homeId"] = HOME_ID;
  doc["sensorId"] = "mq2_kitchen";
  doc["type"] = "smoke";
  doc["rawAdc"] = mq2Avg;
  doc["smokeLevelPercent"] = serialized(String(mq2Avg * 100.0f / 4095.0f, 1));
  doc["thresholdAdc"] = cfgSmokeAdc;
  doc["isWarmedUp"] = true;
  doc["abnormal"] = smokeAlarm;
  doc["roomId"] = "kitchen";
  doc["timestamp"] = nowMs();
  publishJson("sensors/smoke", doc, false);
}

bool publishAlert(const char* type, const char* severity, const char* deviceId,
                  const char* roomId, const char* message, bool buzzer, bool autoFan) {
  JsonDocument doc;
  uint64_t ts = nowMs();
  char alertId[64];
  snprintf(alertId, sizeof(alertId), "alt_%llu_%s", (unsigned long long)ts, deviceId);
  doc["alertId"] = alertId;
  doc["homeId"] = HOME_ID;
  doc["type"] = type;
  doc["severity"] = severity;
  doc["deviceId"] = deviceId;
  doc["roomId"] = roomId;
  doc["message"] = message;
  doc["buzzerTriggered"] = buzzer;
  doc["autoFanTriggered"] = autoFan;
  doc["timestamp"] = ts;
  return publishJson("alerts", doc, false);
}

// ---------------------------------------------------------------------------
// 8. LOGIC AUTO QUAT & HYSTERESIS
// ---------------------------------------------------------------------------
void updateTempLatch(float t) {
  if (t >= cfgTempHigh) {
    tempFanLatch = true;
  } else if (t <= cfgTempLow) {
    tempFanLatch = false;
  }
}

bool evaluateAutoFan(const char* source) {
  if (!fanAuto) return false;
  bool desired = smokeAlarm || tempFanLatch;
  if (desired == fanOn) return false;
  fanOn = desired;
  applyOutputs();
  tOled = 0;
  char reqId[40];
  snprintf(reqId, sizeof(reqId), "auto_%lu", millis());
  publishDeviceState("fan1", reqId, source, false);
  return true;
}

// ---------------------------------------------------------------------------
// 9. XU LY LENH /set TU BACKEND & WEB/ANDROID
// ---------------------------------------------------------------------------
void handleCommand(const char* deviceId, JsonDocument& doc) {
  const char* requestId = doc["requestId"] | "";
  if (strlen(requestId) == 0 || strlen(requestId) >= sizeof(requestIdRing[0])) return;

  const char* homeId = doc["homeId"] | "";
  if (strcmp(homeId, HOME_ID) != 0) return;
  if (strcmp(doc["deviceId"] | "", deviceId) != 0) return;

  if (seenRequestId(requestId)) {
    publishDeviceState(deviceId, requestId, "REMOTE_COMMAND", true);
    return;
  }

  JsonObjectConst ds = doc["desiredState"];
  if (ds.isNull()) return;

  if (strcmp(deviceId, "light1") == 0 || strcmp(deviceId, "light2") == 0) {
    const char* p = ds["power"] | "";
    if (strcmp(p, "ON") != 0 && strcmp(p, "OFF") != 0) return;
    bool on = strcmp(p, "ON") == 0;
    if (deviceId[5] == '1') light1On = on;
    else light2On = on;
  } else if (strcmp(deviceId, "fan1") == 0) {
    const char* m = ds["mode"] | "";
    const char* p = ds["power"] | "";
    bool cfgChanged = false;
    if (strcmp(m, "AUTO") == 0) {
      fanAuto = true;
      cfgChanged = true;
    } else if (strcmp(m, "MANUAL") == 0) {
      fanAuto = false;
      cfgChanged = true;
    }
    if (!ds["tempThresholdHigh"].isNull()) {
      cfgTempHigh = ds["tempThresholdHigh"].as<float>();
      cfgChanged = true;
    }
    if (!ds["tempThresholdLow"].isNull()) {
      cfgTempLow = ds["tempThresholdLow"].as<float>();
      cfgChanged = true;
    }
    if (!ds["smokeThresholdAdc"].isNull()) {
      cfgSmokeAdc = ds["smokeThresholdAdc"].as<int>();
      cfgChanged = true;
    }
    if (!ds["motionAutoLight"].isNull()) {
      motionAutoLight = ds["motionAutoLight"].as<bool>();
      cfgChanged = true;
    }
    if (cfgChanged) {
      saveAutoConfigToFlash();
      if (!isnan(lastTemp)) updateTempLatch(lastTemp);
      if (fanAuto && motionAutoLight && light1On != motionState) {
        light1On = motionState;
        applyOutputs();
        publishDeviceState("light1", requestId, "AUTO_RULE", false);
      }
      publishStatus(true, true);
    }

    if (strcmp(p, "ON") == 0 || strcmp(p, "OFF") == 0) {
      fanOn = (strcmp(p, "ON") == 0);
      if (fanAuto) tempFanLatch = fanOn;
    } else if (fanAuto) {
      fanOn = smokeAlarm || tempFanLatch;
    }
  } else if (strcmp(deviceId, "door1") == 0) {
    const char* s = ds["doorState"] | "";
    if (strcmp(s, "OPEN") == 0) {
      setDoor(true, ds["targetAngle"] | DOOR_ANGLE_OPEN);
    } else if (strcmp(s, "CLOSED") == 0) {
      setDoor(false, ds["targetAngle"] | DOOR_ANGLE_CLOSED);
    } else {
      return;
    }
  } else if (strcmp(deviceId, "buzzer") == 0) {
    bool wantMute = ds["mute"] | (strcmp(ds["power"] | "", "OFF") == 0);
    if (wantMute) {
      buzzerMuted = true;
      doorBeepUntil = 0;
      doorBeepRemaining = 0;
      alertPending = false;
      applyOutputs();
      rememberRequestId(requestId);
      tOled = 0;
      Serial.println("[BUZZER] Da tat coi tu xa qua App/Web!");
    }
    return;
  } else {
    return;
  }

  applyOutputs();
  rememberRequestId(requestId);
  publishDeviceState(deviceId, requestId, "REMOTE_COMMAND", false);
  tOled = 0;
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  size_t prefixLen = strlen(topicPrefix);
  if (strncmp(topic, topicPrefix, prefixLen) != 0 || topic[prefixLen] != '/') return;
  const char* rest = topic + prefixLen + 1;
  const char* slash = strchr(rest, '/');
  if (!slash || strcmp(slash, "/set") != 0) return;

  char deviceId[16];
  size_t dl = slash - rest;
  if (dl == 0 || dl >= sizeof(deviceId)) return;
  memcpy(deviceId, rest, dl);
  deviceId[dl] = '\0';

  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;
  handleCommand(deviceId, doc);
}

// ---------------------------------------------------------------------------
// 10. KET NOI WI-FI & EMQX CLOUD MQTT (TLS :8883)
// ---------------------------------------------------------------------------
void maintainWifi() {
  static bool wasConnected = false;
  if (WiFi.status() == WL_CONNECTED) {
    if (!wasConnected) {
      wasConnected = true;
      Serial.print("[WiFi] Da ket noi Wokwi-GUEST. IP: ");
      Serial.println(WiFi.localIP());
      tMqtt = 0;
      tOled = 0;
    }
    return;
  }
  wasConnected = false;
  if (millis() - tWifi < WIFI_RETRY_MS && tWifi != 0) return;
  tWifi = millis();
  Serial.println("[WiFi] Dang ket noi Wokwi-GUEST...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
}

void maintainMqtt() {
  if (WiFi.status() != WL_CONNECTED || mqtt.connected()) return;
  if (millis() - tMqtt < MQTT_RETRY_MS && tMqtt != 0) return;
  tMqtt = millis();

  char clientId[40];
  snprintf(clientId, sizeof(clientId), "wokwi-%s-%04X", HOME_ID,
           (uint16_t)(ESP.getEfuseMac() & 0xFFFF));

  char willTopic[96];
  buildTopic(willTopic, sizeof(willTopic), "esp32/status");
  char will[200];
  snprintf(will, sizeof(will),
           "{\"homeId\":\"%s\",\"deviceId\":\"%s\",\"online\":false,"
           "\"reason\":\"lwt_unexpected_disconnect\",\"timestamp\":0}",
           HOME_ID, DEVICE_NODE_ID);

  Serial.println("[MQTT] Dang ket noi EMQX Cloud (TLS :8883)...");
  secureClient.setNoDelay(true);
  if (mqtt.connect(clientId, MQTT_USERNAME, MQTT_PASSWORD, willTopic, 1, true, will, true)) {
    Serial.println("[MQTT] >>> KET NOI EMQX THANH CONG! <<<");
    char sub[96];
    buildTopic(sub, sizeof(sub), "+/set");
    mqtt.subscribe(sub, 1);
    mqtt.loop();
    publishStatus(true, true);
    mqtt.loop();
    publishAllStates("BOOT_SYNC");
    publishSmoke();
    tOled = 0;
  } else {
    Serial.printf("[MQTT] That bai, rc=%d\n", mqtt.state());
  }
}

// ---------------------------------------------------------------------------
// 11. NUT NHAN VAT LY & DOC CAM BIEN
// ---------------------------------------------------------------------------
bool buttonPressed(struct Button& b) {
  bool r = digitalRead(b.pin);
  if (r != b.lastRead) {
    b.lastRead = r;
    b.changedAt = millis();
  }
  if (millis() - b.changedAt >= BUTTON_DEBOUNCE_MS && r != b.stable) {
    b.stable = r;
    if (b.stable == LOW) return true;
  }
  return false;
}

void handleButtons() {
  // Nut D18: Mo/Dong Cua Servo
  if (buttonPressed(btnDoor)) {
    setDoor(!doorOpen, doorOpen ? DOOR_ANGLE_CLOSED : DOOR_ANGLE_OPEN);
    char reqId[40];
    snprintf(reqId, sizeof(reqId), "btn_door_%lu", millis());
    publishDeviceState("door1", reqId, "PHYSICAL_BUTTON", false);
  }

  // Nut D19: Bam nhanh = Tat coi hoac Bat/Tat Den P.Khach | Nhan giu >= 1.8s = Doi MANUAL <-> AUTO
  static unsigned long d19PressStart = 0;
  static bool d19LongHandled = false;
  bool d19Down = (digitalRead(PIN_BTN_LIGHT) == LOW);

  if (d19Down) {
    if (d19PressStart == 0) {
      d19PressStart = millis();
      d19LongHandled = false;
    } else if (!d19LongHandled && (millis() - d19PressStart >= 1800)) {
      d19LongHandled = true;
      fanAuto = !fanAuto;
      saveAutoConfigToFlash();
      triggerFeedbackBeep(fanAuto ? 1 : 2);
      if (fanAuto) {
        if (!isnan(lastTemp)) updateTempLatch(lastTemp);
        evaluateAutoFan("PHYSICAL_BUTTON");
      }
      tOled = 0;
      char reqId[40];
      snprintf(reqId, sizeof(reqId), "btn_mode_%lu", millis());
      publishDeviceState("fan1", reqId, "PHYSICAL_BUTTON", false);
      publishStatus(true, true);
      Serial.printf("[BTN] Da doi che do sang: %s\n", fanAuto ? "AUTO" : "MANUAL");
    }
  } else if (d19PressStart != 0) {
    unsigned long heldMs = millis() - d19PressStart;
    d19PressStart = 0;
    if (!d19LongHandled && heldMs >= BUTTON_DEBOUNCE_MS) {
      if (smokeAlarm && !buzzerMuted) {
        buzzerMuted = true;
        applyOutputs();
        tOled = 0;
        Serial.println("[BTN] Da tat coi bao dong tai cho");
      } else {
        light1On = !light1On;
        applyOutputs();
        tOled = 0;
        char reqId[40];
        snprintf(reqId, sizeof(reqId), "btn_light_%lu", millis());
        publishDeviceState("light1", reqId, "PHYSICAL_BUTTON", false);
      }
    }
  }
}

void readDoorMagneticSensor() {
  static bool lastReedLow = false;
  static bool initialized = false;
  static unsigned long reedChangedAt = 0;
  bool isLow = (digitalRead(PIN_DOOR_SENSOR) == LOW);

  if (!initialized) {
    lastReedLow = isLow;
    initialized = true;
    return;
  }
  if (isLow != lastReedLow) {
    lastReedLow = isLow;
    reedChangedAt = millis();
  }
  if (reedChangedAt != 0 && millis() - reedChangedAt >= 80) {
    reedChangedAt = 0;
    bool physicalOpen = !isLow;
    if (physicalOpen != doorOpen) {
      doorOpen = physicalOpen;
      doorAngle = doorOpen ? DOOR_ANGLE_OPEN : DOOR_ANGLE_CLOSED;
      doorServo.write(doorAngle);
      tOled = 0;
      char reqId[40];
      snprintf(reqId, sizeof(reqId), "reed_door_%lu", millis());
      publishDeviceState("door1", reqId, "PHYSICAL_BUTTON", false);
      Serial.printf("[MC-38] Cam bien cua D32 -> %s\n", doorOpen ? "OPEN" : "CLOSED");
    }
  }
}

void readMotion() {
  bool m = (digitalRead(PIN_PIR) == HIGH);
  if (m != motionState) {
    motionState = m;
    tOled = 0;
    Serial.printf("[PIR] Chuyen dong D35: %s\n", motionState ? "CO NGUOI!" : "KHONG");

    if (fanAuto && motionAutoLight && light1On != motionState) {
      light1On = motionState;
      applyOutputs();
      char reqId[40];
      snprintf(reqId, sizeof(reqId), "auto_pir_%lu", millis());
      publishDeviceState("light1", reqId, "AUTO_RULE", false);
    }
    if (motionState != reportedMotion) {
      publishMotion(motionState);
      reportedMotion = motionState;
    }
  }
}

void readMq2AndFlame() {
  // Bien tro mo phong MQ-2 tren Wokwi (0..4095) + Cong tac Flame Sensor D33 (LOW = CO LUA)
  mq2Raw = analogRead(PIN_MQ2);
  flameDetected = (digitalRead(PIN_FLAME) == LOW);
  int effectiveRaw = (flameDetected && mq2Raw < cfgSmokeAdc + 300) ? (cfgSmokeAdc + 300) : mq2Raw;

  mq2Samples[mq2Index] = effectiveRaw;
  mq2Index = (mq2Index + 1) % 5;
  if (mq2Index == 0) mq2Filled = true;

  int count = mq2Filled ? 5 : mq2Index;
  long sum = 0;
  for (int i = 0; i < count; i++) sum += mq2Samples[i];
  mq2Avg = count > 0 ? (int)(sum / count) : 0;

  bool prevAlarm = smokeAlarm;
  if (!smokeAlarm && (mq2Avg >= cfgSmokeAdc || flameDetected)) {
    smokeAlarm = true;
    buzzerMuted = false;
  } else if (smokeAlarm && !flameDetected && mq2Avg < cfgSmokeAdc - SMOKE_CLEAR_MARGIN) {
    smokeAlarm = false;
    buzzerMuted = false;
  }

  static unsigned long lastSmokePubMs = 0;
  static int lastReportedSmoke = -100;
  if (smokeAlarm != prevAlarm || abs(mq2Avg - lastReportedSmoke) >= 35 ||
      (millis() - lastSmokePubMs >= 3000)) {
    lastSmokePubMs = millis();
    lastReportedSmoke = mq2Avg;
    if (mqtt.connected()) publishSmoke();
  }

  if (smokeAlarm != prevAlarm) {
    applyOutputs();
    evaluateAutoFan("AUTO_RULE");
    tOled = 0;
    if (smokeAlarm) {
      alertPending = true;
      lastAlertSentMs = 0;
    }
  }

  if (smokeAlarm && alertPending && mqtt.connected() &&
      (lastAlertSentMs == 0 || millis() - lastAlertSentMs >= ALERT_COOLDOWN_MS)) {
    const char* msg = flameDetected
                        ? "CANH BAO LUA! Phat hien ngon lua tai Phong bep (Wokwi)!"
                        : "Canh bao! Nong do khoi/khi vuot nguong an toan (Wokwi).";
    if (publishAlert("SMOKE_DETECTED", "CRITICAL", "mq2_kitchen", "kitchen",
                     msg, true, fanAuto)) {
      lastAlertSentMs = millis();
    }
  }
  if (!smokeAlarm) alertPending = false;
}

void readDht() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    dhtFailCount++;
    if (dhtFailCount >= 3 && !dhtErrorAlerted) {
      if (publishAlert("SENSOR_ERROR", "WARNING", "dht22_temp", "living_room",
                       "Cam bien DHT22 khong doc duoc du lieu.", false, false)) {
        dhtErrorAlerted = true;
      }
    }
    return;
  }
  dhtFailCount = 0;
  dhtErrorAlerted = false;
  lastTemp = t;
  lastHum = h;

  updateTempLatch(t);
  evaluateAutoFan("AUTO_RULE");
  publishTemperature(t);
  publishHumidity(h);
}

void updateOledScreen() {
  if (!oledReady) return;
  char line[24];

  snprintf(line, sizeof(line), "WF:%s MQ:%s [%s]",
           WiFi.status() == WL_CONNECTED ? "OK" : "--",
           mqtt.connected() ? "OK" : "--",
           fanAuto ? "AUTO" : "MANU");
  oledPrintLine(0, line);
  oledPrintLine(1, "");

  if (isnan(lastTemp) || isnan(lastHum)) {
    oledPrintLine(2, "T: --.-C   H: --%");
  } else {
    snprintf(line, sizeof(line), "T: %.1fC   H: %.0f%%", lastTemp, lastHum);
    oledPrintLine(2, line);
  }
  oledPrintLine(3, "");

  if (flameDetected) {
    oledPrintLine(4, "!! CANH BAO LUA !!");
  } else if (smokeAlarm) {
    snprintf(line, sizeof(line), "!! KHOI: %d !!", mq2Avg);
    oledPrintLine(4, line);
  } else {
    snprintf(line, sizeof(line), "GAS:%-4d  PIR:%s", mq2Avg, motionState ? "CO!" : "KO");
    oledPrintLine(4, line);
  }
  oledPrintLine(5, "");

  snprintf(line, sizeof(line), "D1:%s D2:%s F:%s",
           light1On ? "ON " : "OFF",
           light2On ? "ON " : "OFF",
           fanOn ? (fanAuto ? "AUT" : "ON ") : "OFF");
  oledPrintLine(6, line);
  oledPrintLine(7, doorOpen ? "CUA: MO (90 DEG)" : "CUA: DONG (0 DEG)");
}

// ---------------------------------------------------------------------------
// 12. SETUP & LOOP
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  bootMs = millis();
  snprintf(topicPrefix, sizeof(topicPrefix), "smarthome/%s", HOME_ID);

  // Khoi phuc cau hinh AUTO tu Flash NVS
  prefs.begin("smarthome", false);
  fanAuto = prefs.getBool("fanAuto", false);
  motionAutoLight = prefs.getBool("pirLight", true);
  cfgTempHigh = prefs.getFloat("tHigh", TEMP_THRESHOLD_HIGH);
  cfgTempLow = prefs.getFloat("tLow", TEMP_THRESHOLD_LOW);
  cfgSmokeAdc = prefs.getInt("smokeAdc", SMOKE_THRESHOLD_ADC);

  pinMode(PIN_LED1, OUTPUT);
  pinMode(PIN_LED2, OUTPUT);
  pinMode(PIN_FAN, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_BTN_DOOR, INPUT_PULLUP);
  pinMode(PIN_BTN_LIGHT, INPUT_PULLUP);
  pinMode(PIN_DOOR_SENSOR, INPUT_PULLUP);
  pinMode(PIN_FLAME, INPUT_PULLUP);
  analogReadResolution(12);

  oledInit(PIN_OLED_SDA, PIN_OLED_SCL);

  // Khoi tao RTC noi nam 2026 de payload co timestamp hop le ngay tu giay 0
  struct timeval tv;
  tv.tv_sec = 1795070000L;
  tv.tv_usec = 0;
  settimeofday(&tv, nullptr);

  applyOutputs();
  ESP32PWM::allocateTimer(0);
  doorServo.setPeriodHertz(50);
  doorServo.attach(PIN_SERVO, 500, 2400);
  doorServo.write(DOOR_ANGLE_CLOSED);

  dht.begin();

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  tWifi = millis();
  configTime(0, 0, "pool.ntp.org", "time.google.com");

  // Moi truong Wokwi: bo qua xac thuc chung chi CA de ket noi TLS nhanh & on dinh
  secureClient.setInsecure();
  secureClient.setNoDelay(true);

  mqtt.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(1024);
  mqtt.setKeepAlive(15);
  mqtt.setSocketTimeout(5);

  Serial.println("\n[BOOT] Smart Home ESP32 Wokwi Simulator v2.0.0 Ready!");
}

void loop() {
  maintainWifi();
  maintainMqtt();
  if (mqtt.connected()) mqtt.loop();

  handleButtons();
  readDoorMagneticSensor();
  readMotion();

  // Xu ly tieng bip phan hoi non-blocking
  if (doorBeepUntil != 0 && millis() >= doorBeepUntil) {
    doorBeepUntil = 0;
    applyOutputs();
    if (doorBeepRemaining > 1) {
      doorBeepRemaining--;
      nextDoorBeepAt = millis() + 80;
    }
  }
  if (nextDoorBeepAt != 0 && millis() >= nextDoorBeepAt) {
    nextDoorBeepAt = 0;
    doorBeepUntil = millis() + 90;
    applyOutputs();
  }

  unsigned long now = millis();
  if (now - tOled >= 1000) {
    tOled = now;
    updateOledScreen();
  }
  if (now - tMq2 >= MQ2_INTERVAL_MS) {
    tMq2 = now;
    readMq2AndFlame();
  }
  if (now - tDht >= DHT_INTERVAL_MS) {
    tDht = now;
    readDht();
  }
  if (now - tStatus >= STATUS_INTERVAL_MS) {
    tStatus = now;
    if (mqtt.connected()) publishStatus(true, false);
  }
}
