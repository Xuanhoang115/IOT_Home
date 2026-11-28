import path from 'path';
import dotenv from 'dotenv';
import mqtt, { MqttClient } from 'mqtt';
import { isHiveMqConfigured, env } from '../src/config/env';
import { evaluateTemperatureAutoFan } from '../src/schemas/validation';
import {
  CommandSource,
  DeviceId,
  MqttCommandPayload,
  MqttStateAckPayload,
  ReportedState,
  SystemMode,
} from '../src/types/smarthome';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export interface SimulatedHardwareState {
  systemMode: SystemMode;
  tempThresholdHigh: number;
  tempThresholdLow: number;
  smokeThresholdAdc: number;
  devices: Record<DeviceId, ReportedState>;
  sensors: {
    temperature: number;
    humidity: number;
    motionDetected: boolean;
    smokeRawAdc: number;
  };
}

/**
 * Core logic của mạch ESP32 được mô phỏng chính xác:
 * - Ring buffer 16 requestId gần nhất để chống thực thi lặp lệnh khi MQTT QoS 1 gửi trùng.
 * - Tách bạch desiredState (lệnh nhận) và reportedState (trạng thái phần cứng sau khi kích GPIO).
 * - Cửa Servo SG90 (door1) luôn kèm positionVerified: false.
 * - Hỗ trợ chế độ AUTO bật/tắt quạt có Hysteresis theo nhiệt độ và tự bật quạt + còi khi khói vượt ngưỡng.
 */
export class Esp32SimulatorCore {
  private readonly ringBufferSize = 16;
  private executedRequestIds: string[] = [];
  public state: SimulatedHardwareState;

  constructor(public readonly homeId = 'home1') {
    this.state = {
      systemMode: 'MANUAL',
      tempThresholdHigh: 31.0,
      tempThresholdLow: 29.5,
      smokeThresholdAdc: 2200,
      devices: {
        light1: { power: 'OFF', mode: 'MANUAL' },
        light2: { power: 'OFF', mode: 'MANUAL' },
        light3: { power: 'OFF', mode: 'MANUAL' },
        fan1: { power: 'OFF', mode: 'MANUAL' },
        door1: { doorState: 'CLOSED', currentAngle: 0, positionVerified: false },
      },
      sensors: {
        temperature: 28.5,
        humidity: 65.0,
        motionDetected: false,
        smokeRawAdc: 950,
      },
    };
  }

  public hasExecutedRequestId(requestId: string): boolean {
    return this.executedRequestIds.includes(requestId);
  }

  private recordRequestId(requestId: string): void {
    if (this.executedRequestIds.length >= this.ringBufferSize) {
      this.executedRequestIds.shift();
    }
    this.executedRequestIds.push(requestId);
  }

  /**
   * Xử lý bản tin từ topic smarthome/{homeId}/{deviceId}/set
   * Trả về payload xác nhận để publish lên smarthome/{homeId}/{deviceId}/state
   */
  public processCommand(
    command: MqttCommandPayload,
    now = Date.now()
  ): MqttStateAckPayload {
    const { requestId, deviceId, desiredState } = command;
    const isDuplicate = this.hasExecutedRequestId(requestId);

    if (!isDuplicate) {
      this.recordRequestId(requestId);
      const current = this.state.devices[deviceId];

      if (deviceId === 'light1' || deviceId === 'light2' || deviceId === 'light3') {
        this.state.devices[deviceId] = {
          power: desiredState.power ?? current.power ?? 'OFF',
          mode: desiredState.mode ?? current.mode ?? 'MANUAL',
        };
      } else if (deviceId === 'fan1') {
        const nextMode = desiredState.mode ?? current.mode ?? 'MANUAL';
        this.state.systemMode = nextMode;
        this.state.devices.fan1 = {
          power: desiredState.power ?? current.power ?? 'OFF',
          mode: nextMode,
        };
      } else if (deviceId === 'door1') {
        const nextDoorState = desiredState.doorState ?? current.doorState ?? 'CLOSED';
        const nextAngle =
          desiredState.targetAngle ?? (nextDoorState === 'OPEN' ? 90 : 0);
        this.state.devices.door1 = {
          doorState: nextDoorState,
          currentAngle: nextAngle,
          positionVerified: false,
        };
      }
    }

    return {
      requestId,
      homeId: this.homeId,
      deviceId,
      reportedState: { ...this.state.devices[deviceId] },
      status: 'OK',
      source: 'REMOTE_COMMAND',
      isDuplicate,
      timestamp: now,
    };
  }

