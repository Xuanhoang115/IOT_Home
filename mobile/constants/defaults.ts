import {
  ActivityLogRecord,
  AlertRecord,
  AuthUser,
  AutoConfig,
  DeviceRecord,
  Esp32StatusRecord,
  LatestSensorsRecord,
  RoomRecord,
  SensorReadingRecord,
} from '../types/smarthome';

export const SECURITY_PIN_STORAGE_KEY = 'smarthome_security_pin_v1';
export const DEFAULT_SECURITY_PIN = '2026';
export const DEFAULT_HOME_ID = 'home1';
export const MAX_LOCAL_ACTIVITY_LOGS = 50;
export const MAX_LOCAL_SENSOR_READINGS = 20;

export const DEFAULT_AUTO_CONFIG: AutoConfig = {
  tempThresholdHigh: 31.0,
  tempThresholdLow: 29.5,
  smokeThresholdAdc: 2200,
  motionAutoLight: false,
};

export const INITIAL_ROOMS: RoomRecord[] = [
  {
    id: 'living_room',
    name: 'Phòng khách',
    icon: '🛋️',
    deviceIds: ['light1', 'fan1', 'door1'],
  },
  {
    id: 'bedroom',
    name: 'Phòng ngủ',
    icon: '🛏️',
    deviceIds: ['light2'],
  },
  {
    id: 'kitchen',
    name: 'Phòng bếp',
    icon: '🍳',
    deviceIds: [],
  },
];

export function createInitialDevices(now = Date.now()): DeviceRecord[] {
  return [
    {
      id: 'light1',
      name: 'Đèn Phòng khách',
      type: 'light',
      roomId: 'living_room',
      desiredState: { power: 'OFF', mode: 'MANUAL' },
      reportedState: { power: 'OFF', mode: 'MANUAL' },
      lastCommandStatus: 'ACKED',
      lastUpdated: now,
    },
    {
      id: 'light2',
      name: 'Đèn Phòng ngủ',
      type: 'light',
      roomId: 'bedroom',
      desiredState: { power: 'OFF', mode: 'MANUAL' },
      reportedState: { power: 'OFF', mode: 'MANUAL' },
      lastCommandStatus: 'ACKED',
      lastUpdated: now,
    },
    {
      id: 'fan1',
      name: 'Quạt Thông gió',
      type: 'fan',
      roomId: 'living_room',
      desiredState: { power: 'OFF', mode: 'MANUAL' },
      reportedState: { power: 'OFF', mode: 'MANUAL' },
      lastCommandStatus: 'ACKED',
      lastUpdated: now,
    },
    {
      id: 'door1',
      name: 'Cửa Chính (Servo SG90)',
      type: 'door',
      roomId: 'living_room',
      desiredState: { doorState: 'CLOSED', targetAngle: 0 },
      reportedState: {
        doorState: 'CLOSED',
        currentAngle: 0,
        positionVerified: false,
      },
      lastCommandStatus: 'ACKED',
      lastUpdated: now,
    },
  ];
}

export function createInitialSensors(now = Date.now()): LatestSensorsRecord {
  return {
    temperature: { value: 28.6, unit: 'C', roomId: 'living_room', updatedAt: now },
    humidity: { value: 65.2, unit: '%', roomId: 'living_room', updatedAt: now },
    motion: { motionDetected: false, roomId: 'living_room', updatedAt: now },
    smoke: {
      rawAdc: 960,
      smokeLevelPercent: 23.4,
      abnormal: false,
      roomId: 'kitchen',
      updatedAt: now,
    },
  };
}

export function createInitialEsp32Status(now = Date.now()): Esp32StatusRecord {
  return {
    online: false,
    lastSeen: now,
    rssi: -56,
    firmwareVersion: '1.0.0',
  };
}

export function createInitialSensorReadings(now = Date.now()): SensorReadingRecord[] {
  return [
    {
      temperature: 28.6,
      humidity: 65.2,
      smokeRawAdc: 960,
      motionDetected: false,
      timestamp: now - 120000,
    },
  ];
}

export function createInitialAlerts(now = Date.now()): AlertRecord[] {
  return [
    {
      id: 'alt_seed_mq2_demo',
      type: 'SMOKE_DETECTED',
      severity: 'CRITICAL',
      roomId: 'kitchen',
      deviceId: 'mq2_kitchen',
      message:
        'Bản ghi mẫu: Phát hiện nồng độ khói/khí vượt ngưỡng tại Phòng bếp (ADC: 2480/2200).',
      acknowledged: true,
      buzzerTriggered: true,
      autoFanTriggered: true,
      timestamp: now - 3600000,
    },
  ];
}

export function createInitialActivityLogs(now = Date.now()): ActivityLogRecord[] {
  return [
    {
      id: 'log_init_001',
      deviceId: 'esp32_main',
      action: 'BOOT_SYNC_OK',
      source: 'BOOT_SYNC',
      actorUid: 'system',
      timestamp: now - 600000,
    },
  ];
}

export const DEMO_ACCOUNTS: Record<string, AuthUser & { password: string }> = {
  'student1@smarthome.edu.vn': {
    uid: 'uid_student_01',
    email: 'student1@smarthome.edu.vn',
    displayName: 'Nguyễn Văn A (TV1 - Owner)',
    role: 'owner',
    token: 'dev-token:uid_student_01',
    password: '123456',
  },
  admin: {
    uid: 'uid_student_01',
    email: 'student1@smarthome.edu.vn',
    displayName: 'Nguyễn Văn A (TV1 - Owner)',
    role: 'owner',
    token: 'dev-token:uid_student_01',
    password: '123456',
  },
  'student2@smarthome.edu.vn': {
    uid: 'uid_student_02',
    email: 'student2@smarthome.edu.vn',
    displayName: 'Trần Thị B (TV2 - Member)',
    role: 'member',
    token: 'dev-token:uid_student_02',
    password: '123456',
  },
};
