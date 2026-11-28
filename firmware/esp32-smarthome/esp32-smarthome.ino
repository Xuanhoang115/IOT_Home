// ============================================================================
// SMART HOME IoT 2026 - ESP32 FIRMWARE (DevKit V1 CP2102, 30 chan)
// - Wi-Fi + MQTT over TLS (HiveMQ Cloud :8883), LWT, reconnect khong chan lau
// - Doc DHT22 / PIR / MQ-2; dieu khien LED, quat (MOSFET), servo SG90, buzzer
// - Chong lap lenh bang ring buffer 16 requestId (MQTT QoS 1 giao "it nhat 1 lan")
// - An toan cuc bo: buzzer + quat AUTO bat ngay khi khoi vuot nguong, ke ca mat mang
// - Khong tu dong dong cua dua tren PIR; moi lenh /set deu khong retained
// Payload JSON khop docs/MQTT_TOPICS.md va backend/src/schemas/validation.ts
// Luu y: PubSubClient chi publish QoS 0 (subscribe/LWT van ho tro QoS 1).
// ============================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <Preferences.h>
#include <sys/time.h>

#include "include/config.h"
#include "include/secrets.h"
#include "include/oled_ssd1306.h"

// ---------------------------------------------------------------------------
// Doi tuong toan cuc
// ---------------------------------------------------------------------------
WiFiClientSecure secureClient;
PubSubClient mqtt(secureClient);
DHT dht(PIN_DHT, DHT22);
Servo doorServo;
Preferences prefs;

static char topicPrefix[48];  // "smarthome/<HOME_ID>"

// Trang thai thiet bi (reportedState) & Cau hinh AUTO luu trong Flash NVS
bool light1On = false;         // Phong khach (1 bong - D25)
bool light2On = false;         // Phong ngu 1 (2 bong song song - D26)
bool light3On = false;         // Phong ngu 2 (1 bong - D23)
bool fanOn = false;
bool fanAuto = false;          // mode cua he thong/fan1: AUTO / MANUAL
bool motionAutoLight = true;   // AUTO: tu bat/tat Den Phong khach (light1) theo PIR
float cfgTempHigh = TEMP_THRESHOLD_HIGH;
float cfgTempLow = TEMP_THRESHOLD_LOW;
int cfgSmokeAdc = SMOKE_THRESHOLD_ADC;
bool doorOpen = false;
int doorAngle = DOOR_ANGLE_CLOSED;
bool doorSensorActive = false; // Kich hoat khi cam bien tu MC-38 (D32) duoc noi GND
bool flameDetected = false;    // Cam bien lua Flame Sensor (D33, LOW = co lua)
unsigned long tOled = 0;

// Toi uu he thong Cua Servo & Am thanh phan hoi
unsigned long servoDetachAt = 0;
unsigned long doorBeepUntil = 0;
int doorBeepRemaining = 0;
unsigned long nextDoorBeepAt = 0;
unsigned long doorOpenedAt = 0;

// Cam bien
float lastTemp = NAN, lastHum = NAN;
float reportedTemp = NAN, reportedHum = NAN;
bool motionState = false, reportedMotion = false;
int dhtFailCount = 0;
bool dhtErrorAlerted = false;

// MQ-2
int mq2Samples[5] = {0, 0, 0, 0, 0};
int mq2Index = 0;
bool mq2Filled = false;
int mq2Avg = 0;
int mq2Raw = 0;
bool smokeAlarm = false;       // dang bao dong
bool buzzerMuted = false;      // nguoi dung da tat coi bang nut
bool alertPending = false;
unsigned long lastAlertSentMs = 0;
bool tempFanLatch = false;     // ket qua hysteresis nhiet do

// Bo dem vong chong trung requestId
char requestIdRing[REQUEST_ID_RING_SIZE][64];
int requestIdCount = 0;
int requestIdHead = 0;

// Dinh thoi
unsigned long tWifi = 0, tMqtt = 0, tDht = 0, tMq2 = 0, tStatus = 0;
unsigned long bootMs = 0;

// Nut nhan
struct Button {
  uint8_t pin;
  bool stable;
  bool lastRead;
  unsigned long changedAt;
};
Button btnBedroom = {PIN_BTN_BEDROOM, HIGH, HIGH, 0};
Button btnLight = {PIN_BTN_LIGHT, HIGH, HIGH, 0};