  /**
   * Mô phỏng nhấn nút vật lý tại mô hình (có debounce ở tầng phần cứng)
   */
  public simulatePhysicalButtonToggle(
    deviceId: DeviceId,
    now = Date.now()
  ): MqttStateAckPayload {
    const requestId = `btn_phys_${now}`;
    const current = this.state.devices[deviceId];

    if (deviceId === 'door1') {
      const nextDoorState = current.doorState === 'OPEN' ? 'CLOSED' : 'OPEN';
      this.state.devices.door1 = {
        doorState: nextDoorState,
        currentAngle: nextDoorState === 'OPEN' ? 90 : 0,
        positionVerified: false,
      };
    } else {
      const nextPower = current.power === 'ON' ? 'OFF' : 'ON';
      this.state.devices[deviceId] = {
        ...current,
        power: nextPower,
      };
    }

    const source: CommandSource = 'PHYSICAL_BUTTON';
    return {
      requestId,
      homeId: this.homeId,
      deviceId,
      reportedState: { ...this.state.devices[deviceId] },
      status: 'OK',
      source,
      isDuplicate: false,
      timestamp: now,
    };
  }

  /**
   * Đánh giá quy tắc tự động (AUTO) khi nhiệt độ thay đổi
   */
  public evaluateAutoRules(temperatureC: number, now = Date.now()): MqttStateAckPayload | null {
    this.state.sensors.temperature = temperatureC;
    const fanState = this.state.devices.fan1;
    if (fanState.mode !== 'AUTO' && this.state.systemMode !== 'AUTO') {
      return null;
    }

    const currentPower = fanState.power ?? 'OFF';
    const nextPower = evaluateTemperatureAutoFan(
      temperatureC,
      currentPower,
      this.state.tempThresholdHigh,
      this.state.tempThresholdLow
    );

    if (nextPower === currentPower) {
      return null;
    }

    this.state.devices.fan1 = {
      power: nextPower,
      mode: 'AUTO',
    };

    return {
      requestId: `auto_temp_${now}`,
      homeId: this.homeId,
      deviceId: 'fan1',
      reportedState: { ...this.state.devices.fan1 },
      status: 'OK',
      source: 'AUTO_RULE',
      isDuplicate: false,
      timestamp: now,
    };
  }
}

