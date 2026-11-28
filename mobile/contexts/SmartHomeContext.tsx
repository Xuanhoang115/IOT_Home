import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import SystemModeSecurityModal from '../components/SystemModeSecurityModal';
import FeedbackToast, { ToastMessage, ToastTone } from '../components/ui/FeedbackToast';
import {
  createInitialActivityLogs,
  createInitialAlerts,
  createInitialDevices,
  createInitialEsp32Status,
  createInitialSensorReadings,
  createInitialSensors,
  DEFAULT_AUTO_CONFIG,
  DEFAULT_HOME_ID,
  DEMO_ACCOUNTS,
  INITIAL_ROOMS,
  MAX_LOCAL_ACTIVITY_LOGS,
  MAX_LOCAL_SENSOR_READINGS,
} from '../constants/defaults';
import { apiClient } from '../services/api';
import { directCloudMqtt } from '../services/directCloudMqtt';
import { firebaseAuth } from '../services/firebaseAuth';
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
import {
  applyPendingDesiredState,
  applyReportedStateToDevice,
  buildSimulatedReportedState,
  describeDeviceAction,
  extractAutoConfigPatch,
  isValidSystemMode,
  parseMqttAlertRecord,
  parseMqttReportedState,
  readStoredSecurityPin,
  resolveActorLabel,
  saveStoredSecurityPin,
} from '../utils/deviceStateMapper';

const STATE_TOPIC_REGEX = /^smarthome\/[^/]+\/(light1|light2|fan1|door1)\/state$/;

export interface SmartHomeContextValue {
  user: AuthUser | null;
  backendConnected: boolean;
  isInitialLoading: boolean;
  syncError: string | null;
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
  muteBuzzer: () => void;
  dismissBannerAlert: () => void;
  showToast: (text: string, tone?: ToastTone) => void;
  triggerDemoSmokeAlert: () => void;
  triggerDemoSensorUpdate: (tempC: number, smokeAdc: number, motion: boolean) => void;
  setSimulateEsp32Offline: (offline: boolean) => void;
  updateApiBaseUrl: (url: string) => Promise<boolean>;
}

export const SmartHomeContext = createContext<SmartHomeContextValue | undefined>(undefined);

