import { z } from 'zod';
import { DesiredState, DeviceId, PowerState } from '../types/smarthome';

export const deviceIdSchema = z.enum(['light1', 'light2', 'fan1', 'door1']);
export const powerStateSchema = z.enum(['ON', 'OFF']);
export const systemModeSchema = z.enum(['MANUAL', 'AUTO']);
export const doorStateSchema = z.enum(['OPEN', 'CLOSED']);
export const roomIdSchema = z.enum(['living_room', 'bedroom', 'kitchen']);
export const commandSourceSchema = z.enum([
  'REMOTE_COMMAND',
  'PHYSICAL_BUTTON',
  'AUTO_RULE',
  'BOOT_SYNC',
]);

export const lightDesiredStateSchema = z
  .object({
    power: powerStateSchema,
    mode: systemModeSchema.optional(),
  })
  .strict();

export const fanDesiredStateSchema = z
  .object({
    power: powerStateSchema.optional(),
    mode: systemModeSchema.optional(),
  })
  .strict()
  .refine((val) => val.power !== undefined || val.mode !== undefined, {
    message: 'Lệnh điều khiển quạt (fan1) phải có ít nhất một trường power hoặc mode.',
  });

export const doorDesiredStateSchema = z
  .object({
    doorState: doorStateSchema,
    targetAngle: z.number().int().min(0).max(180).optional(),
  })
  .strict()
  .transform((val) => ({
    doorState: val.doorState,
    targetAngle: val.targetAngle ?? (val.doorState === 'OPEN' ? 90 : 0),
  }));

export const commandBodySchema = z.object({
  desiredState: z.record(z.unknown()),
});

export function validateDeviceDesiredState(
  deviceId: DeviceId,
  rawDesiredState: unknown
): DesiredState {
  switch (deviceId) {
    case 'light1':
    case 'light2':
      return lightDesiredStateSchema.parse(rawDesiredState);
    case 'fan1':
      return fanDesiredStateSchema.parse(rawDesiredState);
    case 'door1':
      return doorDesiredStateSchema.parse(rawDesiredState);
  }
}

export const registerNotificationTokenSchema = z.object({
  token: z.string().min(10, 'Push token không hợp lệ'),
  platform: z.enum(['android', 'ios', 'web']),
  deviceKey: z.string().min(1).max(120).default('default_device'),
});

export const systemModeUpdateSchema = z.object({
  systemMode: systemModeSchema,
  autoConfig: z
    .object({
      tempThresholdHigh: z.number().min(20).max(50).optional(),
      tempThresholdLow: z.number().min(15).max(48).optional(),
      smokeThresholdAdc: z.number().int().min(300).max(4095).optional(),
      motionAutoLight: z.boolean().optional(),
    })
    .optional(),
});

export const mqttStateAckSchema = z.object({
  requestId: z.string().min(1),
  homeId: z.string().min(1),
  deviceId: deviceIdSchema,
  reportedState: z.object({
    power: powerStateSchema.optional(),
    mode: systemModeSchema.optional(),
    doorState: doorStateSchema.optional(),
    currentAngle: z.number().min(0).max(180).optional(),
    positionVerified: z.boolean().optional(),
  }),
  status: z.enum(['OK', 'ERROR']).default('OK'),
  source: commandSourceSchema.default('REMOTE_COMMAND'),
  isDuplicate: z.boolean().default(false),
  timestamp: z.number().nonnegative(),
});

export const mqttTemperatureSchema = z.object({
  homeId: z.string().min(1),
  sensorId: z.string().default('dht22_temp'),
  type: z.literal('temperature'),
  value: z.number().min(-40).max(85),
  unit: z.literal('C').default('C'),
  roomId: roomIdSchema.default('living_room'),
  status: z.enum(['OK', 'ERROR']).default('OK'),
  timestamp: z.number().nonnegative(),
});

export const mqttHumiditySchema = z.object({
  homeId: z.string().min(1),
  sensorId: z.string().default('dht22_hum'),
  type: z.literal('humidity'),
  value: z.number().min(0).max(100),
  unit: z.literal('%').default('%'),
  roomId: roomIdSchema.default('living_room'),
  status: z.enum(['OK', 'ERROR']).default('OK'),
  timestamp: z.number().nonnegative(),
});

export const mqttMotionSchema = z.object({
  homeId: z.string().min(1),
  sensorId: z.string().default('pir_living'),
  type: z.literal('motion'),
  motionDetected: z.boolean(),
  roomId: roomIdSchema.default('living_room'),
  timestamp: z.number().nonnegative(),
});

export const mqttSmokeSchema = z.object({
  homeId: z.string().min(1),
  sensorId: z.string().default('mq2_kitchen'),
  type: z.literal('smoke'),
  rawAdc: z.number().int().min(0).max(4095),
  smokeLevelPercent: z.number().min(0).max(100),
  thresholdAdc: z.number().int().min(0).max(4095).default(2200),
  isWarmedUp: z.boolean().default(true),
  abnormal: z.boolean(),
  roomId: roomIdSchema.default('kitchen'),
  timestamp: z.number().nonnegative(),
});

export const mqttAlertSchema = z.object({
  alertId: z.string().min(1),
  homeId: z.string().min(1),
  type: z.enum(['SMOKE_DETECTED', 'MOTION_DETECTED', 'SENSOR_ERROR', 'DEVICE_OFFLINE']),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  deviceId: z.string().optional(),
  roomId: roomIdSchema.default('kitchen'),
  message: z.string().min(1),
  buzzerTriggered: z.boolean().optional(),
  autoFanTriggered: z.boolean().optional(),
  timestamp: z.number().nonnegative(),
});

export const mqttEsp32StatusSchema = z.object({
  homeId: z.string().min(1),
  deviceId: z.string().default('esp32_main'),
  online: z.boolean(),
  systemMode: systemModeSchema.optional(),
  tempThresholdHigh: z.number().optional(),
  tempThresholdLow: z.number().optional(),
  smokeThresholdAdc: z.number().optional(),
  rssi: z.number().optional(),
  uptimeSeconds: z.number().optional(),
  firmwareVersion: z.string().optional(),
  reason: z.string().optional(),
  timestamp: z.number().nonnegative(),
});

/**
 * Logic Hysteresis cho Quạt tự động theo nhiệt độ (Chế độ AUTO):
 * - Nếu nhiệt độ >= tempThresholdHigh (mặc định 31.0°C) -> Bật quạt ('ON')
 * - Nếu nhiệt độ <= tempThresholdLow (mặc định 29.5°C) -> Tắt quạt ('OFF')
 * - Nếu nằm trong khoảng (29.5°C, 31.0°C) -> Giữ nguyên trạng thái hiện tại để chống bật/tắt liên tục
 */
export function evaluateTemperatureAutoFan(
  temperatureC: number,
  currentPower: PowerState,
  tempThresholdHigh = 31.0,
  tempThresholdLow = 29.5
): PowerState {
  if (temperatureC >= tempThresholdHigh) {
    return 'ON';
  }
  if (temperatureC <= tempThresholdLow) {
    return 'OFF';
  }
  return currentPower;
}

/**
 * Kiểm tra Cooldown chống gửi thông báo đẩy (Push Notification) trùng lặp liên tục
 */
export function shouldTriggerAlertNotification(
  alertType: string,
  nowMs: number,
  lastSentByType: Map<string, number>,
  cooldownMs = 60000
): boolean {
  const lastSent = lastSentByType.get(alertType);
  if (lastSent !== undefined && nowMs - lastSent < cooldownMs) {
    return false;
  }
  lastSentByType.set(alertType, nowMs);
  return true;
}