async function runCliSimulator(): Promise<void> {
  const homeId = env.HOME_ID || 'home1';
  const core = new Esp32SimulatorCore(homeId);

  console.log('==========================================================');
  console.log(' SMART HOME IoT 2026 - ESP32 HARDWARE & MQTT SIMULATOR');
  console.log('==========================================================');

  if (!isHiveMqConfigured(env)) {
    console.log('\n[CHẾ ĐỘ DEMO CỤC BỘ - CHƯA CẤU HÌNH HIVEMQ TRONG backend/.env]');
    console.log('Để Simulator kết nối trực tiếp lên HiveMQ Cloud (TLS :8883):');
    console.log('  1. Copy backend/.env.example thành backend/.env');
    console.log('  2. Điền HIVEMQ_HOST, HIVEMQ_USERNAME, HIVEMQ_PASSWORD thật');
    console.log('  3. Chạy lại: npm --prefix backend run simulator\n');
    console.log('Đang chạy kịch bản tự kiểm thử vòng lặp lệnh (Self-Test) ngay tại máy...');

    const sampleAck = core.processCommand({
      requestId: 'req_sim_demo_001',
      homeId,
      deviceId: 'light1',
      desiredState: { power: 'ON', mode: 'MANUAL' },
      requestedBy: 'simulator_selftest',
      timestamp: Date.now(),
    });
    console.log('[Self-Test 1] Nhận lệnh bật light1 -> Phản hồi state:', JSON.stringify(sampleAck));

    const dupAck = core.processCommand({
      requestId: 'req_sim_demo_001',
      homeId,
      deviceId: 'light1',
      desiredState: { power: 'ON', mode: 'MANUAL' },
      requestedBy: 'simulator_selftest',
      timestamp: Date.now(),
    });
    console.log('[Self-Test 2] Chống trùng requestId (isDuplicate=true):', JSON.stringify(dupAck));
    return;
  }

  const brokerUrl = `${env.HIVEMQ_PROTOCOL}://${env.HIVEMQ_HOST}:${env.HIVEMQ_PORT}`;
  const clientId = `esp32-sim-${homeId}-${Math.random().toString(16).slice(2, 6)}`;
  const statusTopic = `smarthome/${homeId}/esp32/status`;

  const lwtPayload = JSON.stringify({
    homeId,
    deviceId: 'esp32_main',
    online: false,
    reason: 'lwt_unexpected_disconnect',
    timestamp: 0,
  });

  const client: MqttClient = mqtt.connect(brokerUrl, {
    clientId,
    username: env.HIVEMQ_USERNAME,
    password: env.HIVEMQ_PASSWORD,
    clean: true,
    keepalive: 30,
    rejectUnauthorized: true,
    will: {
      topic: statusTopic,
      payload: Buffer.from(lwtPayload),
      qos: 1,
      retain: true,
    },
  });

  client.on('connect', () => {
    console.log(`[ESP32 Simulator] Đã kết nối HiveMQ Cloud TLS (${brokerUrl})`);

    // Publish trạng thái Online (retain = true)
    client.publish(
      statusTopic,
      JSON.stringify({
        homeId,
        deviceId: 'esp32_main',
        online: true,
        systemMode: core.state.systemMode,
        tempThresholdHigh: core.state.tempThresholdHigh,
        tempThresholdLow: core.state.tempThresholdLow,
        smokeThresholdAdc: core.state.smokeThresholdAdc,
        rssi: -54,
        uptimeSeconds: 10,
        firmwareVersion: '1.0.0-sim',
        timestamp: Date.now(),
      }),
      { qos: 1, retain: true }
    );

    // Subscribe các nhánh lệnh điều khiển
    client.subscribe(`smarthome/${homeId}/+/set`, { qos: 1 }, (err) => {
      if (!err) {
        console.log(`[ESP32 Simulator] Đang lắng nghe lệnh tại: smarthome/${homeId}/+/set`);
      }
    });
  });

  client.on('message', (topic, buf) => {
    try {
      const cmd = JSON.parse(buf.toString()) as MqttCommandPayload;
      console.log(`[ESP32 Simulator] Nhận lệnh trên ${topic}:`, JSON.stringify(cmd));
      const ack = core.processCommand(cmd);
      const stateTopic = `smarthome/${homeId}/${cmd.deviceId}/state`;
      client.publish(stateTopic, JSON.stringify(ack), { qos: 1, retain: true });
      console.log(`[ESP32 Simulator] Đã phản hồi reportedState lên ${stateTopic}`);
    } catch (err) {
      console.error('[ESP32 Simulator] Lỗi xử lý bản tin lệnh:', err);
    }
  });

  // Định kỳ mỗi 5 giây gửi dữ liệu cảm biến giả lập
  const telemetryTimer = setInterval(() => {
    if (!client.connected) return;
    const now = Date.now();
    const temp = Number((28.0 + Math.random() * 2.5).toFixed(1));
    const hum = Number((62.0 + Math.random() * 6.0).toFixed(1));
    const smokeAdc = Math.floor(900 + Math.random() * 250);

    client.publish(
      `smarthome/${homeId}/sensors/temperature`,
      JSON.stringify({
        homeId,
        sensorId: 'dht22_temp',
        type: 'temperature',
        value: temp,
        unit: 'C',
        status: 'OK',
        timestamp: now,
      }),
      { qos: 0, retain: true }
    );

    client.publish(
      `smarthome/${homeId}/sensors/humidity`,
      JSON.stringify({
        homeId,
        sensorId: 'dht22_hum',
        type: 'humidity',
        value: hum,
        unit: '%',
        status: 'OK',
        timestamp: now,
      }),
      { qos: 0, retain: true }
    );

    client.publish(
      `smarthome/${homeId}/sensors/smoke`,
      JSON.stringify({
        homeId,
        sensorId: 'mq2_kitchen',
        type: 'smoke',
        rawAdc: smokeAdc,
        smokeLevelPercent: Number(((smokeAdc / 4095) * 100).toFixed(1)),
        thresholdAdc: core.state.smokeThresholdAdc,
        isWarmedUp: true,
        abnormal: false,
        timestamp: now,
      }),
      { qos: 1, retain: true }
    );
  }, 5000);

  process.on('SIGINT', () => {
    clearInterval(telemetryTimer);
    client.publish(
      statusTopic,
      JSON.stringify({
        homeId,
        deviceId: 'esp32_main',
        online: false,
        reason: 'clean_shutdown',
        timestamp: Date.now(),
      }),
      { qos: 1, retain: true },
      () => {
        client.end(false, () => process.exit(0));
      }
    );
  });
}

if (require.main === module) {
  runCliSimulator().catch((err) => {
    console.error('[ESP32 Simulator Error]:', err);
    process.exit(1);
  });
}