export const SmartHomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef<boolean>(false);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(apiClient.getBaseUrl());
  const [systemMode, setSystemMode] = useState<SystemMode>('MANUAL');
  const [securityPin, setSecurityPin] = useState<string>(readStoredSecurityPin);
  const [modeModalVisible, setModeModalVisible] = useState<boolean>(false);
  const [pendingTargetMode, setPendingTargetMode] = useState<SystemMode>('AUTO');
  const [pendingDraftConfig, setPendingDraftConfig] = useState<AutoConfig | undefined>(undefined);
  const [autoConfig, setAutoConfig] = useState<AutoConfig>(DEFAULT_AUTO_CONFIG);
  const [simulateEsp32Offline, setSimulateEsp32OfflineState] = useState<boolean>(false);
  const [esp32Status, setEsp32Status] = useState<Esp32StatusRecord>(createInitialEsp32Status);
  const [rooms, setRooms] = useState<RoomRecord[]>(INITIAL_ROOMS);
  const [devices, setDevices] = useState<DeviceRecord[]>(createInitialDevices);
  const [latestSensors, setLatestSensors] = useState<LatestSensorsRecord>(createInitialSensors);
  const [sensorReadings, setSensorReadings] = useState<SensorReadingRecord[]>(
    createInitialSensorReadings
  );
  const [alerts, setAlerts] = useState<AlertRecord[]>(createInitialAlerts);
  const [activeBannerAlert, setActiveBannerAlert] = useState<AlertRecord | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>(createInitialActivityLogs);
  const [commands, setCommands] = useState<CommandRecord[]>([]);
  const [mqttLive, setMqttLive] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((text: string, tone: ToastTone = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), text, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const customAccountsRef = useRef<Record<string, AuthUser & { password: string }>>({
    ...DEMO_ACCOUNTS,
  });
  const isRefreshingRef = useRef<boolean>(false);
  const lastCommandSentAtRef = useRef<number>(0);
  const lastDirectPacketAtRef = useRef<number>(0);
  const mqttLiveRef = useRef<boolean>(false);

  const appendActivityLog = useCallback((entry: ActivityLogRecord) => {
    setActivityLogs((prev) => {
      if (
        entry.requestId &&
        prev.some((l) => l.requestId === entry.requestId && l.deviceId === entry.deviceId)
      ) {
        return prev;
      }
      return [entry, ...prev.slice(0, MAX_LOCAL_ACTIVITY_LOGS - 1)];
    });
  }, []);

  const currentActorLabel = user?.email || user?.uid || 'owner';

  // Tự động khôi phục phiên đăng nhập Firebase (hoạt động cả khi tắt Backend)
  useEffect(() => {
    if (!firebaseAuth) return;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (account) => {
      if (!account) return;
      try {
        const idToken = await account.getIdToken();
        apiClient.setToken(idToken);
        setUser({
          uid: account.uid,
          email: account.email ?? 'admin@gmail.com',
          displayName: account.displayName ?? account.email ?? 'Chủ nhà (Owner)',
          role: 'owner',
          token: idToken,
        });
      } catch {
        // Bỏ qua lỗi lấy token nền
      }
    });
    return () => unsubscribe();
  }, []);

  const refreshAll = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    if (!hasLoadedOnceRef.current) {
      setIsInitialLoading(true);
    }
    const fetchStartedAt = Date.now();
    try {
      let snapshot;
      try {
        // Tối ưu 1-request Snapshot (thay cho 6 HTTP request + 7x getIdToken)
        snapshot = await apiClient.getSnapshot();
      } catch {
        // Fallback tương thích ngược nếu Backend đang chạy bản cũ chưa có /api/snapshot
        const [health, remoteRooms, remoteDevices, remoteSensors, remoteAlerts, remoteHistory] =
          await Promise.all([
            apiClient.getHealth(),
            apiClient.getRooms(),
            apiClient.getDevices(),
            apiClient.getSensors(),
            apiClient.getAlerts(),
            apiClient.getHistory(),
          ]);
        snapshot = {
          health,
          rooms: remoteRooms,
          devices: remoteDevices,
          sensors: remoteSensors,
          alerts: remoteAlerts,
          history: remoteHistory,
        };
      }

      const {
        health,
        rooms: remoteRooms,
        devices: remoteDevices,
        sensors: remoteSensors,
        alerts: remoteAlerts,
        history: remoteHistory,
      } = snapshot;

      setBackendConnected(true);
      setSyncError(null);
      if (remoteRooms.length > 0) setRooms(remoteRooms);
      if (remoteSensors.recentReadings) setSensorReadings(remoteSensors.recentReadings);

      // Khi MQTT realtime đang sống: không ghi đè thiết bị/cảm biến bằng dữ liệu polling cũ hơn
      if (!mqttLiveRef.current) {
        setSystemMode(health.systemMode);
        if (health.esp32Status && !simulateEsp32Offline) {
          setEsp32Status(health.esp32Status);
        }
        if (remoteDevices.length > 0 && fetchStartedAt >= lastCommandSentAtRef.current) {
          setDevices(remoteDevices);
        }
        if (remoteSensors.latest) setLatestSensors(remoteSensors.latest);
      }

      if (remoteAlerts) {
        setAlerts(remoteAlerts);
        const unackedCritical = remoteAlerts.find(
          (a) => !a.acknowledged && a.severity === 'CRITICAL'
        );
        if (unackedCritical) setActiveBannerAlert(unackedCritical);
      }
      if (remoteHistory) {
        setActivityLogs(remoteHistory.activityLogs);
        setCommands(remoteHistory.commands);
      }
    } catch {
      setBackendConnected(false);
      if (!mqttLiveRef.current) {
        setSyncError('Không thể kết nối máy chủ Backend. Kiểm tra mạng Wi-Fi hoặc bấm Thử lại.');
      }
    } finally {
      hasLoadedOnceRef.current = true;
      setIsInitialLoading(false);
      isRefreshingRef.current = false;
    }
  }, [simulateEsp32Offline]);

  useEffect(() => {
    if (!user) return;
    refreshAll();
    const interval = setInterval(refreshAll, mqttLive ? 10000 : 1500);
    return () => clearInterval(interval);
  }, [user, refreshAll, mqttLive]);

  const handleIncomingMqttMessage = useCallback(
    (topic: string, payload: Record<string, unknown>, isRetained: boolean) => {
      if (simulateEsp32Offline || topic.endsWith('/set')) return;
      const now = Date.now();

      const markEsp32Live = () => {
        if (isRetained) return;
        lastDirectPacketAtRef.current = now;
        // Chỉ re-render UI khi chuyển từ Offline -> Online hoặc mỗi 10 giây thay vì mỗi gói tin 1-3 giây
        setEsp32Status((prev) =>
          prev.online && now - prev.lastSeen < 10000
            ? prev
            : { ...prev, online: true, lastSeen: now }
        );
      };

      const stateMatch = topic.match(STATE_TOPIC_REGEX);
      if (stateMatch) {
        markEsp32Live();
        const devId = stateMatch[1] as DeviceId;
        const reportedPatch = parseMqttReportedState(payload);
        setDevices((prev) =>
          prev.map((d) =>
            d.id === devId ? applyReportedStateToDevice(d, reportedPatch, now) : d
          )
        );
        if (!isRetained && !payload.isDuplicate) {
          const source = (payload.source as ActivityLogRecord['source']) || 'REMOTE_COMMAND';
          appendActivityLog({
            id: `log_${now}_${Math.random().toString(16).slice(2, 6)}`,
            requestId: String(payload.requestId || `mqtt_${now}`),
            deviceId: devId,
            action: describeDeviceAction(devId, reportedPatch),
            source,
            actorUid: resolveActorLabel(source),
            timestamp: now,
          });
        }
        return;
      }

      if (topic.endsWith('/sensors/temperature') && typeof payload.value === 'number') {
        markEsp32Live();
        const nextVal = Number(payload.value);
        setLatestSensors((prev) =>
          prev.temperature.value === nextVal
            ? prev
            : { ...prev, temperature: { ...prev.temperature, value: nextVal, updatedAt: now } }
        );
        return;
      }

      if (topic.endsWith('/sensors/humidity') && typeof payload.value === 'number') {
        markEsp32Live();
        const nextVal = Number(payload.value);
        setLatestSensors((prev) =>
          prev.humidity.value === nextVal
            ? prev
            : { ...prev, humidity: { ...prev.humidity, value: nextVal, updatedAt: now } }
        );
        return;
      }

      if (topic.endsWith('/sensors/motion') && typeof payload.motionDetected === 'boolean') {
        markEsp32Live();
        const nextMotion = Boolean(payload.motionDetected);
        setLatestSensors((prev) =>
          prev.motion.motionDetected === nextMotion
            ? prev
            : { ...prev, motion: { ...prev.motion, motionDetected: nextMotion, updatedAt: now } }
        );
        return;
      }

      if (topic.endsWith('/sensors/smoke') && typeof payload.rawAdc === 'number') {
        markEsp32Live();
        const nextRaw = Number(payload.rawAdc);
        const nextPct = Number(payload.smokeLevelPercent ?? 0);
        const nextAbn = Boolean(payload.abnormal);
        setLatestSensors((prev) =>
          prev.smoke.rawAdc === nextRaw && prev.smoke.abnormal === nextAbn
            ? prev
            : {
                ...prev,
                smoke: {
                  ...prev.smoke,
                  rawAdc: nextRaw,
                  smokeLevelPercent: nextPct,
                  abnormal: nextAbn,
                  updatedAt: now,
                },
              }
        );
        return;
      }

      if (topic.endsWith('/esp32/status') && typeof payload.online === 'boolean') {
        const isOnline = Boolean(payload.online);
        if (!isOnline) lastDirectPacketAtRef.current = 0;
        else if (!isRetained) lastDirectPacketAtRef.current = now;

        setEsp32Status((prev) => {
          const nextOnline = !isOnline ? false : isRetained ? prev.online : true;
          const nextRssi = typeof payload.rssi === 'number' ? payload.rssi : prev.rssi;
          const nextFw =
            typeof payload.firmwareVersion === 'string'
              ? payload.firmwareVersion
              : prev.firmwareVersion;
          if (
            prev.online === nextOnline &&
            prev.rssi === nextRssi &&
            prev.firmwareVersion === nextFw &&
            now - prev.lastSeen < 10000
          ) {
            return prev;
          }
          return {
            ...prev,
            online: nextOnline,
            lastSeen: now,
            rssi: nextRssi,
            firmwareVersion: nextFw,
          };
        });
        if (isValidSystemMode(payload.systemMode)) {
          setSystemMode(payload.systemMode);
        }
        const configPatch = extractAutoConfigPatch(payload);
        if (Object.keys(configPatch).length > 0) {
          setAutoConfig((prev) => ({ ...prev, ...configPatch }));
        }
        return;
      }

      if (topic.endsWith('/alerts') && typeof payload.message === 'string') {
        const newAlert = parseMqttAlertRecord(payload, now);
        setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)]);
        if (newAlert.severity === 'CRITICAL') {
          setActiveBannerAlert(newAlert);
        }
      }
    },
    [appendActivityLog, simulateEsp32Offline]
  );

  // Chỉ kết nối trực tiếp EMQX Cloud WebSocket (:8084) SAU KHI người dùng đã đăng nhập
  useEffect(() => {
    if (!user) {
      mqttLiveRef.current = false;
      setMqttLive(false);
      directCloudMqtt.stop();
      return;
    }

    directCloudMqtt.start(handleIncomingMqttMessage, (connected) => {
      mqttLiveRef.current = connected;
      setMqttLive(connected);
      if (connected) {
        setSyncError(null);
        setIsInitialLoading(false);
      }
    });

    return () => {
      mqttLiveRef.current = false;
      directCloudMqtt.stop();
    };
  }, [user, handleIncomingMqttMessage]);

  const login = async (
    emailOrUsername: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const key = emailOrUsername.trim().toLowerCase();
    if (firebaseAuth) {
      try {
        const { user: account } = await signInWithEmailAndPassword(firebaseAuth, key, password);
        const idToken = await account.getIdToken();
        apiClient.setToken(idToken);
        setUser({
          uid: account.uid,
          email: account.email ?? key,
          displayName: account.displayName ?? key,
          role: 'owner',
          token: idToken,
        });
        refreshAll().catch(() => {});
        return { ok: true };
      } catch (error) {
        await signOut(firebaseAuth);
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Không thể đăng nhập Firebase.',
        };
      }
    }

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
    if (firebaseAuth) {
      return { ok: false, error: 'Hãy dùng tài khoản Firebase đã được cấp quyền vào nhà.' };
    }
    if (!fullName.trim()) return { ok: false, error: 'Vui lòng nhập họ và tên.' };
    if (!cleanEmail.includes('@')) return { ok: false, error: 'Địa chỉ Email không hợp lệ.' };
    if (password.length < 6) return { ok: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };

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
    if (firebaseAuth) void signOut(firebaseAuth);
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

  const scheduleSimulatorOutcome = (
    deviceId: DeviceId,
    desiredState: DesiredState,
    requestId: string,
    createdAt: number
  ) => {
    if (simulateEsp32Offline) {
      setTimeout(() => {
        const timeoutTs = Date.now();
        setDevices((prev) =>
          prev.map((dev) =>
            dev.id === deviceId
              ? { ...dev, lastCommandStatus: 'TIMEOUT', lastUpdated: timeoutTs }
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
            createdAt,
            errorReason: 'ESP32 Offline (LWT) - Không nhận được phản hồi reportedState',
          },
          ...prev,
        ]);
      }, 3000);
      return;
    }

    setTimeout(() => {
      const ackTs = Date.now();
      setDevices((prev) =>
        prev.map((dev) =>
          dev.id === deviceId
            ? {
                ...dev,
                reportedState: buildSimulatedReportedState(dev, desiredState),
                lastCommandStatus: 'ACKED',
                lastUpdated: ackTs,
              }
            : dev
        )
      );
      appendActivityLog({
        id: `log_${ackTs}`,
        requestId,
        deviceId,
        action: describeDeviceAction(deviceId, desiredState),
        source: 'REMOTE_COMMAND',
        actorUid: user?.uid || 'uid_student_01',
        timestamp: ackTs,
      });
      setCommands((prev) => [
        {
          requestId,
          deviceId,
          desiredState,
          status: 'ACKED',
          requestedBy: user?.uid || 'uid_student_01',
          createdAt,
          ackedAt: ackTs,
        },
        ...prev,
      ]);
    }, 600);
  };

  const sendDeviceCommand = async (
    deviceId: DeviceId,
    desiredState: DesiredState,
    isAutoRule = false
  ) => {
    if (!isAutoRule && desiredState.mode && desiredState.mode !== systemMode) {
      setPendingTargetMode(desiredState.mode);
      setPendingDraftConfig(autoConfig);
      setModeModalVisible(true);
      return;
    }

    const now = Date.now();
    lastCommandSentAtRef.current = now;
    const requestId = `req_${now}_${Math.random().toString(16).slice(2, 6)}`;

    // Chuyển sang PENDING, giữ nguyên reportedState cũ cho đến khi nhận phản hồi từ ESP32
    setDevices((prev) =>
      prev.map((dev) =>
        dev.id === deviceId
          ? applyPendingDesiredState(dev, desiredState, requestId, now)
          : dev
      )
    );

    // Ưu tiên 1: WebSocket trực tiếp EMQX Cloud (:8084) (< 40ms)
    if (!simulateEsp32Offline && directCloudMqtt.isConnected()) {
      const sent = directCloudMqtt.publishJson(`${deviceId}/set`, {
        requestId,
        homeId: DEFAULT_HOME_ID,
        deviceId,
        desiredState,
        requestedBy: user?.uid || 'owner',
        timestamp: now,
      });
      if (sent) {
        setTimeout(() => {
          setDevices((prev) =>
            prev.map((dev) => {
              if (
                dev.id === deviceId &&
                dev.lastRequestId === requestId &&
                dev.lastCommandStatus === 'PENDING'
              ) {
                showToast(`Thiết bị ${dev.name} không phản hồi (Timeout). Kiểm tra ESP32.`, 'error');
                return { ...dev, lastCommandStatus: 'TIMEOUT' };
              }
              return dev;
            })
          );
        }, 8000);
        return;
      }
    }

    // Ưu tiên 2: Dự phòng qua Backend REST API (:3000)
    if ((firebaseAuth || backendConnected) && !simulateEsp32Offline) {
      try {
        const res = await apiClient.sendCommand(deviceId, desiredState);
        setDevices((prev) =>
          prev.map((dev) => {
            if (dev.id !== deviceId) return dev;
            if (dev.lastRequestId === requestId && dev.lastCommandStatus === 'ACKED') return dev;
            return res.device;
          })
        );
        [350, 900, 8200].forEach((delayMs) => {
          setTimeout(() => refreshAll().catch(() => {}), delayMs);
        });
        return;
      } catch {
        setDevices((prev) =>
          prev.map((dev) =>
            dev.id === deviceId && dev.lastRequestId === requestId
              ? { ...dev, lastCommandStatus: 'FAILED' }
              : dev
          )
        );
        return;
      }
    }

    scheduleSimulatorOutcome(deviceId, desiredState, requestId, now);
  };

  const handleChangePin = (oldPin: string, newPin: string): { ok: boolean; error?: string } => {
    if (oldPin !== securityPin) {
      return { ok: false, error: '⚠️ Mã PIN hiện tại không chính xác!' };
    }
    setSecurityPin(newPin);
    saveStoredSecurityPin(newPin);
    appendActivityLog({
      id: `log_pin_${Date.now()}`,
      deviceId: 'esp32_main',
      action: 'SECURITY_PIN_CHANGED_BY_OWNER',
      source: 'REMOTE_COMMAND',
      actorUid: currentActorLabel,
      timestamp: Date.now(),
    });
    return { ok: true };
  };

  const handleBruteForceLockout = () => {
    appendActivityLog({
      id: `log_lockout_${Date.now()}`,
      deviceId: 'esp32_main',
      action: 'SECURITY_BRUTE_FORCE_LOCKED_30S',
      source: 'REMOTE_COMMAND',
      actorUid: user?.email || user?.uid || 'unknown',
      timestamp: Date.now(),
    });
  };

  const applyConfirmedSystemMode = async (
    nextMode: SystemMode,
    nextConfig?: Partial<AutoConfig>
  ) => {
    setModeModalVisible(false);
    setSystemMode(nextMode);
    const mergedCfg: AutoConfig = { ...autoConfig, ...(nextConfig ?? {}) };
    setAutoConfig(mergedCfg);

    const now = Date.now();
    directCloudMqtt.publishJson('fan1/set', {
      requestId: `req_cfg_${now}`,
      homeId: DEFAULT_HOME_ID,
      deviceId: 'fan1',
      desiredState: {
        mode: nextMode,
        tempThresholdHigh: mergedCfg.tempThresholdHigh,
        tempThresholdLow: mergedCfg.tempThresholdLow,
        smokeThresholdAdc: mergedCfg.smokeThresholdAdc,
        motionAutoLight: mergedCfg.motionAutoLight,
      },
      requestedBy: user?.uid || 'owner',
      timestamp: now,
    });

    appendActivityLog({
      id: `log_sec_${now}`,
      deviceId: 'esp32_main',
      action: `SECURITY_PIN_OK -> MODE_${nextMode}`,
      source: 'REMOTE_COMMAND',
      actorUid: currentActorLabel,
      timestamp: now,
    });

    if (firebaseAuth || backendConnected) {
      try {
        const updated = await apiClient.updateSystemMode(nextMode, nextConfig);
        setSystemMode(updated.systemMode);
        setAutoConfig(updated.autoConfig);
      } catch (error) {
        console.warn('Không thể lưu chế độ hệ thống:', error);
      }
    }
    showToast(`Đã cập nhật sang chế độ ${nextMode}`, 'success');
  };

  const toggleSystemMode = async (nextMode: SystemMode, nextConfig?: Partial<AutoConfig>) => {
    setPendingTargetMode(nextMode);
    setPendingDraftConfig(nextConfig ? { ...autoConfig, ...nextConfig } : autoConfig);
    setModeModalVisible(true);
  };

  const muteBuzzer = () => {
    const now = Date.now();
    directCloudMqtt.publishJson('buzzer/set', {
      requestId: `req_mute_${now}`,
      homeId: DEFAULT_HOME_ID,
      deviceId: 'buzzer',
      desiredState: { mute: true, power: 'OFF' },
      requestedBy: user?.uid || 'owner',
      timestamp: now,
    });
    setActiveBannerAlert(null);
    appendActivityLog({
      id: `log_mute_${now}`,
      deviceId: 'esp32_main',
      action: 'MUTE_BUZZER_REMOTE',
      source: 'REMOTE_COMMAND',
      actorUid: currentActorLabel,
      timestamp: now,
    });
    showToast('Đã gửi lệnh tắt còi báo động xuống ESP32', 'success');
  };

  const acknowledgeAlert = async (alertId: string) => {
    const targetAlert = alerts.find((a) => a.id === alertId);
    if (!targetAlert || targetAlert.acknowledged) return;

    const nextAlerts = alerts.map((a) =>
      a.id === alertId ? { ...a, acknowledged: true } : a
    );
    setAlerts(nextAlerts);

    const remainingCritical = nextAlerts.find(
      (a) => !a.acknowledged && a.severity === 'CRITICAL'
    );
    setActiveBannerAlert(remainingCritical ?? null);

    if (targetAlert.severity === 'CRITICAL' && !remainingCritical) {
      muteBuzzer();
    } else {
      showToast('Đã xác nhận xử lý cảnh báo an toàn', 'success');
    }

    if (backendConnected) {
      await apiClient.acknowledgeAlert(alertId).catch(() => {});
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
    setDevices((prev) =>
      prev.map((d) =>
        d.id === 'fan1' ? applyReportedStateToDevice(d, { power: 'ON', mode: 'AUTO' }, now) : d
      )
    );
    setAlerts((prev) => [newAlert, ...prev]);
    setActiveBannerAlert(newAlert);
    appendActivityLog({
      id: `log_auto_smoke_${now}`,
      deviceId: 'fan1',
      action: 'AUTO_FAN_ON_SMOKE_EMERGENCY',
      source: 'AUTO_RULE',
      actorUid: 'esp32_local_safety',
      timestamp: now,
    });
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
      ...prev.slice(0, MAX_LOCAL_SENSOR_READINGS - 1),
    ]);

    if (systemMode !== 'AUTO') return;

    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== 'fan1') return d;
        const currentPower = d.reportedState.power || 'OFF';
        let nextPower = currentPower;
        if (tempC >= autoConfig.tempThresholdHigh) nextPower = 'ON';
        else if (tempC <= autoConfig.tempThresholdLow) nextPower = 'OFF';

        if (nextPower !== currentPower) {
          appendActivityLog({
            id: `log_hysteresis_${now}`,
            deviceId: 'fan1',
            action: `AUTO_HYSTERESIS_FAN_${nextPower} (${tempC}°C)`,
            source: 'AUTO_RULE',
            actorUid: 'esp32_auto_hysteresis',
            timestamp: now,
          });
        }
        return applyReportedStateToDevice(d, { power: nextPower, mode: 'AUTO' }, now);
      })
    );
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

  const contextValue = useMemo<SmartHomeContextValue>(
    () => ({
      user,
      backendConnected,
      isInitialLoading,
      syncError,
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
      muteBuzzer,
      dismissBannerAlert,
      showToast,
      triggerDemoSmokeAlert,
      triggerDemoSensorUpdate,
      setSimulateEsp32Offline,
      updateApiBaseUrl,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      user,
      backendConnected,
      isInitialLoading,
      syncError,
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
      refreshAll,
      showToast,
    ]
  );

  return (
    <SmartHomeContext.Provider value={contextValue}>
      {children}
      <FeedbackToast toast={toast} onDismiss={dismissToast} />
      <SystemModeSecurityModal
        visible={modeModalVisible}
        currentMode={systemMode}
        targetMode={pendingTargetMode}
        autoConfig={pendingDraftConfig ?? autoConfig}
        securityPin={securityPin}
        userRole={user?.role}
        onClose={() => setModeModalVisible(false)}
        onConfirm={(confirmedMode, confirmedConfig) => {
          void applyConfirmedSystemMode(confirmedMode, confirmedConfig);
        }}
        onChangePin={handleChangePin}
        onBruteForceLockout={handleBruteForceLockout}
      />
    </SmartHomeContext.Provider>
  );
};
