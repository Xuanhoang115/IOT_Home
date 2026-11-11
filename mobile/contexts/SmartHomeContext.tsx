import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api';
import {
  ActivityLogRecord,
  AlertRecord,
  AuthUser,
  AutoConfig,
  CommandRecord,
  DesiredState,
  DeviceId,
  DeviceRecord,
  Esp32StatusRecord,
  LatestSensorsRecord,
  RoomRecord,
  SensorReadingRecord,
  SystemMode,
} from '../types/smarthome';

const INITIAL_ROOMS: RoomRecord[] = [
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

const INITIAL_DEVICES: DeviceRecord[] = [
  {
    id: 'light1',
    name: 'Đèn Phòng khách',
    type: 'light',
    roomId: 'living_room',
    desiredState: { power: 'OFF', mode: 'MANUAL' },
    reportedState: { power: 'OFF', mode: 'MANUAL' },
    lastCommandStatus: 'ACKED',
    lastUpdated: Date.now(),
  },
  {
    id: 'light2',
    name: 'Đèn Phòng ngủ',
    type: 'light',
    roomId: 'bedroom',
    desiredState: { power: 'OFF', mode: 'MANUAL' },
    reportedState: { power: 'OFF', mode: 'MANUAL' },
    lastCommandStatus: 'ACKED',
    lastUpdated: Date.now(),
  },
  {
    id: 'fan1',
    name: 'Quạt Thông gió',
    type: 'fan',
    roomId: 'living_room',
    desiredState: { power: 'OFF', mode: 'MANUAL' },
    reportedState: { power: 'OFF', mode: 'MANUAL' },
    lastCommandStatus: 'ACKED',
    lastUpdated: Date.now(),
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
    lastUpdated: Date.now(),
  },
];

const INITIAL_SENSORS: LatestSensorsRecord = {
  temperature: { value: 28.6, unit: 'C', roomId: 'living_room', updatedAt: Date.now() },
  humidity: { value: 65.2, unit: '%', roomId: 'living_room', updatedAt: Date.now() },
  motion: { motionDetected: false, roomId: 'living_room', updatedAt: Date.now() },
  smoke: {
    rawAdc: 960,
    smokeLevelPercent: 23.4,
    abnormal: false,
    roomId: 'kitchen',
    updatedAt: Date.now(),
  },
};

const DEMO_ACCOUNTS: Record<string, AuthUser & { password: string }> = {
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

export interface SmartHomeContextValue {
  user: AuthUser | null;
  backendConnected: boolean;
  apiBaseUrl: string;
  systemMode: SystemMode;
  autoConfig: AutoConfig;
  esp32Status: Esp32StatusRecord;
  simulateEsp32Offline: boolean;
  rooms: RoomRecord[];
  devices: DeviceRecord[];
  latestSensors: LatestSensorsRecord;
  sensorReadings: SensorReadingRecord[];
  alerts: AlertRecord[];
  activeBannerAlert: AlertRecord | null;
  activityLogs: ActivityLogRecord[];
  commands: CommandRecord[];
  login: (emailOrUsername: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refreshAll: () => Promise<void>;
  sendDeviceCommand: (deviceId: DeviceId, desiredState: DesiredState) => Promise<void>;
  toggleSystemMode: (nextMode: SystemMode, nextConfig?: Partial<AutoConfig>) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  dismissBannerAlert: () => void;
  triggerDemoSmokeAlert: () => void;
  triggerDemoSensorUpdate: (tempC: number, smokeAdc: number, motion: boolean) => void;
  setSimulateEsp32Offline: (offline: boolean) => void;
  updateApiBaseUrl: (url: string) => Promise<boolean>;
}

export const SmartHomeContext = createContext<SmartHomeContextValue | undefined>(undefined);

export const SmartHomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(apiClient.getBaseUrl());
  const [systemMode, setSystemMode] = useState<SystemMode>('MANUAL');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({
    tempThresholdHigh: 31.0,
    tempThresholdLow: 29.5,
    smokeThresholdAdc: 2200,
    motionAutoLight: false,
  });
  const [simulateEsp32Offline, setSimulateEsp32OfflineState] = useState<boolean>(false);
  const [esp32Status, setEsp32Status] = useState<Esp32StatusRecord>({
    online: true,
    lastSeen: Date.now(),
    rssi: -56,
    firmwareVersion: '1.0.0',
  });
  const [rooms, setRooms] = useState<RoomRecord[]>(INITIAL_ROOMS);
  const [devices, setDevices] = useState<DeviceRecord[]>(INITIAL_DEVICES);
  const [latestSensors, setLatestSensors] = useState<LatestSensorsRecord>(INITIAL_SENSORS);
  const [sensorReadings, setSensorReadings] = useState<SensorReadingRecord[]>([
    {
      temperature: 28.6,
      humidity: 65.2,
      smokeRawAdc: 960,
      motionDetected: false,
      timestamp: Date.now() - 120000,
    },
  ]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([
    {
      id: 'alt_seed_mq2_demo',
      type: 'SMOKE_DETECTED',
      severity: 'CRITICAL',
      roomId: 'kitchen',
      deviceId: 'mq2_kitchen',
      message: 'Bản ghi mẫu: Phát hiện nồng độ khói/khí vượt ngưỡng tại Phòng bếp (ADC: 2480/2200).',
      acknowledged: true,
      buzzerTriggered: true,
      autoFanTriggered: true,
      timestamp: Date.now() - 3600000,
    },
  ]);
  const [activeBannerAlert, setActiveBannerAlert] = useState<AlertRecord | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([
    {
      id: 'log_init_001',
      deviceId: 'esp32_main',
      action: 'BOOT_SYNC_OK',
      source: 'BOOT_SYNC',
      actorUid: 'system',
      timestamp: Date.now() - 600000,
    },
  ]);
  const [commands, setCommands] = useState<CommandRecord[]>([]);
  const customAccountsRef = useRef<Record<string, AuthUser & { password: string }>>({
    ...DEMO_ACCOUNTS,
  });

  const refreshAll = useCallback(async () => {
    try {
      const health = await apiClient.getHealth();
      setBackendConnected(true);
      setSystemMode(health.systemMode);
      if (health.esp32Status && !simulateEsp32Offline) {
        setEsp32Status(health.esp32Status);
      }

      const [remoteRooms, remoteDevices, remoteSensors, remoteAlerts, remoteHistory] =
        await Promise.all([
          apiClient.getRooms(),
          apiClient.getDevices(),
          apiClient.getSensors(),
          apiClient.getAlerts(),
          apiClient.getHistory(),
        ]);

      if (remoteRooms.length > 0) setRooms(remoteRooms);
      if (remoteDevices.length > 0) setDevices(remoteDevices);
      if (remoteSensors.latest) setLatestSensors(remoteSensors.latest);
      if (remoteSensors.recentReadings) setSensorReadings(remoteSensors.recentReadings);
      if (remoteAlerts) {
        setAlerts(remoteAlerts);
        const unacked = remoteAlerts.find((a) => !a.acknowledged && a.severity === 'CRITICAL');
        if (unacked) setActiveBannerAlert(unacked);
      }
      if (remoteHistory) {
        setActivityLogs(remoteHistory.activityLogs);
        setCommands(remoteHistory.commands);
      }
    } catch {
      setBackendConnected(false);
    }
  }, [simulateEsp32Offline]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      if (user) {
        refreshAll();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [user, refreshAll]);

  const login = async (
    emailOrUsername: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const key = emailOrUsername.trim().toLowerCase();
    const account = customAccountsRef.current[key];
    if (!account || account.password !== password) {
      return {
        ok: false,
        error:
          'Email hoặc mật khẩu không đúng. Gợi ý tài khoản mẫu: student1@smarthome.edu.vn / 123456 (hoặc admin / 123456).',
      };
    }

    apiClient.setToken(account.token);
    setUser({
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      token: account.token,
    });
    await refreshAll();
    return { ok: true };
  };

  const register = async (
    fullName: string,
    email: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!fullName.trim()) {
      return { ok: false, error: 'Vui lòng nhập họ và tên.' };
    }
    if (!cleanEmail.includes('@')) {
      return { ok: false, error: 'Địa chỉ Email không hợp lệ.' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };
    }

    const newAccount: AuthUser & { password: string } = {
      uid: 'uid_student_01',
      email: cleanEmail,
      displayName: fullName.trim(),
      role: 'member',
      token: 'dev-token:uid_student_01',
      password,
    };

    customAccountsRef.current[cleanEmail] = newAccount;
    apiClient.setToken(newAccount.token);
    setUser(newAccount);
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
  };

  const setSimulateEsp32Offline = (offline: boolean) => {
    setSimulateEsp32OfflineState(offline);
    setEsp32Status((prev) => ({
      ...prev,
      online: !offline,
      lastSeen: Date.now(),
      reason: offline ? 'lwt_unexpected_disconnect' : undefined,
    }));
  };

  const sendDeviceCommand = async (deviceId: DeviceId, desiredState: DesiredState) => {
    const now = Date.now();
    const requestId = `req_${now}_${Math.random().toString(16).slice(2, 6)}`;

    // Bước 1: Chuyển sang trạng thái PENDING (TUYỆT ĐỐI GIỮ NGUYÊN reportedState cũ)
    setDevices((prev) =>
      prev.map((dev) =>
        dev.id === deviceId
          ? {
              ...dev,
              desiredState: { ...dev.desiredState, ...desiredState },
              lastCommandStatus: 'PENDING',
              lastRequestId: requestId,
              lastUpdated: now,
            }
          : dev
      )
    );

    if (backendConnected && !simulateEsp32Offline) {
      try {
        const res = await apiClient.sendCommand(deviceId, desiredState);
        setDevices((prev) =>
          prev.map((dev) => (dev.id === deviceId ? res.device : dev))
        );
        // Nếu Backend đang chạy chế độ In-Memory chưa nối ESP32 thật, mô phỏng phản hồi ACK sau 600ms
        setTimeout(() => {
          setDevices((prev) =>
            prev.map((dev) => {
              if (dev.id !== deviceId || dev.lastCommandStatus !== 'PENDING') return dev;
              const nextReported = {
                ...dev.reportedState,
                ...(desiredState.power !== undefined ? { power: desiredState.power } : {}),
                ...(desiredState.mode !== undefined ? { mode: desiredState.mode } : {}),
                ...(desiredState.doorState !== undefined
                  ? {
                      doorState: desiredState.doorState,
                      currentAngle: desiredState.doorState === 'OPEN' ? 90 : 0,
                      positionVerified: false,
                    }
                  : {}),
              };
              return {
                ...dev,
                reportedState: nextReported,
                lastCommandStatus: 'ACKED',
                lastUpdated: Date.now(),
              };
            })
          );
        }, 650);
        return;
      } catch {
        // Fallback xuống mô phỏng local nếu API lỗi
      }
    }

    // Nếu đang bật chế độ Giả lập ESP32 Offline -> Báo TIMEOUT sau 3.5 giây (hoặc 8s)
    if (simulateEsp32Offline) {
      setTimeout(() => {
        const timeoutTs = Date.now();
        setDevices((prev) =>
          prev.map((dev) =>
            dev.id === deviceId
              ? {
                  ...dev,
                  lastCommandStatus: 'TIMEOUT',
                  lastUpdated: timeoutTs,
                }
              : dev
          )
        );
        setCommands((prev) => [
          {
            requestId,
            deviceId,
            desiredState,
            status: 'TIMEOUT',
            requestedBy: user?.uid || 'uid_student_01',
            createdAt: now,
            errorReason: 'ESP32 Offline (LWT) - Không nhận được phản hồi reportedState',
          },
          ...prev,
        ]);
      }, 3000);
      return;
    }

    // Chế độ Simulator phản hồi ACK (reportedState) sau 600ms
    setTimeout(() => {
      const ackTs = Date.now();
      setDevices((prev) =>
        prev.map((dev) => {
          if (dev.id !== deviceId) return dev;
          const nextReported = {
            ...dev.reportedState,
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
          return {
            ...dev,
            reportedState: nextReported,
            lastCommandStatus: 'ACKED',
            lastUpdated: ackTs,
          };
        })
      );

      const actionLabel =
        deviceId === 'door1'
          ? desiredState.doorState === 'OPEN'
            ? 'OPEN_DOOR'
            : 'CLOSE_DOOR'
          : desiredState.power === 'ON'
          ? 'TURN_ON'
          : 'TURN_OFF';

      setActivityLogs((prev) => [
        {
          id: `log_${ackTs}`,
          requestId,
          deviceId,
          action: actionLabel,
          source: 'REMOTE_COMMAND',
          actorUid: user?.uid || 'uid_student_01',
          timestamp: ackTs,
        },
        ...prev,
      ]);

      setCommands((prev) => [
        {
          requestId,
          deviceId,
          desiredState,
          status: 'ACKED',
          requestedBy: user?.uid || 'uid_student_01',
          createdAt: now,
          ackedAt: ackTs,
        },
        ...prev,
      ]);
    }, 600);
  };

  const toggleSystemMode = async (nextMode: SystemMode, nextConfig?: Partial<AutoConfig>) => {
    setSystemMode(nextMode);
    if (nextConfig) {
      setAutoConfig((prev) => ({ ...prev, ...nextConfig }));
    }
    if (backendConnected) {
      try {
        await apiClient.updateSystemMode(nextMode, nextConfig);
      } catch {
        // Ignore offline error
      }
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
    if (activeBannerAlert?.id === alertId) {
      setActiveBannerAlert(null);
    }
    if (backendConnected) {
      try {
        await apiClient.acknowledgeAlert(alertId);
      } catch {
        // Ignore offline error
      }
    }
  };

  const dismissBannerAlert = () => {
    setActiveBannerAlert(null);
  };

  const triggerDemoSmokeAlert = () => {
    const now = Date.now();
    const newAlert: AlertRecord = {
      id: `alt_smoke_${now}`,
      type: 'SMOKE_DETECTED',
      severity: 'CRITICAL',
      roomId: 'kitchen',
      deviceId: 'mq2_kitchen',
      message: `CẢNH BÁO KHẨN CẤP! Nồng độ khói/khí tại Phòng bếp vượt ngưỡng (ADC: 2740/${autoConfig.smokeThresholdAdc}). Còi Buzzer & Quạt thông gió đã kích hoạt!`,
      acknowledged: false,
      buzzerTriggered: true,
      autoFanTriggered: true,
      timestamp: now,
    };

    setLatestSensors((prev) => ({
      ...prev,
      smoke: {
        rawAdc: 2740,
        smokeLevelPercent: 66.9,
        abnormal: true,
        roomId: 'kitchen',
        updatedAt: now,
      },
    }));

    // Tự động bật quạt khi phát hiện khói ở chế độ AUTO
    setDevices((prev) =>
      prev.map((d) =>
        d.id === 'fan1'
          ? {
              ...d,
              desiredState: { power: 'ON', mode: 'AUTO' },
              reportedState: { power: 'ON', mode: 'AUTO' },
              lastCommandStatus: 'ACKED',
              lastUpdated: now,
            }
          : d
      )
    );

    setAlerts((prev) => [newAlert, ...prev]);
    setActiveBannerAlert(newAlert);
    setActivityLogs((prev) => [
      {
        id: `log_auto_smoke_${now}`,
        deviceId: 'fan1',
        action: 'AUTO_FAN_ON_SMOKE_EMERGENCY',
        source: 'AUTO_RULE',
        actorUid: 'esp32_local_safety',
        timestamp: now,
      },
      ...prev,
    ]);
  };

  const triggerDemoSensorUpdate = (tempC: number, smokeAdc: number, motion: boolean) => {
    const now = Date.now();
    const isAbnormalSmoke = smokeAdc >= autoConfig.smokeThresholdAdc;

    setLatestSensors((prev) => ({
      temperature: { value: tempC, unit: 'C', roomId: 'living_room', updatedAt: now },
      humidity: { ...prev.humidity, updatedAt: now },
      motion: { motionDetected: motion, roomId: 'living_room', updatedAt: now },
      smoke: {
        rawAdc: smokeAdc,
        smokeLevelPercent: Number(((smokeAdc / 4095) * 100).toFixed(1)),
        abnormal: isAbnormalSmoke,
        roomId: 'kitchen',
        updatedAt: now,
      },
    }));

    setSensorReadings((prev) => [
      {
        temperature: tempC,
        humidity: latestSensors.humidity.value,
        smokeRawAdc: smokeAdc,
        motionDetected: motion,
        timestamp: now,
      },
      ...prev.slice(0, 19),
    ]);

    // Kiểm tra Hysteresis cho quạt nếu đang ở chế độ AUTO
    if (systemMode === 'AUTO') {
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id !== 'fan1') return d;
          const currentPower = d.reportedState.power || 'OFF';
          let nextPower = currentPower;
          if (tempC >= autoConfig.tempThresholdHigh) nextPower = 'ON';
          else if (tempC <= autoConfig.tempThresholdLow) nextPower = 'OFF';

          if (nextPower !== currentPower) {
            setActivityLogs((logs) => [
              {
                id: `log_hysteresis_${now}`,
                deviceId: 'fan1',
                action: `AUTO_HYSTERESIS_FAN_${nextPower} (${tempC}°C)`,
                source: 'AUTO_RULE',
                actorUid: 'esp32_auto_hysteresis',
                timestamp: now,
              },
              ...logs,
            ]);
          }

          return {
            ...d,
            desiredState: { power: nextPower, mode: 'AUTO' },
            reportedState: { power: nextPower, mode: 'AUTO' },
            lastCommandStatus: 'ACKED',
            lastUpdated: now,
          };
        })
      );
    }
  };

  const updateApiBaseUrl = async (url: string): Promise<boolean> => {
    apiClient.setBaseUrl(url);
    setApiBaseUrl(apiClient.getBaseUrl());
    try {
      await apiClient.getHealth();
      setBackendConnected(true);
      await refreshAll();
      return true;
    } catch {
      setBackendConnected(false);
      return false;
    }
  };

  return (
    <SmartHomeContext.Provider
      value={{
        user,
        backendConnected,
        apiBaseUrl,
        systemMode,
        autoConfig,
        esp32Status,
        simulateEsp32Offline,
        rooms,
        devices,
        latestSensors,
        sensorReadings,
        alerts,
        activeBannerAlert,
        activityLogs,
        commands,
        login,
        register,
        logout,
        refreshAll,
        sendDeviceCommand,
        toggleSystemMode,
        acknowledgeAlert,
        dismissBannerAlert,
        triggerDemoSmokeAlert,
        triggerDemoSensorUpdate,
        setSimulateEsp32Offline,
        updateApiBaseUrl,
      }}
    >
      {children}
    </SmartHomeContext.Provider>
  );
};
