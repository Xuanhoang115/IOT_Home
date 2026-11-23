import {
  DEFAULT_SECURITY_PIN,
  SECURITY_PIN_STORAGE_KEY,
} from '../constants/defaults';
import {
  ActivityLogRecord,
  AlertRecord,
  AutoConfig,
  DesiredState,
  DeviceId,
  DeviceRecord,
  ReportedState,
  SystemMode,
} from '../types/smarthome';

export function readStoredSecurityPin(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(SECURITY_PIN_STORAGE_KEY);
      if (saved && /^\d{4}$/.test(saved)) return saved;
    }
  } catch {
    // Bỏ qua lỗi storage trên môi trường không hỗ trợ localStorage
  }
  return DEFAULT_SECURITY_PIN;
}

export function saveStoredSecurityPin(pin: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SECURITY_PIN_STORAGE_KEY, pin);
    }
  } catch {
    // Bỏ qua lỗi storage trên môi trường không hỗ trợ localStorage
  }
}

export function describeDeviceAction(
  deviceId: DeviceId,
  state: Partial<Pick<ReportedState, 'power' | 'mode' | 'doorState'>>
): string {
  if (deviceId === 'door1') {
    return state.doorState === 'OPEN' ? 'OPEN_DOOR' : 'CLOSE_DOOR';
  }
  if (deviceId === 'fan1') {
    return `FAN_${state.power ?? 'OFF'}_${state.mode ?? 'MANUAL'}`;
  }
  return state.power === 'ON' ? 'TURN_ON' : 'TURN_OFF';
}

export function resolveActorLabel(source: ActivityLogRecord['source']): string {
  if (source === 'PHYSICAL_BUTTON') return 'Nút vật lý ESP32';
  if (source === 'AUTO_RULE') return 'Tự động (ESP32 AUTO)';
  return 'Chủ nhà';
}

export function applyPendingDesiredState(
  device: DeviceRecord,
  desiredState: DesiredState,
  requestId: string,
  timestamp: number
): DeviceRecord {
  return {
    ...device,
    desiredState: { ...device.desiredState, ...desiredState },
    lastCommandStatus: 'PENDING',
    lastRequestId: requestId,
    lastUpdated: timestamp,
  };
}

export function parseMqttReportedState(
  payload: Record<string, unknown>
): Partial<ReportedState> {
  const rep = (payload.reportedState || {}) as Record<string, unknown>;
  return {
    ...(rep.power === 'ON' || rep.power === 'OFF' ? { power: rep.power } : {}),
    ...(rep.mode === 'AUTO' || rep.mode === 'MANUAL' ? { mode: rep.mode } : {}),
    ...(rep.doorState === 'OPEN' || rep.doorState === 'CLOSED'
      ? { doorState: rep.doorState }
      : {}),
    ...(rep.currentAngle !== undefined
      ? { currentAngle: Number(rep.currentAngle) }
      : {}),
  };
}

export function applyReportedStateToDevice(
  device: DeviceRecord,
  reportedPatch: Partial<ReportedState>,
  timestamp: number
): DeviceRecord {
  const nextReported: ReportedState = {
    ...device.reportedState,
    ...reportedPatch,
  };

  return {
    ...device,
    desiredState: {
      ...device.desiredState,
      ...(nextReported.power !== undefined ? { power: nextReported.power } : {}),
      ...(nextReported.mode !== undefined ? { mode: nextReported.mode } : {}),
      ...(nextReported.doorState !== undefined
        ? { doorState: nextReported.doorState }
        : {}),
    },
    reportedState: nextReported,
    lastCommandStatus: 'ACKED',
    lastUpdated: timestamp,
  };
}

export function buildSimulatedReportedState(
  device: DeviceRecord,
  desiredState: DesiredState
): ReportedState {
  return {
    ...device.reportedState,
    ...(desiredState.power !== undefined ? { power: desiredState.power } : {}),
    ...(desiredState.mode !== undefined ? { mode: desiredState.mode } : {}),
    ...(desiredState.doorState !== undefined
      ? {
          doorState: desiredState.doorState,
          currentAngle:
            desiredState.targetAngle ?? (desiredState.doorState === 'OPEN' ? 90 : 0),
          positionVerified: false,
        }
      : {}),
  };
}

export function extractAutoConfigPatch(
  payload: Record<string, unknown>
): Partial<AutoConfig> {
  return {
    ...(typeof payload.tempThresholdHigh === 'number'
      ? { tempThresholdHigh: Number(payload.tempThresholdHigh) }
      : {}),
    ...(typeof payload.tempThresholdLow === 'number'
      ? { tempThresholdLow: Number(payload.tempThresholdLow) }
      : {}),
    ...(typeof payload.smokeThresholdAdc === 'number'
      ? { smokeThresholdAdc: Number(payload.smokeThresholdAdc) }
      : {}),
    ...(typeof payload.motionAutoLight === 'boolean'
      ? { motionAutoLight: Boolean(payload.motionAutoLight) }
      : {}),
  };
}

export function parseMqttAlertRecord(
  payload: Record<string, unknown>,
  timestamp: number
): AlertRecord {
  return {
    id: String(payload.alertId || `alt_${timestamp}`),
    type: (payload.type as AlertRecord['type']) || 'SMOKE_DETECTED',
    severity: (payload.severity as AlertRecord['severity']) || 'CRITICAL',
    roomId: (payload.roomId as AlertRecord['roomId']) || 'kitchen',
    deviceId: String(payload.deviceId || 'mq2_kitchen'),
    message: String(payload.message),
    acknowledged: false,
    buzzerTriggered: Boolean(payload.buzzerTriggered),
    autoFanTriggered: Boolean(payload.autoFanTriggered),
    timestamp,
  };
}

export function isValidSystemMode(value: unknown): value is SystemMode {
  return value === 'AUTO' || value === 'MANUAL';
}
