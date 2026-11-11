import crypto from 'crypto';
import { env } from '../config/env';
import {
  ActivityLogRecord,
  CommandRecord,
  DesiredState,
  DeviceId,
  DeviceRecord,
  MqttCommandPayload,
  MqttStateAckPayload,
} from '../types/smarthome';
import { FirebaseService, firebaseService } from './firebaseService';

export type MqttPublishCommandFn = (
  topic: string,
  payload: MqttCommandPayload,
  options: { qos: 1; retain: false }
) => Promise<void>;

export class CommandService {
  private pendingTimers = new Map<string, NodeJS.Timeout>();
  private processedStateAckIds = new Set<string>();
  private maxProcessedCacheSize = 200;
  private publishFn: MqttPublishCommandFn;

  constructor(
    private readonly store: FirebaseService = firebaseService,
    publishFn?: MqttPublishCommandFn,
    private readonly defaultTimeoutMs: number = env.COMMAND_TIMEOUT_MS
  ) {
    this.publishFn =
      publishFn ??
      (async () => {
        // Mặc định nếu chưa gắn MQTT publisher sẽ không ném lỗi để hỗ trợ chạy local/test
      });
  }

  public setPublishFn(fn: MqttPublishCommandFn): void {
    this.publishFn = fn;
  }

  public clearAllTimers(): void {
    for (const timer of this.pendingTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();
    this.processedStateAckIds.clear();
  }

  public async sendDeviceCommand(params: {
    homeId: string;
    deviceId: DeviceId;
    desiredState: DesiredState;
    requestedBy: string;
    timeoutMs?: number;
  }): Promise<{ command: CommandRecord; device: DeviceRecord }> {
    const { homeId, deviceId, desiredState, requestedBy } = params;
    const timeoutMs = params.timeoutMs ?? this.defaultTimeoutMs;
    const existingDevice = await this.store.getDevice(homeId, deviceId);

    if (!existingDevice) {
      throw new Error(`Không tìm thấy thiết bị '${deviceId}' trong nhà '${homeId}'.`);
    }

    const now = Date.now();
    const requestId = `req_${crypto.randomUUID()}`;

    const commandRecord: CommandRecord = {
      requestId,
      deviceId,
      desiredState,
      status: 'PENDING',
      requestedBy,
      createdAt: now,
    };

    // 1. Lưu lệnh PENDING và cập nhật desiredState (GIỮ NGUYÊN reportedState cũ cho tới khi ESP32 phản hồi)
    await this.store.saveCommand(homeId, commandRecord);
    const updatedDevice = await this.store.saveDeviceDesiredState(
      homeId,
      deviceId,
      desiredState,
      requestId,
      now
    );

    // 2. Khởi tạo bộ đếm Timeout cho lệnh
    const timer = setTimeout(async () => {
      this.pendingTimers.delete(requestId);
      const currentCmd = await this.store.getCommand(homeId, requestId);
      if (currentCmd && currentCmd.status === 'PENDING') {
        const timeoutTs = Date.now();
        await this.store.updateCommand(homeId, requestId, {
          status: 'TIMEOUT',
          errorReason: `ESP32 không phản hồi xác nhận trong ${timeoutMs}ms`,
        });
        await this.store.saveDeviceCommandStatus(homeId, deviceId, 'TIMEOUT', timeoutTs);
      }
    }, timeoutMs);

    this.pendingTimers.set(requestId, timer);

    // 3. Publish lệnh xuống topic smarthome/{homeId}/{deviceId}/set với QoS = 1, retain = false
    const topic = `smarthome/${homeId}/${deviceId}/set`;
    const mqttPayload: MqttCommandPayload = {
      requestId,
      homeId,
      deviceId,
      desiredState: updatedDevice.desiredState,
      requestedBy,
      timestamp: now,
    };

    await this.publishFn(topic, mqttPayload, { qos: 1, retain: false });

    return {
      command: commandRecord,
      device: updatedDevice,
    };
  }

  public async handleDeviceStateAck(payload: MqttStateAckPayload): Promise<{
    deduplicated: boolean;
    device: DeviceRecord;
  }> {
    const { requestId, homeId, deviceId, reportedState, status, source, isDuplicate, timestamp } =
      payload;

    // Hủy bộ đếm timeout nếu đang chờ requestId này
    const timer = this.pendingTimers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.pendingTimers.delete(requestId);
    }

    const ackKey = `${requestId}:${deviceId}`;
    const alreadyProcessed = this.processedStateAckIds.has(ackKey) || isDuplicate;

    const commandStatus = status === 'OK' ? 'ACKED' : 'FAILED';
    const updatedDevice = await this.store.saveDeviceReportedState(
      homeId,
      deviceId,
      reportedState,
      commandStatus,
      timestamp
    );

    const existingCommand = await this.store.getCommand(homeId, requestId);
    if (existingCommand) {
      await this.store.updateCommand(homeId, requestId, {
        status: commandStatus,
        ackedAt: timestamp,
      });
    }

    // Chống ghi trùng lịch sử (activityLogs) khi QoS 1 gửi lặp lại cùng một bản tin state
    if (alreadyProcessed) {
      return { deduplicated: true, device: updatedDevice };
    }

    this.rememberProcessedAck(ackKey);

    const actionLabel = this.describeAction(deviceId, reportedState);
    const logRecord: ActivityLogRecord = {
      id: `log_${timestamp}_${requestId.slice(-6)}`,
      requestId,
      deviceId,
      action: actionLabel,
      source,
      actorUid: existingCommand?.requestedBy ?? source,
      timestamp,
    };

    await this.store.appendActivityLog(homeId, logRecord);

    return {
      deduplicated: false,
      device: updatedDevice,
    };
  }

  private rememberProcessedAck(ackKey: string): void {
    if (this.processedStateAckIds.size >= this.maxProcessedCacheSize) {
      const oldest = this.processedStateAckIds.values().next().value;
      if (oldest) {
        this.processedStateAckIds.delete(oldest);
      }
    }
    this.processedStateAckIds.add(ackKey);
  }

  private describeAction(
    deviceId: DeviceId,
    reportedState: MqttStateAckPayload['reportedState']
  ): string {
    if (deviceId === 'door1') {
      return reportedState.doorState === 'OPEN' ? 'OPEN_DOOR' : 'CLOSE_DOOR';
    }
    if (deviceId === 'fan1') {
      const modeSuffix = reportedState.mode ? `_${reportedState.mode}` : '';
      return `FAN_${reportedState.power ?? 'OFF'}${modeSuffix}`;
    }
    return reportedState.power === 'ON' ? 'TURN_ON' : 'TURN_OFF';
  }
}

export const commandService = new CommandService();
