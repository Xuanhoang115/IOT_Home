import admin from 'firebase-admin';
import { env, isFirebaseAdminConfigured } from '../config/env';
import { createInitialSeedData } from '../config/seedData';
import {
  ActivityLogRecord,
  AlertRecord,
  AutoConfig,
  CommandRecord,
  CommandStatus,
  DesiredState,
  DeviceId,
  DeviceRecord,
  Esp32StatusRecord,
  FullDatabaseSchema,
  HomeRecord,
  LatestSensorsRecord,
  NotificationTokenRecord,
  ReportedState,
  RoomId,
  RoomRecord,
  SensorReadingRecord,
  SystemMode,
} from '../types/smarthome';

export interface VerifiedUser {
  uid: string;
  email?: string;
}

export class FirebaseService {
  private mode: 'firebase-admin' | 'in-memory' = 'in-memory';
  private db: admin.database.Database | null = null;
  private memoryStore: FullDatabaseSchema;
  private pushLogHistory: Array<{
    homeId: string;
    title: string;
    body: string;
    data: Record<string, string>;
    timestamp: number;
  }> = [];

  constructor(forceInMemory = false) {
    this.memoryStore = createInitialSeedData(env.HOME_ID);

    if (!forceInMemory && isFirebaseAdminConfigured(env) && env.NODE_ENV !== 'test') {
      try {
        if (admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: env.FIREBASE_PROJECT_ID,
              clientEmail: env.FIREBASE_CLIENT_EMAIL,
              privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
            databaseURL: env.FIREBASE_DATABASE_URL,
          });
        }
        this.db = admin.database();
        this.mode = 'firebase-admin';
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[FirebaseService] Không thể khởi tạo Firebase Admin SDK (${message}). Tạm dùng bộ nhớ In-Memory.`
        );
        this.mode = 'in-memory';
      }
    }
  }

  public getMode(): 'firebase-admin' | 'in-memory' {
    return this.mode;
  }

  public resetMemoryStore(homeId = env.HOME_ID): void {
    this.memoryStore = createInitialSeedData(homeId);
    this.pushLogHistory = [];
  }

  public getPushLogHistory() {
    return [...this.pushLogHistory];
  }

  public async verifyIdToken(token: string): Promise<VerifiedUser> {
    if (!token || token.trim() === '') {
      throw new Error('Missing bearer token');
    }

    if (this.mode === 'firebase-admin') {
      const decoded = await admin.auth().verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email,
      };
    }

    // Chế độ In-Memory (Development / Vitest khi chưa cấu hình Firebase Admin):
    // Cho phép định dạng token: "dev-token:<uid>" hoặc khớp trực tiếp với uid trong seedData
    const normalized = token.startsWith('dev-token:')
      ? token.replace('dev-token:', '').trim()
      : token.trim();

    const userRecord = this.memoryStore.users[normalized];
    if (!userRecord) {
      throw new Error('Invalid or expired ID token');
    }

    return {
      uid: normalized,
      email: userRecord.email,
    };
  }

  public async hasHomeAccess(uid: string, homeId: string): Promise<boolean> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db.ref(`userHomes/${uid}/${homeId}`).get();
      return snap.exists() && snap.val() === true;
    }

    return this.memoryStore.userHomes[uid]?.[homeId] === true;
  }

  public async getHome(homeId: string): Promise<HomeRecord | null> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db.ref(`homes/${homeId}`).get();
      return snap.exists() ? (snap.val() as HomeRecord) : null;
    }
    return this.memoryStore.homes[homeId] ?? null;
  }

  public async updateHomeMode(
    homeId: string,
    systemMode: SystemMode,
    autoConfigPartial?: Partial<AutoConfig>
  ): Promise<HomeRecord> {
    const existing = (await this.getHome(homeId)) ?? createInitialSeedData(homeId).homes[homeId]!;
    const updated: HomeRecord = {
      ...existing,
      systemMode,
      autoConfig: {
        ...existing.autoConfig,
        ...(autoConfigPartial ?? {}),
      },
    };

    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`homes/${homeId}`).update({
        systemMode: updated.systemMode,
        autoConfig: updated.autoConfig,
      });
    } else {
      this.memoryStore.homes[homeId] = updated;
    }

    return updated;
  }

  public async updateEsp32Status(
    homeId: string,
    statusPatch: Partial<Esp32StatusRecord>
  ): Promise<Esp32StatusRecord> {
    const home = (await this.getHome(homeId)) ?? createInitialSeedData(homeId).homes[homeId]!;
    const updatedStatus: Esp32StatusRecord = {
      ...home.esp32Status,
      ...statusPatch,
    };

    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`homes/${homeId}/esp32Status`).update(updatedStatus);
    } else {
      if (!this.memoryStore.homes[homeId]) {
        this.memoryStore.homes[homeId] = home;
      }
      this.memoryStore.homes[homeId]!.esp32Status = updatedStatus;
    }

    return updatedStatus;
  }

  public async getRooms(homeId: string): Promise<RoomRecord[]> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db.ref(`rooms/${homeId}`).get();
      if (!snap.exists()) return [];
      return Object.values(snap.val() as Record<RoomId, RoomRecord>);
    }

    const roomsMap = this.memoryStore.rooms[homeId] ?? {};
    return Object.values(roomsMap);
  }

  public async getDevices(homeId: string): Promise<DeviceRecord[]> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db.ref(`devices/${homeId}`).get();
      if (!snap.exists()) return [];
      return Object.values(snap.val() as Record<DeviceId, DeviceRecord>);
    }

    const devicesMap = this.memoryStore.devices[homeId] ?? {};
    return Object.values(devicesMap);
  }

  public async getDevice(homeId: string, deviceId: DeviceId): Promise<DeviceRecord | null> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db.ref(`devices/${homeId}/${deviceId}`).get();
      return snap.exists() ? (snap.val() as DeviceRecord) : null;
    }

    return this.memoryStore.devices[homeId]?.[deviceId] ?? null;
  }

  public async saveDeviceDesiredState(
    homeId: string,
    deviceId: DeviceId,
    desiredState: DesiredState,
    requestId: string,
    timestamp: number
  ): Promise<DeviceRecord> {
    const existing = await this.getDevice(homeId, deviceId);
    if (!existing) {
      throw new Error(`Device ${deviceId} not found in home ${homeId}`);
    }

    const mergedDesiredState: DesiredState = {
      ...existing.desiredState,
      ...desiredState,
    };

    const updated: DeviceRecord = {
      ...existing,
      desiredState: mergedDesiredState,
      lastCommandStatus: 'PENDING',
      lastRequestId: requestId,
      lastUpdated: timestamp,
    };

    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`devices/${homeId}/${deviceId}`).update({
        desiredState: updated.desiredState,
        lastCommandStatus: updated.lastCommandStatus,
        lastRequestId: updated.lastRequestId,
        lastUpdated: updated.lastUpdated,
      });
    } else {
      this.memoryStore.devices[homeId]![deviceId] = updated;
    }

    return updated;
  }

  public async saveDeviceReportedState(
    homeId: string,
    deviceId: DeviceId,
    reportedState: ReportedState,
    commandStatus: CommandStatus,
    timestamp: number
  ): Promise<DeviceRecord> {
    const existing = await this.getDevice(homeId, deviceId);
    if (!existing) {
      throw new Error(`Device ${deviceId} not found in home ${homeId}`);
    }

    const mergedReported: ReportedState = {
      ...existing.reportedState,
      ...reportedState,
      ...(deviceId === 'door1' ? { positionVerified: reportedState.positionVerified ?? false } : {}),
    };

    // Khi nhận phản hồi từ nút vật lý hoặc chế độ AUTO, đồng bộ desiredState theo thực tế
    const syncedDesired: DesiredState = {
      ...existing.desiredState,
      ...(mergedReported.power !== undefined ? { power: mergedReported.power } : {}),
      ...(mergedReported.mode !== undefined ? { mode: mergedReported.mode } : {}),
      ...(mergedReported.doorState !== undefined ? { doorState: mergedReported.doorState } : {}),
      ...(mergedReported.currentAngle !== undefined
        ? { targetAngle: mergedReported.currentAngle }
        : {}),
    };

    const updated: DeviceRecord = {
      ...existing,
      desiredState: syncedDesired,
      reportedState: mergedReported,
      lastCommandStatus: commandStatus,
      lastUpdated: timestamp,
    };

    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`devices/${homeId}/${deviceId}`).update({
        desiredState: updated.desiredState,
        reportedState: updated.reportedState,
        lastCommandStatus: updated.lastCommandStatus,
        lastUpdated: updated.lastUpdated,
      });
    } else {
      this.memoryStore.devices[homeId]![deviceId] = updated;
    }

    return updated;
  }

  public async saveDeviceCommandStatus(
    homeId: string,
    deviceId: DeviceId,
    status: CommandStatus,
    timestamp: number
  ): Promise<void> {
    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`devices/${homeId}/${deviceId}`).update({
        lastCommandStatus: status,
        lastUpdated: timestamp,
      });
      return;
    }

    const existing = this.memoryStore.devices[homeId]?.[deviceId];
    if (existing) {
      existing.lastCommandStatus = status;
      existing.lastUpdated = timestamp;
    }
  }

  public async saveCommand(homeId: string, command: CommandRecord): Promise<void> {
    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`commands/${homeId}/${command.requestId}`).set(command);
      return;
    }

    if (!this.memoryStore.commands[homeId]) {
      this.memoryStore.commands[homeId] = {};
    }
    this.memoryStore.commands[homeId]![command.requestId] = command;
  }

  public async updateCommand(
    homeId: string,
    requestId: string,
    patch: Partial<CommandRecord>
  ): Promise<CommandRecord | null> {
    if (this.mode === 'firebase-admin' && this.db) {
      const ref = this.db.ref(`commands/${homeId}/${requestId}`);
      const snap = await ref.get();
      if (!snap.exists()) return null;
      await ref.update(patch);
      const updatedSnap = await ref.get();
      return updatedSnap.val() as CommandRecord;
    }

    const existing = this.memoryStore.commands[homeId]?.[requestId];
    if (!existing) return null;
    const updated: CommandRecord = { ...existing, ...patch };
    this.memoryStore.commands[homeId]![requestId] = updated;
    return updated;
  }

  public async getCommand(homeId: string, requestId: string): Promise<CommandRecord | null> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db.ref(`commands/${homeId}/${requestId}`).get();
      return snap.exists() ? (snap.val() as CommandRecord) : null;
    }

    return this.memoryStore.commands[homeId]?.[requestId] ?? null;
  }

  public async getRecentCommands(homeId: string, limit = 30): Promise<CommandRecord[]> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db
        .ref(`commands/${homeId}`)
        .orderByChild('createdAt')
        .limitToLast(limit)
        .get();
      if (!snap.exists()) return [];
      return Object.values(snap.val() as Record<string, CommandRecord>).sort(
        (a, b) => b.createdAt - a.createdAt
      );
    }

    const map = this.memoryStore.commands[homeId] ?? {};
    return Object.values(map)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  public async getLatestSensors(homeId: string): Promise<LatestSensorsRecord | null> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db.ref(`latestSensors/${homeId}`).get();
      return snap.exists() ? (snap.val() as LatestSensorsRecord) : null;
    }

    return this.memoryStore.latestSensors[homeId] ?? null;
  }

  public async updateLatestSensor<K extends keyof LatestSensorsRecord>(
    homeId: string,
    sensorKey: K,
    value: LatestSensorsRecord[K]
  ): Promise<LatestSensorsRecord> {
    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`latestSensors/${homeId}/${String(sensorKey)}`).set(value);
      const snap = await this.db.ref(`latestSensors/${homeId}`).get();
      return snap.val() as LatestSensorsRecord;
    }

    if (!this.memoryStore.latestSensors[homeId]) {
      this.memoryStore.latestSensors[homeId] = createInitialSeedData(homeId).latestSensors[homeId]!;
    }
    this.memoryStore.latestSensors[homeId]![sensorKey] = value;
    return this.memoryStore.latestSensors[homeId]!;
  }

  public async appendSensorReading(
    homeId: string,
    readingId: string,
    reading: SensorReadingRecord
  ): Promise<void> {
    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`sensorReadings/${homeId}/${readingId}`).set(reading);
      return;
    }

    if (!this.memoryStore.sensorReadings[homeId]) {
      this.memoryStore.sensorReadings[homeId] = {};
    }
    this.memoryStore.sensorReadings[homeId]![readingId] = reading;
  }

  public async getRecentSensorReadings(homeId: string, limit = 30): Promise<SensorReadingRecord[]> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db
        .ref(`sensorReadings/${homeId}`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .get();
      if (!snap.exists()) return [];
      return Object.values(snap.val() as Record<string, SensorReadingRecord>).sort(
        (a, b) => b.timestamp - a.timestamp
      );
    }

    const map = this.memoryStore.sensorReadings[homeId] ?? {};
    return Object.values(map)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  public async saveAlert(homeId: string, alert: AlertRecord): Promise<void> {
    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`alerts/${homeId}/${alert.id}`).set(alert);
      return;
    }

    if (!this.memoryStore.alerts[homeId]) {
      this.memoryStore.alerts[homeId] = {};
    }
    this.memoryStore.alerts[homeId]![alert.id] = alert;
  }

  public async getAlerts(homeId: string, limit = 50): Promise<AlertRecord[]> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db
        .ref(`alerts/${homeId}`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .get();
      if (!snap.exists()) return [];
      return Object.values(snap.val() as Record<string, AlertRecord>).sort(
        (a, b) => b.timestamp - a.timestamp
      );
    }

    const map = this.memoryStore.alerts[homeId] ?? {};
    return Object.values(map)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  public async acknowledgeAlert(homeId: string, alertId: string): Promise<AlertRecord | null> {
    if (this.mode === 'firebase-admin' && this.db) {
      const ref = this.db.ref(`alerts/${homeId}/${alertId}`);
      const snap = await ref.get();
      if (!snap.exists()) return null;
      await ref.update({ acknowledged: true });
      const updated = await ref.get();
      return updated.val() as AlertRecord;
    }

    const existing = this.memoryStore.alerts[homeId]?.[alertId];
    if (!existing) return null;
    existing.acknowledged = true;
    return existing;
  }

  public async appendActivityLog(homeId: string, log: ActivityLogRecord): Promise<void> {
    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`activityLogs/${homeId}/${log.id}`).set(log);
      return;
    }

    if (!this.memoryStore.activityLogs[homeId]) {
      this.memoryStore.activityLogs[homeId] = {};
    }
    this.memoryStore.activityLogs[homeId]![log.id] = log;
  }

  public async getActivityLogs(homeId: string, limit = 50): Promise<ActivityLogRecord[]> {
    if (this.mode === 'firebase-admin' && this.db) {
      const snap = await this.db
        .ref(`activityLogs/${homeId}`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .get();
      if (!snap.exists()) return [];
      return Object.values(snap.val() as Record<string, ActivityLogRecord>).sort(
        (a, b) => b.timestamp - a.timestamp
      );
    }

    const map = this.memoryStore.activityLogs[homeId] ?? {};
    return Object.values(map)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  public async saveNotificationToken(
    uid: string,
    record: NotificationTokenRecord
  ): Promise<NotificationTokenRecord> {
    if (this.mode === 'firebase-admin' && this.db) {
      await this.db.ref(`notificationTokens/${uid}/${record.deviceKey}`).set(record);
      return record;
    }

    if (!this.memoryStore.notificationTokens[uid]) {
      this.memoryStore.notificationTokens[uid] = {};
    }
    this.memoryStore.notificationTokens[uid]![record.deviceKey] = record;
    return record;
  }

  public async sendPushNotification(
    homeId: string,
    title: string,
    body: string,
    data: Record<string, string>
  ): Promise<number> {
    this.pushLogHistory.push({
      homeId,
      title,
      body,
      data,
      timestamp: Date.now(),
    });

    if (this.mode === 'firebase-admin' && this.db) {
      try {
        const userHomesSnap = await this.db.ref('userHomes').get();
        const tokensSnap = await this.db.ref('notificationTokens').get();
        if (!userHomesSnap.exists() || !tokensSnap.exists()) return 0;

        const userHomes = userHomesSnap.val() as Record<string, Record<string, boolean>>;
        const allTokens = tokensSnap.val() as Record<string, Record<string, NotificationTokenRecord>>;
        const fcmTokens: string[] = [];

        for (const [uid, homes] of Object.entries(userHomes)) {
          if (homes[homeId] === true && allTokens[uid]) {
            for (const rec of Object.values(allTokens[uid])) {
              if (rec.token && !rec.token.startsWith('ExponentPushToken')) {
                fcmTokens.push(rec.token);
              }
            }
          }
        }

        if (fcmTokens.length > 0) {
          const response = await admin.messaging().sendEachForMulticast({
            tokens: fcmTokens,
            notification: { title, body },
            data,
          });
          return response.successCount;
        }
      } catch (err) {
        console.warn('[FirebaseService] Lỗi khi gửi FCM push notification:', err);
      }
    }

    return 1;
  }
}

export const firebaseService = new FirebaseService();
