export type DeviceId = 'light1' | 'light2' | 'fan1' | 'door1';
export type DeviceType = 'light' | 'fan' | 'door';
export type RoomId = 'living_room' | 'bedroom' | 'kitchen';
export type PowerState = 'ON' | 'OFF';
export type SystemMode = 'MANUAL' | 'AUTO';
export type DoorState = 'OPEN' | 'CLOSED';
export type CommandStatus = 'PENDING' | 'ACKED' | 'TIMEOUT' | 'FAILED';
export type CommandSource = 'REMOTE_COMMAND' | 'PHYSICAL_BUTTON' | 'AUTO_RULE' | 'BOOT_SYNC';
export type AlertType = 'SMOKE_DETECTED' | 'MOTION_DETECTED' | 'SENSOR_ERROR' | 'DEVICE_OFFLINE';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface DesiredState {
  power?: PowerState;
  mode?: SystemMode;
  doorState?: DoorState;
  targetAngle?: number;
}

export interface ReportedState {
  power?: PowerState;
  mode?: SystemMode;
  doorState?: DoorState;
  currentAngle?: number;
  positionVerified?: boolean;
}

export interface DeviceRecord {
  id: DeviceId;
  name: string;
  type: DeviceType;
  roomId: RoomId;
  desiredState: DesiredState;
  reportedState: ReportedState;
  lastCommandStatus: CommandStatus;
  lastRequestId?: string;
  lastUpdated: number;
}

export interface RoomRecord {
  id: RoomId;
  name: string;
  icon: string;
  deviceIds: DeviceId[];
  devices?: DeviceRecord[];
}

export interface AutoConfig {
  tempThresholdHigh: number;
  tempThresholdLow: number;
  smokeThresholdAdc: number;
  motionAutoLight: boolean;
}

export interface Esp32StatusRecord {
  online: boolean;
  lastSeen: number;
  rssi: number;
  firmwareVersion: string;
  reason?: string;
}

export interface LatestSensorsRecord {
  temperature: {
    value: number;
    unit: 'C';
    roomId: RoomId;
    updatedAt: number;
  };
  humidity: {
    value: number;
    unit: '%';
    roomId: RoomId;
    updatedAt: number;
  };
  motion: {
    motionDetected: boolean;
    roomId: RoomId;
    updatedAt: number;
  };
  smoke: {
    rawAdc: number;
    smokeLevelPercent: number;
    abnormal: boolean;
    roomId: RoomId;
    updatedAt: number;
  };
}

export interface SensorReadingRecord {
  temperature: number;
  humidity: number;
  smokeRawAdc: number;
  motionDetected: boolean;
  timestamp: number;
}

export interface CommandRecord {
  requestId: string;
  deviceId: DeviceId;
  desiredState: DesiredState;
  status: CommandStatus;
  requestedBy: string;
  createdAt: number;
  ackedAt?: number;
  errorReason?: string;
}

export interface AlertRecord {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  roomId: RoomId;
  deviceId?: string;
  message: string;
  acknowledged: boolean;
  buzzerTriggered?: boolean;
  autoFanTriggered?: boolean;
  timestamp: number;
}

export interface ActivityLogRecord {
  id: string;
  requestId?: string;
  deviceId: string;
  action: string;
  source: CommandSource;
  actorUid?: string;
  timestamp: number;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'owner' | 'member';
  token: string;
}

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  Devices: { initialRoomId?: RoomId | 'ALL' } | undefined;
  RoomDetails: { roomId: RoomId };
  Sensors: undefined;
  Alerts: undefined;
  History: undefined;
  Settings: undefined;
};
