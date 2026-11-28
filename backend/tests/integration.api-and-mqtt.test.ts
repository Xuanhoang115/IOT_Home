import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Esp32SimulatorCore } from '../simulator/esp32-simulator';
import { createApp } from '../src/app';
import { MqttBridgeService } from '../src/mqtt/mqttClient';
import { CommandService } from '../src/services/commandService';
import { FirebaseService } from '../src/services/firebaseService';
import { SensorAndAlertService } from '../src/services/sensorAndAlertService';
import { MqttCommandPayload } from '../src/types/smarthome';

describe('Integration Tests - Backend REST API, Auth, MQTT Bridge & Simulator E2E', () => {
  let store: FirebaseService;
  let cmdSvc: CommandService;
  let sensorAlertSvc: SensorAndAlertService;
  let mqttSvc: MqttBridgeService;
  let simCore: Esp32SimulatorCore;
  let publishedMessages: Array<{
    topic: string;
    payload: MqttCommandPayload;
    options: { qos: 1; retain: false };
  }>;

  const MEMBER_TOKEN = 'Bearer dev-token:uid_student_01';
  const OUTSIDER_TOKEN = 'Bearer dev-token:uid_outsider';

  beforeEach(() => {
    store = new FirebaseService(true);
    store.resetMemoryStore('home1');

    publishedMessages = [];
    simCore = new Esp32SimulatorCore('home1');

    cmdSvc = new CommandService(store, undefined, 150);
    sensorAlertSvc = new SensorAndAlertService(store, 60000, 60000);
    mqttSvc = new MqttBridgeService(cmdSvc, sensorAlertSvc, 'home1');

    cmdSvc.setPublishFn(async (topic, payload, options) => {
      publishedMessages.push({ topic, payload, options });
    });
  });

  afterEach(() => {
    cmdSvc.clearAllTimers();
  });

  it('GET /api/health trả về trạng thái hệ thống mà không cần token', async () => {
    const app = createApp({ store, cmdSvc, mqttSvc });
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.homeId).toBe('home1');
    expect(res.body.data.storageMode).toBe('in-memory');
  });

  it('Auth Middleware chặn 401 khi thiếu token và 403 khi user không có quyền truy cập home1', async () => {
    const app = createApp({ store, cmdSvc, mqttSvc });

    const noTokenRes = await request(app).get('/api/devices');
    expect(noTokenRes.status).toBe(401);
    expect(noTokenRes.body.error.code).toBe('UNAUTHORIZED');

    const badTokenRes = await request(app)
      .get('/api/devices')
      .set('Authorization', 'Bearer token_khong_ton_tai');
    expect(badTokenRes.status).toBe(401);

    const outsiderRes = await request(app)
      .get('/api/devices')
      .set('Authorization', OUTSIDER_TOKEN);
    expect(outsiderRes.status).toBe(403);
    expect(outsiderRes.body.error.code).toBe('FORBIDDEN_HOME_ACCESS');
  });

  it('GET /api/rooms và GET /api/devices trả về danh sách phòng & 5 thiết bị chuẩn của home1', async () => {
    const app = createApp({ store, cmdSvc, mqttSvc });

    const roomsRes = await request(app).get('/api/rooms').set('Authorization', MEMBER_TOKEN);
    expect(roomsRes.status).toBe(200);
    expect(roomsRes.body.data).toHaveLength(3);

    const devicesRes = await request(app).get('/api/devices').set('Authorization', MEMBER_TOKEN);
    expect(devicesRes.status).toBe(200);
    expect(devicesRes.body.data.map((d: { id: string }) => d.id).sort()).toEqual([
      'door1',
      'fan1',
      'light1',
      'light2',
      'light3',
    ]);
  });

  it('Luồng điều khiển End-to-End: POST /api/devices/light1/commands -> PENDING -> ESP32 ACK -> ACKED + History', async () => {
    const app = createApp({ store, cmdSvc, mqttSvc });

    // Bước 1: Mobile App gửi lệnh bật đèn light1
    const cmdRes = await request(app)
      .post('/api/devices/light1/commands')
      .set('Authorization', MEMBER_TOKEN)
      .send({
        desiredState: { power: 'ON', mode: 'MANUAL' },
      });

    expect(cmdRes.status).toBe(202);
    expect(cmdRes.body.data.status).toBe('PENDING');
    // desiredState đã chuyển sang ON nhưng reportedState vẫn phải giữ nguyên OFF khi chờ ESP32
    expect(cmdRes.body.data.device.desiredState.power).toBe('ON');
    expect(cmdRes.body.data.device.reportedState.power).toBe('OFF');
    expect(cmdRes.body.data.device.lastCommandStatus).toBe('PENDING');

    // Kiểm tra bản tin MQTT phát đi bắt buộc có qos = 1 và retain = false
    expect(publishedMessages).toHaveLength(1);
    const published = publishedMessages[0]!;
    expect(published.topic).toBe('smarthome/home1/light1/set');
    expect(published.options).toEqual({ qos: 1, retain: false });

    // Bước 2: ESP32 Simulator nhận lệnh và phản hồi lên smarthome/home1/light1/state
    const stateAck = simCore.processCommand(published.payload, Date.now());
    await mqttSvc.routeIncomingMessage('smarthome/home1/light1/state', JSON.stringify(stateAck));

    // Bước 3: Kiểm tra trạng thái thiết bị đã cập nhật reportedState = ON và ACKED
    const deviceAfterAck = await request(app)
      .get('/api/devices/light1')
      .set('Authorization', MEMBER_TOKEN);

    expect(deviceAfterAck.status).toBe(200);
    expect(deviceAfterAck.body.data.reportedState.power).toBe('ON');
    expect(deviceAfterAck.body.data.lastCommandStatus).toBe('ACKED');

    // Bước 4: Gửi lặp lại cùng bản tin state (giả lập QoS 1 re-delivery) -> Không bị nhân đôi lịch sử
    await mqttSvc.routeIncomingMessage('smarthome/home1/light1/state', JSON.stringify(stateAck));

    const historyRes = await request(app).get('/api/history').set('Authorization', MEMBER_TOKEN);
    expect(historyRes.status).toBe(200);
    const matchingLogs = historyRes.body.data.activityLogs.filter(
      (log: { requestId?: string }) => log.requestId === published.payload.requestId
    );
    expect(matchingLogs).toHaveLength(1);
    expect(matchingLogs[0].action).toBe('TURN_ON');
  });

  it('Xử lý Timeout khi ESP32 đang Offline không phản hồi reportedState', async () => {
    const app = createApp({ store, cmdSvc, mqttSvc });

    const cmdRes = await request(app)
      .post('/api/devices/door1/commands')
      .set('Authorization', MEMBER_TOKEN)
      .send({
        desiredState: { doorState: 'OPEN' },
      });

    expect(cmdRes.status).toBe(202);
    const requestId = cmdRes.body.data.requestId as string;

    // Chờ quá thời gian timeout (150ms trong môi trường test) mà không gửi state ACK
    await new Promise((resolve) => setTimeout(resolve, 220));

    const deviceRes = await request(app)
      .get('/api/devices/door1')
      .set('Authorization', MEMBER_TOKEN);
    expect(deviceRes.body.data.lastCommandStatus).toBe('TIMEOUT');
    expect(deviceRes.body.data.reportedState.doorState).toBe('CLOSED');

    const cmdRecord = await store.getCommand('home1', requestId);
    expect(cmdRecord?.status).toBe('TIMEOUT');
  });

  it('Đồng bộ dữ liệu cảm biến, cảnh báo khói kèm chống spam và đăng ký Push Token', async () => {
    const app = createApp({ store, cmdSvc, mqttSvc });

    // Đăng ký push token
    const tokenRes = await request(app)
      .post('/api/notifications/register-token')
      .set('Authorization', MEMBER_TOKEN)
      .send({
        token: 'ExponentPushToken[test_device_token_12345]',
        platform: 'android',
        deviceKey: 'pixel_7_test',
      });
    expect(tokenRes.status).toBe(201);

    // Giả lập ESP32 gửi nhiệt độ và cảnh báo khói qua MQTT
    await mqttSvc.routeIncomingMessage(
      'smarthome/home1/sensors/temperature',
      JSON.stringify({
        homeId: 'home1',
        sensorId: 'dht22_temp',
        type: 'temperature',
        value: 32.4,
        unit: 'C',
        status: 'OK',
        timestamp: 1762856000000,
      })
    );

    const sensorsRes = await request(app)
      .get('/api/sensors/latest')
      .set('Authorization', MEMBER_TOKEN);
    expect(sensorsRes.status).toBe(200);
    expect(sensorsRes.body.data.latest.temperature.value).toBe(32.4);

    // Gửi 2 cảnh báo khói liên tiếp cách nhau 5 giây -> Chỉ bắn Push 1 lần nhờ Cooldown 60s
    await mqttSvc.routeIncomingMessage(
      'smarthome/home1/alerts',
      JSON.stringify({
        alertId: 'alt_smoke_test_1',
        homeId: 'home1',
        type: 'SMOKE_DETECTED',
        severity: 'CRITICAL',
        roomId: 'kitchen',
        message: 'Phát hiện khói vượt ngưỡng lần 1',
        buzzerTriggered: true,
        timestamp: 1762856010000,
      })
    );
    await mqttSvc.routeIncomingMessage(
      'smarthome/home1/alerts',
      JSON.stringify({
        alertId: 'alt_smoke_test_2',
        homeId: 'home1',
        type: 'SMOKE_DETECTED',
        severity: 'CRITICAL',
        roomId: 'kitchen',
        message: 'Phát hiện khói vượt ngưỡng lần 2 (sau 5s)',
        buzzerTriggered: true,
        timestamp: 1762856015000,
      })
    );

    expect(store.getPushLogHistory()).toHaveLength(1);

    const alertsRes = await request(app).get('/api/alerts').set('Authorization', MEMBER_TOKEN);
    expect(alertsRes.status).toBe(200);
    expect(alertsRes.body.data.some((a: { id: string }) => a.id === 'alt_smoke_test_1')).toBe(true);

    // Xác nhận đã đọc cảnh báo (Acknowledge)
    const ackRes = await request(app)
      .post('/api/alerts/alt_smoke_test_1/ack')
      .set('Authorization', MEMBER_TOKEN);
    expect(ackRes.status).toBe(200);
    expect(ackRes.body.data.acknowledged).toBe(true);
  });

  it('7. Endpoint tổng hợp GET /api/snapshot trả đầy đủ 6 phần dữ liệu và throttle ghi esp32Status', async () => {
    const app = createApp({ store, cmdSvc, mqttSvc });
    const snapRes = await request(app).get('/api/snapshot').set('Authorization', MEMBER_TOKEN);
    expect(snapRes.status).toBe(200);
    expect(snapRes.body.data.health.status).toBe('ok');
    expect(Array.isArray(snapRes.body.data.rooms)).toBe(true);
    expect(Array.isArray(snapRes.body.data.devices)).toBe(true);
    expect(snapRes.body.data.sensors.latest).toBeTruthy();
    expect(Array.isArray(snapRes.body.data.alerts)).toBe(true);
    expect(Array.isArray(snapRes.body.data.history.activityLogs)).toBe(true);

    // Gửi 20 heartbeat giữ nguyên online=true trong cùng 1 giây -> chỉ flush DB 1 lần, bỏ qua 19 lần lặp
    for (let i = 0; i < 20; i++) {
      await store.updateEsp32Status('home1', { online: true, rssi: -55, lastSeen: Date.now() });
    }
    const stats = store.getPerfStats();
    expect(stats.esp32StatusDbWrites).toBe(1);
    expect(stats.esp32StatusDbWritesSkipped).toBe(19);
  });
});