// ---------------------------------------------------------------------------
// Tien ich
// ---------------------------------------------------------------------------
uint64_t nowMs() {
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  if (tv.tv_sec > 1700000000L) {
    return (uint64_t)tv.tv_sec * 1000ULL + (uint64_t)(tv.tv_usec / 1000);
  }
  return (uint64_t)millis();  // chua dong bo NTP: dung thoi gian tu luc bat nguon
}

bool clockSynchronized() {
  return time(nullptr) > 1700000000L;
}

bool caConfigured() {
  return strstr(MQTT_ROOT_CA, "DAN_NOI_DUNG") == nullptr;
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

// ---------------------------------------------------------------------------
// Dieu khien phan cung
// ---------------------------------------------------------------------------
void triggerDoorFeedbackBeep(int count) {
  doorBeepRemaining = count;
  doorBeepUntil = millis() + 90;
  digitalWrite(PIN_BUZZER, HIGH);
}

void applyOutputs() {
  digitalWrite(PIN_LED1, light1On ? HIGH : LOW);
  digitalWrite(PIN_LED2, light2On ? HIGH : LOW);
  digitalWrite(PIN_LED3, light3On ? HIGH : LOW);
  digitalWrite(PIN_FAN, fanOn ? HIGH : LOW);
  // Coi chi hu khi co bao dong KHOI / LUA hoac tieng pip phan hoi dong mo cua
  bool buzzerActive = (smokeAlarm && !buzzerMuted) || (millis() < doorBeepUntil);
  digitalWrite(PIN_BUZZER, buzzerActive ? HIGH : LOW);
}

void setDoor(bool open, int angle) {
  doorOpen = open;
  doorAngle = constrain(angle, 0, 180);

  // Kich hoat servo va quay den goc dich
  if (!doorServo.attached()) {
    doorServo.attach(PIN_SERVO, 500, 2400);
  }
  doorServo.write(doorAngle);

  // Sau 650ms tu dong ngat xung PWM giup servo dung im, KHONG rung re re, KHONG nong
  servoDetachAt = millis() + 650;

  if (open) {
    doorOpenedAt = millis();
    triggerDoorFeedbackBeep(1); // Pip 1 tieng khi mo cua
  } else {
    doorOpenedAt = 0;
    triggerDoorFeedbackBeep(2); // Pip 2 tieng khi khoa/dong cua
  }
  tOled = 0;
}

// ---------------------------------------------------------------------------
// Bao cao trang thai len MQTT (retain = true)
// ---------------------------------------------------------------------------
void publishDeviceState(const char* deviceId, const char* requestId, const char* source,
                        bool isDuplicate) {
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
  } else if (strcmp(deviceId, "light3") == 0) {
    rs["power"] = light3On ? "ON" : "OFF";
    rs["mode"] = "MANUAL";
  } else if (strcmp(deviceId, "fan1") == 0) {
    rs["power"] = fanOn ? "ON" : "OFF";
    rs["mode"] = fanAuto ? "AUTO" : "MANUAL";
  } else if (strcmp(deviceId, "door1") == 0) {
    rs["doorState"] = doorOpen ? "OPEN" : "CLOSED";
    rs["currentAngle"] = doorAngle;
    bool reedClosed = (digitalRead(PIN_DOOR_SENSOR) == LOW);
    rs["positionVerified"] = (!doorOpen && reedClosed);  // Chi verified khi cua dong va nam cham cham khit
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
  mqtt.loop();
  publishDeviceState("light2", reqId, source, false);
  mqtt.loop();
  publishDeviceState("light3", reqId, source, false);
  mqtt.loop();
  publishDeviceState("fan1", reqId, source, false);
  mqtt.loop();
  publishDeviceState("door1", reqId, source, false);
  mqtt.loop();
}

void publishStatus(bool online, bool retainMsg = false) {
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
  publishJson("esp32/status", doc, retainMsg);
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
  doc["thresholdAdc"] = SMOKE_THRESHOLD_ADC;
  doc["isWarmedUp"] = (millis() - bootMs) >= MQ2_PREHEAT_MS;
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
// Logic AUTO (quat) - hysteresis nhiet do + khan cap khoi
// ---------------------------------------------------------------------------
// Tra ve true neu trang thai quat thay doi.
bool evaluateAutoFan(const char* source) {
  if (!fanAuto) return false;
  bool desired = smokeAlarm || tempFanLatch;
  if (desired == fanOn) return false;
  fanOn = desired;
  applyOutputs();
  char reqId[40];
  snprintf(reqId, sizeof(reqId), "auto_%lu", millis());
  publishDeviceState("fan1", reqId, source, false);
  return true;
}

void updateTempLatch(float t) {
  if (t >= cfgTempHigh) {
    tempFanLatch = true;
  } else if (t <= cfgTempLow) {
    tempFanLatch = false;
  }  // vung giua: giu nguyen (chong bat/tat lien tuc)
}

void saveAutoConfigToFlash() {
  prefs.putBool("fanAuto", fanAuto);
  prefs.putBool("pirLight", motionAutoLight);
  prefs.putFloat("tHigh", cfgTempHigh);
  prefs.putFloat("tLow", cfgTempLow);
  prefs.putInt("smokeAdc", cfgSmokeAdc);
}

// ---------------------------------------------------------------------------
// Xu ly lenh /set tu Backend
// ---------------------------------------------------------------------------
void handleCommand(const char* deviceId, JsonDocument& doc) {
  const char* requestId = doc["requestId"] | "";
  if (strlen(requestId) == 0 || strlen(requestId) >= sizeof(requestIdRing[0])) return;

  const char* homeId = doc["homeId"] | "";
  if (strcmp(homeId, HOME_ID) != 0) return;
  if (strcmp(doc["deviceId"] | "", deviceId) != 0) return;

  // Luu y: Khong so sanh timestamp cua may tinh voi NTP cua ESP32
  // vi dong ho Windows co the lech mui gio/ngay so voi pool.ntp.org lam rot lenh!

  // Lenh trung (QoS 1 giao lai): KHONG kich lai phan cung, chi gui lai ACK
  if (seenRequestId(requestId)) {
    publishDeviceState(deviceId, requestId, "REMOTE_COMMAND", true);
    return;
  }

  JsonObjectConst ds = doc["desiredState"];
  if (ds.isNull()) return;

  if (strcmp(deviceId, "light1") == 0 || strcmp(deviceId, "light2") == 0 ||
      strcmp(deviceId, "light3") == 0) {
    const char* p = ds["power"] | "";
    bool on = strcmp(p, "ON") == 0;
    if (strcmp(p, "ON") != 0 && strcmp(p, "OFF") != 0) return;
    if (deviceId[5] == '1') light1On = on;
    else if (deviceId[5] == '2') light2On = on;
    else light3On = on;
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
      saveAutoConfigToFlash(); // Luu vinh vien vao Flash ESP32 de chay doc lap khi tat may tinh!
      if (!isnan(lastTemp)) updateTempLatch(lastTemp);
      if (fanAuto && motionAutoLight && light1On != motionState) {
        light1On = motionState;
        applyOutputs();
        publishDeviceState("light1", requestId, "AUTO_RULE", false);
      }
      publishStatus(true, true); // Phat ngay cau hinh moi (retain = true) cho moi thiet bi Web/DT
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
  tOled = 0; // Cap nhat ngay len OLED o vong loop ke tiep
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  // topic dang: smarthome/<home>/<deviceId>/set
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
// Ket noi Wi-Fi / MQTT (khong dung delay dai)
// ---------------------------------------------------------------------------
void maintainWifi() {
  static bool wasConnected = false;
  if (WiFi.status() == WL_CONNECTED) {
    if (!wasConnected) {
      wasConnected = true;
      Serial.print("[WiFi] Da ket noi. IP: ");
      Serial.println(WiFi.localIP());
      configTime(0, 0, NTP_SERVER, "time.google.com", "time.cloudflare.com");
      tMqtt = 0; // Ket noi MQTT ngay lap tuc khong cho tre!
    }
    return;
  }
  wasConnected = false;
  if (millis() - tWifi < WIFI_RETRY_MS && tWifi != 0) return;
  tWifi = millis();
  Serial.println("[WiFi] Dang ket noi lai...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void maintainMqtt() {
  if (WiFi.status() != WL_CONNECTED || mqtt.connected()) return;
  static bool reportedSync = false;
  static unsigned long lastWaitLog = 0;
  if (!clockSynchronized()) {
    reportedSync = false;
    if (lastWaitLog == 0 || millis() - lastWaitLog >= 15000UL) {
      lastWaitLog = millis();
      Serial.println("[NTP] Dang cho dong bo gio tu " NTP_SERVER);
      configTime(0, 0, NTP_SERVER, "time.google.com", "time.cloudflare.com");
    }
    return;
  }
  if (!reportedSync) {
    reportedSync = true;
    Serial.println("[NTP] Da dong bo gio");
  }
  if (!caConfigured()) {
    static bool warned = false;
    if (!warned) {
      Serial.println("[MQTT] CHUA dan Root CA vao secrets.h -> khong ket noi (TLS bat buoc)");
      warned = true;
    }
    return;
  }
  if (millis() - tMqtt < MQTT_RETRY_MS && tMqtt != 0) return;
  tMqtt = millis();

  char clientId[40];
  snprintf(clientId, sizeof(clientId), "esp32-%s-%04X", HOME_ID,
           (uint16_t)(ESP.getEfuseMac() & 0xFFFF));

  char willTopic[96];
  buildTopic(willTopic, sizeof(willTopic), "esp32/status");
  char will[200];
  snprintf(will, sizeof(will),
           "{\"homeId\":\"%s\",\"deviceId\":\"%s\",\"online\":false,"
           "\"reason\":\"lwt_unexpected_disconnect\",\"timestamp\":0}",
           HOME_ID, DEVICE_NODE_ID);

  Serial.println("[MQTT] Dang ket noi EMQX Cloud (TLS)...");
  secureClient.setNoDelay(true); // Tat Nagle 200ms de lenh ON/OFF phan hoi tuc thi (< 50ms)
  if (mqtt.connect(clientId, MQTT_USERNAME, MQTT_PASSWORD, willTopic, 1, true, will, true)) {
    Serial.println("[MQTT] Da ket noi");
    char sub[96];
    buildTopic(sub, sizeof(sub), "+/set");
    mqtt.subscribe(sub, 1);
    mqtt.loop();
    publishStatus(true, true); // Goi dau tien luc boot co retain = true
    mqtt.loop();
    publishAllStates("BOOT_SYNC");
    publishSmoke();
    if (alertPending) {
      alertPending = !publishAlert("SMOKE_DETECTED", "CRITICAL", "mq2_kitchen", "kitchen",
                                   "Canh bao! Nong do khoi/khi vuot nguong an toan.", true,
                                   fanAuto);
      if (!alertPending) lastAlertSentMs = millis();
    }
  } else {
    Serial.printf("[MQTT] That bai, rc=%d\n", mqtt.state());
  }
}

// ---------------------------------------------------------------------------
// Nut nhan (debounce phan mem 50ms)
// ---------------------------------------------------------------------------
bool buttonPressed(Button& b) {
  bool r = digitalRead(b.pin);
  if (r != b.lastRead) {
    b.lastRead = r;
    b.changedAt = millis();
  }
  if (millis() - b.changedAt >= BUTTON_DEBOUNCE_MS && r != b.stable) {
    b.stable = r;
    if (b.stable == LOW) return true;  // canh xuong = nhan
  }
  return false;
}

void handleButtons() {
  // Nut D18 (PIN_BTN_BEDROOM): Bat/Tat dong thoi CA 3 DEN PHONG NGU (light2 [2 bong] + light3 [1 bong])
  if (buttonPressed(btnBedroom)) {
    bool nextBedroomOn = !(light2On && light3On);
    light2On = nextBedroomOn;
    light3On = nextBedroomOn;
    applyOutputs();
    tOled = 0;
    char reqId2[40], reqId3[40];
    snprintf(reqId2, sizeof(reqId2), "btn_bed2_%lu", millis());
    snprintf(reqId3, sizeof(reqId3), "btn_bed3_%lu", millis());
    publishDeviceState("light2", reqId2, "PHYSICAL_BUTTON", false);
    mqtt.loop();
    publishDeviceState("light3", reqId3, "PHYSICAL_BUTTON", false);
    Serial.printf("[BTN] Nut D18 Phong ngu -> %s ca 3 den (light2 + light3)\n",
                  nextBedroomOn ? "BAT" : "TAT");
  }

  // Nut D19 (BTN_LIGHT):
  // - Nhan tha nhanh (< 1.8s): Bat/Tat Den Phong khach (hoac tat coi khi dang bao dong)
  // - Nhan GIU >= 1.8 giay: Doi che do MANUAL <-> AUTO truc tiep tren mach (ke ca khi tat Web/DT!)
  static unsigned long d19PressStart = 0;
  static bool d19LongHandled = false;
  bool d19Down = (digitalRead(PIN_BTN_LIGHT) == LOW);

  if (d19Down) {
    if (d19PressStart == 0) {
      d19PressStart = millis();
      d19LongHandled = false;
    } else if (!d19LongHandled && (millis() - d19PressStart >= 1800)) {
      d19LongHandled = true;
      fanAuto = !fanAuto; // Dao che do MANUAL <-> AUTO ngay tren mach!
      saveAutoConfigToFlash();
      triggerDoorFeedbackBeep(fanAuto ? 1 : 2); // 1 bip = AUTO, 2 bip = MANUAL
      if (fanAuto) {
        if (!isnan(lastTemp)) updateTempLatch(lastTemp);
        evaluateAutoFan("PHYSICAL_BUTTON");
      }
      tOled = 0;
      char reqId[40];
      snprintf(reqId, sizeof(reqId), "btn_mode_%lu", millis());
      publishDeviceState("fan1", reqId, "PHYSICAL_BUTTON", false);
      publishStatus(true, true);
      Serial.printf("[BTN] Da doi che do tren mach sang: %s\n", fanAuto ? "AUTO" : "MANUAL");
    }
  } else if (d19PressStart != 0) {
    unsigned long heldMs = millis() - d19PressStart;
    d19PressStart = 0;
    if (!d19LongHandled && heldMs >= BUTTON_DEBOUNCE_MS) {
      if (smokeAlarm && !buzzerMuted) {
        buzzerMuted = true;  // tat coi bao dong tai cho
        applyOutputs();
        Serial.println("[BTN] Da tat coi bao dong");
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

// ---------------------------------------------------------------------------
// Doc cam bien
// ---------------------------------------------------------------------------
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

  // Gui theo chu ky DHT_INTERVAL_MS (5s) - dap ung ca yeu cau gui khi chenh lech lon
  publishTemperature(t);
  publishHumidity(h);
  reportedTemp = t;
  reportedHum = h;
}

void readMotion() {
  bool m = (digitalRead(PIN_PIR) == HIGH);
  static unsigned long lastPirPubMs = 0;
  if (m != motionState) {
    motionState = m;
    tOled = 0; // Cap nhat ngay len man hinh OLED
    Serial.printf("[PIR] Chuyen dong D35: %s\n", motionState ? "CO NGUOI!" : "KHONG");

    // Xu ly TU DONG ngay tren chip ESP32 (hoat dong doc lap 100% ke ca khi tat Web, tat DT, tat Backend!):
    if (fanAuto && motionAutoLight && light1On != motionState) {
      light1On = motionState;
      applyOutputs();
      if (mqtt.connected()) {
        char reqId[40];
        snprintf(reqId, sizeof(reqId), "pir_auto_%lu", millis());
        publishDeviceState("light1", reqId, "AUTO_RULE", false);
      }
    }

    if (mqtt.connected()) {
      publishMotion(motionState);
      reportedMotion = motionState;
      lastPirPubMs = millis();
    }
  } else if (mqtt.connected() && (millis() - lastPirPubMs >= 5000)) {
    lastPirPubMs = millis();
    publishMotion(motionState);
    reportedMotion = motionState;
  }
}

void readDoorMagneticSensor() {
  // Cam bien tu cua MC-38 tren chan D32 (INPUT_PULLUP):
  // - Khi 2 nam cham cham nhau (cua dong) -> D32 = LOW -> tu dong kich hoat doorSensorActive
  // - Khi tach 2 nam cham ra (cua mo) -> D32 = HIGH
  static bool lastReedLow = true;
  static unsigned long reedChangedAt = 0;
  bool isLow = (digitalRead(PIN_DOOR_SENSOR) == LOW);
  if (isLow && !doorSensorActive) {
    doorSensorActive = true;
    Serial.println("[MC-38] Da nhan dien cam bien tu cua tren D32");
  }
  if (!doorSensorActive) return;

  if (isLow != lastReedLow) {
    lastReedLow = isLow;
    reedChangedAt = millis();
  }
  if (millis() - reedChangedAt >= 80) {
    bool physicalOpen = !isLow; // tach nam cham = HIGH = OPEN
    if (physicalOpen != doorOpen) {
      doorOpen = physicalOpen;
      doorAngle = doorOpen ? DOOR_ANGLE_OPEN : DOOR_ANGLE_CLOSED;
      char reqId[40];
      snprintf(reqId, sizeof(reqId), "reed_door_%lu", millis());
      publishDeviceState("door1", reqId, "PHYSICAL_BUTTON", false);
    }
  }
}

void readMq2() {
  // Doc 6 mau nhanh (1.2ms) de phat hien chan D34 dang cam MQ-2 that hay dang de ho (floating)
  int minV = 4095, maxV = 0;
  long acc = 0;
  for (int i = 0; i < 6; i++) {
    int v = analogRead(PIN_MQ2);
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
    acc += v;
    delayMicroseconds(200);
  }
  // Neu bien do nhieu xoay chieu > 550 (chan D34 de ho chua cam MQ-2) -> ep ve 0
  static int mq2Baseline = -1;
  if (maxV - minV > 550) {
    mq2Raw = 0;
    mq2Baseline = -1;
  } else {
    int rawSample = (int)(acc / 6);
    // Tu dong hieu chuan nen khong khi sach (Auto-Baseline Calibration):
    // Khi cam truc tiep AO (5V) vao D34 khong qua cau phan ap, dien ap nghi ~2.0V (ADC ~2600).
    // Bo tu hieu chuan se lay muc khong khi sach hien tai lam moc An Toan (~320 ADC)
    // va chi bao dong (> 2200) khi co khi gas/khoi that lam ADC tang vot!
    if (mq2Baseline == -1) {
      mq2Baseline = rawSample;
    } else if (abs(rawSample - mq2Baseline) < 350) {
      // Tu dong bam theo do troi nhiet khi MQ-2 nong dan len trong khong khi sach
      mq2Baseline = (mq2Baseline * 15 + rawSample) / 16;
    }

    int deltaRise = rawSample - mq2Baseline;
    int deltaDrop = mq2Baseline - rawSample;

    if (deltaRise >= 400) {
      // Co khi gas / khoi lam dien ap AO tang vot so voi khong khi sach
      mq2Raw = constrain(350 + deltaRise * 4, 350, 4095);
    } else if (mq2Baseline >= 3700 && deltaDrop >= 700) {
      // Truong hop cam vao chan DO (binh thuong HIGH ~4095, co khoi tut xuong LOW)
      mq2Raw = 2850;
    } else {
      // Khong khi sach binh thuong -> Hien thi chi so nen an toan (~300 - 450 ADC)
      mq2Raw = constrain(320 + deltaRise / 2, 180, 850);
    }
  }

  // Kiem tra Cam bien lua Flame Sensor tren chan D33:
  // Tu dong ghi nhan trang thai nghi binh thuong luc khoi dong (ho tro ca Active-LOW va Active-HIGH)
  // -> Khi vua cam vao se IM LANG 100%, chi khi quet lua lam tin hieu DO doi trang thai moi hu coi!
  static int flameIdleLevel = -1;
  int currentFlameLevel = digitalRead(PIN_FLAME);
  if (flameIdleLevel == -1 && millis() > 1500) {
    flameIdleLevel = currentFlameLevel;
  }
  flameDetected = (flameIdleLevel != -1) && (currentFlameLevel != flameIdleLevel);
  if (flameDetected && mq2Raw < SMOKE_THRESHOLD_ADC + 300) {
    mq2Raw = SMOKE_THRESHOLD_ADC + 300; // Ep vuot nguong de kich hoat bao dong khan cap ngay
  }

  mq2Samples[mq2Index] = mq2Raw;
  mq2Index = (mq2Index + 1) % 5;
  if (mq2Index == 0) mq2Filled = true;

  int count = mq2Filled ? 5 : mq2Index;
  long sum = 0;
  for (int i = 0; i < count; i++) sum += mq2Samples[i];
  mq2Avg = count > 0 ? (int)(sum / count) : 0;

  bool warmedUp = ((millis() - bootMs) >= MQ2_PREHEAT_MS) || flameDetected;
  bool prevAlarm = smokeAlarm;

  if (warmedUp) {
    if (!smokeAlarm && (mq2Avg >= cfgSmokeAdc || flameDetected)) {
      smokeAlarm = true;
      buzzerMuted = false;
    } else if (smokeAlarm && !flameDetected && mq2Avg < cfgSmokeAdc - SMOKE_CLEAR_MARGIN) {
      smokeAlarm = false;
      buzzerMuted = false;
    }
  }

  static unsigned long lastSmokePubMs = 0;
  static int lastReportedSmokeAdc = -100;
  if (smokeAlarm != prevAlarm ||
      abs(mq2Avg - lastReportedSmokeAdc) >= 35 ||
      (millis() - lastSmokePubMs >= 3000)) {
    lastSmokePubMs = millis();
    lastReportedSmokeAdc = mq2Avg;
    if (mqtt.connected()) publishSmoke();
  }

  if (smokeAlarm != prevAlarm) {
    applyOutputs();               // buzzer phan ung cuc bo ngay lap tuc
    evaluateAutoFan("AUTO_RULE"); // AUTO: bat/tat quat khan cap
    if (smokeAlarm) {
      alertPending = true;
      lastAlertSentMs = 0;
    }
  }

  // Gui canh bao khi chuyen NORMAL->ABNORMAL, va nhac lai sau cooldown neu van con khoi
  if (smokeAlarm && alertPending && mqtt.connected() &&
      (lastAlertSentMs == 0 || millis() - lastAlertSentMs >= ALERT_COOLDOWN_MS)) {
    const char* msg = flameDetected
                        ? "CANH BAO LUA! Phat hien ngon lua/nhiet buc xa tai Phong bep!"
                        : "Canh bao! Nong do khoi/khi vuot nguong an toan.";
    if (publishAlert("SMOKE_DETECTED", "CRITICAL", "mq2_kitchen", "kitchen",
                     msg, true, fanAuto)) {
      lastAlertSentMs = millis();
    }
  } else if (smokeAlarm && mqtt.connected() && millis() - lastAlertSentMs >= ALERT_COOLDOWN_MS) {
    alertPending = true;  // het cooldown, van con khoi: gui lai o vong sau
  }
  if (!smokeAlarm) alertPending = false;
}

void updateOledScreen() {
  Wire.beginTransmission(OLED_I2C_ADDR);
  if (Wire.endTransmission() != 0) {
    oledReady = false;
    oledInit(PIN_OLED_SDA, PIN_OLED_SCL);
    return;
  }
  if (!oledReady) {
    oledInit(PIN_OLED_SDA, PIN_OLED_SCL);
    if (!oledReady) return;
  } else {
    oledKeepAlive(); // Giu man hinh luon sang, tu phuc hoi neu day long hoac sut ap
  }

  char line[24];

  // Dong 1 (Page 0): Trang thai Wi-Fi, MQTT va Che do [AUTO]/[MANU]
  if (WiFi.status() == WL_CONNECTED) {
    snprintf(line, sizeof(line), "WF:OK MQ:%s [%s]",
             mqtt.connected() ? "OK" : "..",
             fanAuto ? "AUTO" : "MANU");
  } else {
    snprintf(line, sizeof(line), "WF:OFFLINE  [%s]",
             fanAuto ? "AUTO" : "MANU");
  }
  oledPrintLine(0, line);
  oledPrintLine(1, "");

  // Dong 2 (Page 2): Nhiet do & Do am
  if (!isnan(lastTemp) && !isnan(lastHum)) {
    snprintf(line, sizeof(line), "TEMP:%.1fC  HUM:%.0f%%", lastTemp, lastHum);
  } else {
    snprintf(line, sizeof(line), "TEMP:--.-C  HUM:--%%");
  }
  oledPrintLine(2, line);
  oledPrintLine(3, "");

  // Dong 3 (Page 4): An ninh (Khoi/Lua & Chuyen dong PIR)
  if (flameDetected || smokeAlarm) {
    snprintf(line, sizeof(line), "!! CANH BAO KHOI/LUA");
  } else {
    snprintf(line, sizeof(line), "GAS:SAFE   PIR:%s",
             motionState ? "CO!" : "KHO");
  }
  oledPrintLine(4, line);
  oledPrintLine(5, "");

  // Dong 4 (Page 6): Trang thai 3 nhom Den (D1=PK, D2=PN1, D3=PN2) va Quat
  snprintf(line, sizeof(line), "D1:%c D2:%c D3:%c F:%s",
           light1On ? '1' : '0',
           light2On ? '1' : '0',
           light3On ? '1' : '0',
           fanOn ? (fanAuto ? "AUT" : "ON ") : "OFF");
  oledPrintLine(6, line);
  oledPrintLine(7, "");
}

// ---------------------------------------------------------------------------
// setup / loop
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  bootMs = millis();
  snprintf(topicPrefix, sizeof(topicPrefix), "smarthome/%s", HOME_ID);

  // Khoi phuc che do AUTO/MANUAL va nguong cam bien tu bo nho Flash NVS cua ESP32
  // Giup mach chay doc lap 100% khi cam sac du phong ma khong can bat may tinh/Web!
  prefs.begin("smarthome", false);
  fanAuto = prefs.getBool("fanAuto", false);
  motionAutoLight = prefs.getBool("pirLight", true);
  cfgTempHigh = prefs.getFloat("tHigh", TEMP_THRESHOLD_HIGH);
  cfgTempLow = prefs.getFloat("tLow", TEMP_THRESHOLD_LOW);
  cfgSmokeAdc = prefs.getInt("smokeAdc", SMOKE_THRESHOLD_ADC);

  pinMode(PIN_LED1, OUTPUT);
  pinMode(PIN_LED2, OUTPUT);
  pinMode(PIN_LED3, OUTPUT);
  pinMode(PIN_FAN, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_BTN_BEDROOM, INPUT_PULLUP);
  pinMode(PIN_BTN_LIGHT, INPUT_PULLUP);
  pinMode(PIN_DOOR_SENSOR, INPUT_PULLUP);
  pinMode(PIN_FLAME, INPUT_PULLUP);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_MQ2, ADC_11db);

  oledInit(PIN_OLED_SDA, PIN_OLED_SCL);

  // Trang thai an toan khi khoi dong: den tat, quat tat, cua DONG (khong thuc thi lenh cu)
  applyOutputs();
  doorServo.setPeriodHertz(50);
  doorServo.attach(PIN_SERVO, 500, 2400);
  setDoor(false, DOOR_ANGLE_CLOSED);

  dht.begin();

  // Khoi tao san moc thoi gian 2026 cho RTC noi de TLS xac thuc chung chi NGAY LAP TUC (0ms)
  // ma khong phai doi 15-25 giay dong bo NTP moi duoc ket noi MQTT!
  struct timeval tv;
  tv.tv_sec = 1795070000L;
  tv.tv_usec = 0;
  settimeofday(&tv, nullptr);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  tWifi = millis();
  configTime(0, 0, NTP_SERVER, "time.google.com", "time.cloudflare.com");

  if (caConfigured()) {
    secureClient.setCACert(MQTT_ROOT_CA);
  }
  secureClient.setNoDelay(true);
  mqtt.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(1024);
  mqtt.setKeepAlive(15);
  mqtt.setSocketTimeout(5);

  Serial.println("[BOOT] Smart Home ESP32 firmware " FIRMWARE_VERSION);
}

void loop() {
  maintainWifi();
  maintainMqtt();
  if (mqtt.connected()) mqtt.loop();

  // An toan cuc bo + nut nhan + PIR + cua tu hoat dong ke ca khi mat mang
  handleButtons();
  readDoorMagneticSensor();
  readMotion();

  // Tu dong ngat xung PWM giup Servo SG90 dung im tuyet doi, khong bi nong va khong re re
  if (servoDetachAt != 0 && millis() >= servoDetachAt) {
    servoDetachAt = 0;
    doorServo.detach();
  }

  // Xu ly am thanh pip phan hoi mo/dong cua (hoan toan non-blocking)
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
    if (mqtt.connected()) mqtt.loop();
  }
  if (now - tMq2 >= MQ2_INTERVAL_MS) {
    tMq2 = now;
    readMq2();
    if (mqtt.connected()) mqtt.loop();
  }
  if (now - tDht >= DHT_INTERVAL_MS) {
    tDht = now;
    readDht();
    if (mqtt.connected()) mqtt.loop();
  }
  if (now - tStatus >= STATUS_INTERVAL_MS) {
    tStatus = now;
    if (mqtt.connected()) publishStatus(true);
  }
}
