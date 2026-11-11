import mqtt, { MqttClient } from 'mqtt';
import { env, isHiveMqConfigured } from '../config/env';
import {
  mqttAlertSchema,
  mqttEsp32StatusSchema,
  mqttHumiditySchema,
  mqttMotionSchema,
  mqttSmokeSchema,
  mqttStateAckSchema,
  mqttTemperatureSchema,
} from '../schemas/validation';
import { CommandService, commandService } from '../services/commandService';
import { SensorAndAlertService, sensorAndAlertService } from '../services/sensorAndAlertService';
import { MqttCommandPayload } from '../types/smarthome';

export class MqttBridgeService {
  private client: MqttClient | null = null;
  private connected = false;

  constructor(
    private readonly cmdSvc: CommandService = commandService,
    private readonly sensorAlertSvc: SensorAndAlertService = sensorAndAlertService,
    private readonly homeId: string = env.HOME_ID
  ) {
    this.cmdSvc.setPublishFn(this.publishCommand.bind(this));
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public start(): void {
    if (!isHiveMqConfigured(env)) {
      console.log(
        '[MQTT Bridge] Chưa cấu hình thông tin HiveMQ Cloud thật trong backend/.env -> Đang chạy ở chế độ Local/Simulator Ready.'
      );
      return;
    }

    const brokerUrl = `${env.HIVEMQ_PROTOCOL}://${env.HIVEMQ_HOST}:${env.HIVEMQ_PORT}`;
    const clientId = `${env.HIVEMQ_CLIENT_ID_PREFIX}-${Math.random().toString(16).slice(2, 8)}`;

    this.client = mqtt.connect(brokerUrl, {
      clientId,
      username: env.HIVEMQ_USERNAME,
      password: env.HIVEMQ_PASSWORD,
      clean: true,
      keepalive: 30,
      reconnectPeriod: 5000,
      rejectUnauthorized: true,
    });

    this.client.on('connect', () => {
      this.connected = true;
      console.log(`[MQTT Bridge] Đã kết nối TLS tới HiveMQ Cloud (${brokerUrl}) với ID: ${clientId}`);
      this.subscribeAllTopics();
    });

    this.client.on('reconnect', () => {
      console.log('[MQTT Bridge] Đang tự động kết nối lại tới HiveMQ Cloud...');
    });

    this.client.on('close', () => {
      this.connected = false;
    });

    this.client.on('error', (err) => {
      console.error('[MQTT Bridge] Lỗi kết nối MQTT:', err.message);
    });

    this.client.on('message', (topic, messageBuffer) => {
      this.routeIncomingMessage(topic, messageBuffer.toString()).catch((err) => {
        console.error(`[MQTT Bridge] Lỗi xử lý bản tin trên topic ${topic}:`, err);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client) {
        this.connected = false;
        resolve();
        return;
      }
      this.client.end(true, {}, () => {
        this.connected = false;
        this.client = null;
        resolve();
      });
    });
  }

  private subscribeAllTopics(): void {
    if (!this.client) return;

    const topics = [
      `smarthome/${this.homeId}/+/state`,
      `smarthome/${this.homeId}/sensors/#`,
      `smarthome/${this.homeId}/alerts`,
      `smarthome/${this.homeId}/esp32/status`,
    ];

    this.client.subscribe(topics, { qos: 1 }, (err) => {
      if (err) {
        console.error('[MQTT Bridge] Lỗi khi subscribe topics:', err.message);
      } else {
        console.log(`[MQTT Bridge] Đã subscribe các nhánh của nhà '${this.homeId}' (QoS 1)`);
      }
    });
  }

  /**
   * Publish lệnh điều khiển tới ESP32.
   * BẮT BUỘC: retain = false và qos = 1 cho mọi topic .../set theo đặc tả an toàn.
   */
  public async publishCommand(
    topic: string,
    payload: MqttCommandPayload,
    options: { qos: 1; retain: false } = { qos: 1, retain: false }
  ): Promise<void> {
    if (!topic.endsWith('/set')) {
      throw new Error(`Topic điều khiển không hợp lệ: ${topic}`);
    }

    const safeOptions = { qos: 1 as const, retain: false };
    const messageStr = JSON.stringify(payload);

    if (!this.client || !this.connected) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.client!.publish(topic, messageStr, safeOptions || options, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async routeIncomingMessage(topic: string, rawMessage: string): Promise<void> {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawMessage);
    } catch {
      console.warn(`[MQTT Bridge] Bỏ qua bản tin không phải JSON hợp lệ trên topic ${topic}`);
      return;
    }

    const stateTopicRegex = new RegExp(`^smarthome/${this.homeId}/(light1|light2|fan1|door1)/state$`);
    if (stateTopicRegex.test(topic)) {
      const validated = mqttStateAckSchema.parse(parsedJson);
      await this.cmdSvc.handleDeviceStateAck(validated);
      return;
    }

    if (topic === `smarthome/${this.homeId}/sensors/temperature`) {
      const validated = mqttTemperatureSchema.parse(parsedJson);
      await this.sensorAlertSvc.handleTemperature(validated);
      return;
    }

    if (topic === `smarthome/${this.homeId}/sensors/humidity`) {
      const validated = mqttHumiditySchema.parse(parsedJson);
      await this.sensorAlertSvc.handleHumidity(validated);
      return;
    }

    if (topic === `smarthome/${this.homeId}/sensors/motion`) {
      const validated = mqttMotionSchema.parse(parsedJson);
      await this.sensorAlertSvc.handleMotion(validated);
      return;
    }

    if (topic === `smarthome/${this.homeId}/sensors/smoke`) {
      const validated = mqttSmokeSchema.parse(parsedJson);
      await this.sensorAlertSvc.handleSmoke(validated);
      return;
    }

    if (topic === `smarthome/${this.homeId}/alerts`) {
      const validated = mqttAlertSchema.parse(parsedJson);
      await this.sensorAlertSvc.handleAlert(validated);
      return;
    }

    if (topic === `smarthome/${this.homeId}/esp32/status`) {
      const validated = mqttEsp32StatusSchema.parse(parsedJson);
      await this.sensorAlertSvc.handleEsp32Status(validated);
      return;
    }
  }
}

export const mqttBridgeService = new MqttBridgeService();
