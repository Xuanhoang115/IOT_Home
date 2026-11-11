import { z } from 'zod';
import { env } from '../config/env';
import {
  mqttAlertSchema,
  mqttEsp32StatusSchema,
  mqttHumiditySchema,
  mqttMotionSchema,
  mqttSmokeSchema,
  mqttTemperatureSchema,
  shouldTriggerAlertNotification,
} from '../schemas/validation';
import { AlertRecord, LatestSensorsRecord } from '../types/smarthome';
import { FirebaseService, firebaseService } from './firebaseService';

export class SensorAndAlertService {
  private lastSensorHistorySavedAt = new Map<string, number>();
  private lastAlertNotificationByType = new Map<string, number>();

  constructor(
    private readonly store: FirebaseService = firebaseService,
    private readonly sensorLogIntervalMs: number = env.SENSOR_LOG_INTERVAL_MS,
    private readonly alertCooldownMs: number = env.ALERT_COOLDOWN_MS
  ) {}

  public resetState(): void {
    this.lastSensorHistorySavedAt.clear();
    this.lastAlertNotificationByType.clear();
  }

  public async handleTemperature(
    payload: z.infer<typeof mqttTemperatureSchema>
  ): Promise<LatestSensorsRecord> {
    const updated = await this.store.updateLatestSensor(payload.homeId, 'temperature', {
      value: payload.value,
      unit: 'C',
      roomId: payload.roomId,
      updatedAt: payload.timestamp,
    });
    await this.maybeAppendHistoricalSnapshot(payload.homeId, updated, payload.timestamp, false);
    return updated;
  }

  public async handleHumidity(
    payload: z.infer<typeof mqttHumiditySchema>
  ): Promise<LatestSensorsRecord> {
    const updated = await this.store.updateLatestSensor(payload.homeId, 'humidity', {
      value: payload.value,
      unit: '%',
      roomId: payload.roomId,
      updatedAt: payload.timestamp,
    });
    await this.maybeAppendHistoricalSnapshot(payload.homeId, updated, payload.timestamp, false);
    return updated;
  }

  public async handleMotion(
    payload: z.infer<typeof mqttMotionSchema>
  ): Promise<LatestSensorsRecord> {
    const updated = await this.store.updateLatestSensor(payload.homeId, 'motion', {
      motionDetected: payload.motionDetected,
      roomId: payload.roomId,
      updatedAt: payload.timestamp,
    });
    await this.maybeAppendHistoricalSnapshot(
      payload.homeId,
      updated,
      payload.timestamp,
      payload.motionDetected
    );
    return updated;
  }

  public async handleSmoke(payload: z.infer<typeof mqttSmokeSchema>): Promise<LatestSensorsRecord> {
    const updated = await this.store.updateLatestSensor(payload.homeId, 'smoke', {
      rawAdc: payload.rawAdc,
      smokeLevelPercent: payload.smokeLevelPercent,
      abnormal: payload.abnormal,
      roomId: payload.roomId,
      updatedAt: payload.timestamp,
    });
    await this.maybeAppendHistoricalSnapshot(
      payload.homeId,
      updated,
      payload.timestamp,
      payload.abnormal
    );
    return updated;
  }

  public async handleAlert(
    payload: z.infer<typeof mqttAlertSchema>
  ): Promise<{ alert: AlertRecord; pushDispatched: boolean }> {
    const alertRecord: AlertRecord = {
      id: payload.alertId,
      type: payload.type,
      severity: payload.severity,
      roomId: payload.roomId,
      deviceId: payload.deviceId,
      message: payload.message,
      acknowledged: false,
      buzzerTriggered: payload.buzzerTriggered,
      autoFanTriggered: payload.autoFanTriggered,
      timestamp: payload.timestamp,
    };

    await this.store.saveAlert(payload.homeId, alertRecord);

    const cooldownKey = `${payload.homeId}:${payload.type}`;
    const shouldPush = shouldTriggerAlertNotification(
      cooldownKey,
      payload.timestamp,
      this.lastAlertNotificationByType,
      this.alertCooldownMs
    );

    if (shouldPush) {
      const title =
        payload.severity === 'CRITICAL'
          ? 'CẢNH BÁO KHẨN CẤP - SMART HOME'
          : 'Thông báo An ninh - Smart Home';
      await this.store.sendPushNotification(payload.homeId, title, payload.message, {
        alertId: payload.alertId,
        type: payload.type,
        severity: payload.severity,
        roomId: payload.roomId,
        targetScreen: 'Alerts',
      });
    }

    return {
      alert: alertRecord,
      pushDispatched: shouldPush,
    };
  }

  public async handleEsp32Status(
    payload: z.infer<typeof mqttEsp32StatusSchema>
  ): Promise<void> {
    const now = payload.timestamp > 0 ? payload.timestamp : Date.now();
    await this.store.updateEsp32Status(payload.homeId, {
      online: payload.online,
      lastSeen: now,
      ...(payload.rssi !== undefined ? { rssi: payload.rssi } : {}),
      ...(payload.firmwareVersion !== undefined
        ? { firmwareVersion: payload.firmwareVersion }
        : {}),
      ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
    });

    if (payload.systemMode) {
      await this.store.updateHomeMode(payload.homeId, payload.systemMode, {
        ...(payload.tempThresholdHigh !== undefined
          ? { tempThresholdHigh: payload.tempThresholdHigh }
          : {}),
        ...(payload.tempThresholdLow !== undefined
          ? { tempThresholdLow: payload.tempThresholdLow }
          : {}),
        ...(payload.smokeThresholdAdc !== undefined
          ? { smokeThresholdAdc: payload.smokeThresholdAdc }
          : {}),
      });
    }
  }

  private async maybeAppendHistoricalSnapshot(
    homeId: string,
    latest: LatestSensorsRecord,
    timestamp: number,
    forceWrite: boolean
  ): Promise<void> {
    const lastSaved = this.lastSensorHistorySavedAt.get(homeId) ?? 0;
    if (!forceWrite && timestamp - lastSaved < this.sensorLogIntervalMs) {
      return;
    }

    this.lastSensorHistorySavedAt.set(homeId, timestamp);
    await this.store.appendSensorReading(homeId, `sr_${timestamp}`, {
      temperature: latest.temperature.value,
      humidity: latest.humidity.value,
      smokeRawAdc: latest.smoke.rawAdc,
      motionDetected: latest.motion.motionDetected,
      timestamp,
    });
  }
}

export const sensorAndAlertService = new SensorAndAlertService();
