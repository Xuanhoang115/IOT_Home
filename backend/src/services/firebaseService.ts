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
  private tokenCache = new Map<string, { user: VerifiedUser; expiresAt: number }>();
  private homeAccessCache = new Map<string, boolean>();
  private cacheWarmed = new Set<string>();
  private lastStatusFlushedToDb = new Map<
    string,
    { online: boolean; rssi?: number; firmwareVersion?: string; flushedAt: number }
  >();
  private fcmDirectoryCache: {
    userHomes: Record<string, Record<string, boolean>>;
    allTokens: Record<string, Record<string, NotificationTokenRecord>>;
    expiresAt: number;
  } | null = null;
  private perfCounters = {
    esp32StatusDbWrites: 0,
    esp32StatusDbWritesSkipped: 0,
    fcmDirectoryCacheHits: 0,
    fcmDirectoryCacheMisses: 0,
  };
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
        void this.warmCacheFromFirebase(env.HOME_ID);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[FirebaseService] Không thể khởi tạo Firebase Admin SDK (${message}). Tạm dùng bộ nhớ In-Memory.`
        );
        this.mode = 'in-memory';
      }
    }
  }

  private async warmCacheFromFirebase(homeId: string): Promise<void> {
    if (this.mode !== 'firebase-admin' || !this.db || this.cacheWarmed.has(homeId)) return;
    this.cacheWarmed.add(homeId);
    try {
      const [homeSnap, roomsSnap, devicesSnap, latestSnap, alertsSnap, logsSnap, cmdsSnap] =
        await Promise.all([
          this.db.ref(`homes/${homeId}`).get(),
          this.db.ref(`rooms/${homeId}`).get(),
          this.db.ref(`devices/${homeId}`).get(),
          this.db.ref(`latestSensors/${homeId}`).get(),
          this.db.ref(`alerts/${homeId}`).limitToLast(50).get(),
          this.db.ref(`activityLogs/${homeId}`).limitToLast(50).get(),
          this.db.ref(`commands/${homeId}`).limitToLast(30).get(),
        ]);
      if (homeSnap.exists()) {
        const remoteHome = homeSnap.val() as HomeRecord;
        const currentStatus = this.memoryStore.homes[homeId]?.esp32Status;
        this.memoryStore.homes[homeId] = {
          ...remoteHome,
          esp32Status: {
            ...remoteHome.esp32Status,
            // Không kế thừa trạng thái online=true cũ từ phiên trước trong Firebase
            online: currentStatus?.reason === 'live_telemetry' ? true : false,
          },
        };
      }
      if (roomsSnap.exists()) this.memoryStore.rooms[homeId] = roomsSnap.val();
      if (devicesSnap.exists()) this.memoryStore.devices[homeId] = devicesSnap.val();
      if (latestSnap.exists()) this.memoryStore.latestSensors[homeId] = latestSnap.val();
      if (alertsSnap.exists()) this.memoryStore.alerts[homeId] = alertsSnap.val();
      if (logsSnap.exists()) this.memoryStore.activityLogs[homeId] = logsSnap.val();
      if (cmdsSnap.exists()) this.memoryStore.commands[homeId] = cmdsSnap.val();
    } catch (err) {
      console.warn('[FirebaseService] Không thể nạp cache ban đầu từ Firebase:', err);
    }
  }

  private bgWrite(task: Promise<unknown>): void {
    task.catch((err) => {
      console.warn('[FirebaseService] Lỗi đồng bộ nền lên Firebase:', err);
    });
  }

  private pruneMapByTimestamp<T>(
    map: Record<string, T>,
    getTs: (item: T) => number,
    maxEntries = 150
  ): void {
    const keys = Object.keys(map);
    if (keys.length <= maxEntries) return;
    keys
      .sort((a, b) => getTs(map[b]!) - getTs(map[a]!))
      .slice(maxEntries)
      .forEach((oldKey) => {
        delete map[oldKey];
      });
  }

  private upsertBucketRecord<T>(
    buckets: Record<string, Record<string, T>>,
    homeId: string,
    recordId: string,
    record: T,
    getTs: (item: T) => number,
    firebasePath: string,
    firebasePayload: unknown = record
  ): void {
    if (!buckets[homeId]) {
      buckets[homeId] = {};
    }
    buckets[homeId]![recordId] = record;
    this.pruneMapByTimestamp(buckets[homeId]!, getTs);

    if (this.mode === 'firebase-admin' && this.db) {
      this.bgWrite(this.db.ref(firebasePath).set(firebasePayload));
    }
  }

  private listBucketSorted<T>(
    buckets: Record<string, Record<string, T>>,
    homeId: string,
    getTs: (item: T) => number,
    limit: number
  ): T[] {
    const map = buckets[homeId] ?? {};
    return Object.values(map)
      .sort((a, b) => getTs(b) - getTs(a))
      .slice(0, limit);
  }

  public getMode(): 'firebase-admin' | 'in-memory' {
    return this.mode;
  }

  public resetMemoryStore(homeId = env.HOME_ID): void {
    this.memoryStore = createInitialSeedData(homeId);
    this.pushLogHistory = [];
    this.tokenCache.clear();
    this.homeAccessCache.clear();
    this.lastStatusFlushedToDb.clear();
    this.fcmDirectoryCache = null;
    this.perfCounters = {
      esp32StatusDbWrites: 0,
      esp32StatusDbWritesSkipped: 0,
      fcmDirectoryCacheHits: 0,
      fcmDirectoryCacheMisses: 0,
    };
  }

  public getPerfStats() {
    return { ...this.perfCounters };
  }

  public getPushLogHistory() {
    return [...this.pushLogHistory];
  }

  public async verifyIdToken(token: string): Promise<VerifiedUser> {
    if (!token || token.trim() === '') {
      throw new Error('Missing bearer token');
    }

    if (this.mode === 'firebase-admin') {
      const now = Date.now();
      const cached = this.tokenCache.get(token);
      if (cached && cached.expiresAt > now) {
        return cached.user;
      }
      if (this.tokenCache.size > 200) {
        for (const [k, v] of this.tokenCache.entries()) {
          if (v.expiresAt <= now) this.tokenCache.delete(k);
        }
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const user: VerifiedUser = {
        uid: decoded.uid,
        email: decoded.email,
      };
      this.tokenCache.set(token, { user, expiresAt: now + 300000 });
      return user;
    }

    // Chế độ In-Memory (Development / Vitest khi chưa cấu hình Firebase Admin):
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
      const cacheKey = `${uid}:${homeId}`;
      const cached = this.homeAccessCache.get(cacheKey);
      if (cached !== undefined) return cached;

      const snap = await this.db.ref(`userHomes/${uid}/${homeId}`).get();
      const allowed = snap.exists() && snap.val() === true;
      this.homeAccessCache.set(cacheKey, allowed);
      return allowed;
    }

    return this.memoryStore.userHomes[uid]?.[homeId] === true;
  }

  public async getHome(homeId: string): Promise<HomeRecord | null> {
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

    this.memoryStore.homes[homeId] = updated;
    if (this.mode === 'firebase-admin' && this.db) {
      this.bgWrite(
        this.db.ref(`homes/${homeId}`).update({
          systemMode: updated.systemMode,
          autoConfig: updated.autoConfig,
        })
      );
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

    if (!this.memoryStore.homes[homeId]) {
      this.memoryStore.homes[homeId] = home;
    }
    this.memoryStore.homes[homeId]!.esp32Status = updatedStatus;

    // Giảm >90% lượt ghi lặp lên Firebase RTDB: luôn ghi ngay khi online/rssi/firmware đổi,
    // còn heartbeat giữ nguyên trạng thái chỉ đồng bộ lên DB mỗi 30 giây (RAM cache vẫn luôn 0ms realtime).
    const now = Date.now();
    const lastFlushed = this.lastStatusFlushedToDb.get(homeId);
    const shouldFlushDb =
      !lastFlushed ||
      lastFlushed.online !== updatedStatus.online ||
      lastFlushed.firmwareVersion !== updatedStatus.firmwareVersion ||
      (updatedStatus.rssi !== undefined &&
        lastFlushed.rssi !== undefined &&
        Math.abs(updatedStatus.rssi - lastFlushed.rssi) >= 3) ||
      now - lastFlushed.flushedAt >= 30000;

    if (shouldFlushDb) {
      this.lastStatusFlushedToDb.set(homeId, {
        online: updatedStatus.online,
        rssi: updatedStatus.rssi,
        firmwareVersion: updatedStatus.firmwareVersion,
        flushedAt: now,
      });
      this.perfCounters.esp32StatusDbWrites += 1;
      if (this.mode === 'firebase-admin' && this.db) {
        this.bgWrite(this.db.ref(`homes/${homeId}/esp32Status`).update(updatedStatus));
      }
    } else {
      this.perfCounters.esp32StatusDbWritesSkipped += 1;
    }

    return updatedStatus;
  }

  public async getRooms(homeId: string): Promise<RoomRecord[]> {
    const roomsMap = this.memoryStore.rooms[homeId] ?? {};
    return Object.values(roomsMap);
  }

  public async getDevices(homeId: string): Promise<DeviceRecord[]> {
    const devicesMap = this.memoryStore.devices[homeId] ?? {};
    return Object.values(devicesMap);
  }

  public async getDevice(homeId: string, deviceId: DeviceId): Promise<DeviceRecord | null> {
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

    this.memoryStore.devices[homeId]![deviceId] = updated;
    if (this.mode === 'firebase-admin' && this.db) {
      this.bgWrite(
        this.db.ref(`devices/${homeId}/${deviceId}`).update({
          desiredState: updated.desiredState,
          lastCommandStatus: updated.lastCommandStatus,
          lastRequestId: updated.lastRequestId,
          lastUpdated: updated.lastUpdated,
        })
      );
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

    this.memoryStore.devices[homeId]![deviceId] = updated;
    if (this.mode === 'firebase-admin' && this.db) {
      this.bgWrite(
        this.db.ref(`devices/${homeId}/${deviceId}`).update({
          desiredState: updated.desiredState,
          reportedState: updated.reportedState,
          lastCommandStatus: updated.lastCommandStatus,
          lastUpdated: updated.lastUpdated,
        })
      );
    }

    return updated;
  }

  public async saveDeviceCommandStatus(
    homeId: string,
    deviceId: DeviceId,
    status: CommandStatus,
    timestamp: number
  ): Promise<void> {
    const existing = this.memoryStore.devices[homeId]?.[deviceId];
    if (existing) {
      existing.lastCommandStatus = status;
      existing.lastUpdated = timestamp;
    }
    if (this.mode === 'firebase-admin' && this.db) {
      this.bgWrite(
        this.db.ref(`devices/${homeId}/${deviceId}`).update({
          lastCommandStatus: status,
          lastUpdated: timestamp,
        })
      );
    }
  }

  public async saveCommand(homeId: string, command: CommandRecord): Promise<void> {
    this.upsertBucketRecord(
      this.memoryStore.commands,
      homeId,
      command.requestId,
      command,
      (c) => c.createdAt,
      `commands/${homeId}/${command.requestId}`
    );
  }

  public async updateCommand(
    homeId: string,
    requestId: string,
    patch: Partial<CommandRecord>
  ): Promise<CommandRecord | null> {
    const existing = this.memoryStore.commands[homeId]?.[requestId];
    if (!existing) return null;
    const updated: CommandRecord = { ...existing, ...patch };
    this.memoryStore.commands[homeId]![requestId] = updated;

    if (this.mode === 'firebase-admin' && this.db) {
      this.bgWrite(this.db.ref(`commands/${homeId}/${requestId}`).update(patch));
    }
    return updated;
  }

  public async getCommand(homeId: string, requestId: string): Promise<CommandRecord | null> {
    return this.memoryStore.commands[homeId]?.[requestId] ?? null;
  }

  public async getRecentCommands(homeId: string, limit = 30): Promise<CommandRecord[]> {
    return this.listBucketSorted(this.memoryStore.commands, homeId, (c) => c.createdAt, limit);
  }

  public async getLatestSensors(homeId: string): Promise<LatestSensorsRecord | null> {
    return this.memoryStore.latestSensors[homeId] ?? null;
  }

  public async updateLatestSensor<K extends keyof LatestSensorsRecord>(
    homeId: string,
    sensorKey: K,
    value: LatestSensorsRecord[K]
  ): Promise<LatestSensorsRecord> {
    if (!this.memoryStore.latestSensors[homeId]) {
      this.memoryStore.latestSensors[homeId] = createInitialSeedData(homeId).latestSensors[homeId]!;
    }
    this.memoryStore.latestSensors[homeId]![sensorKey] = value;

    if (this.mode === 'firebase-admin' && this.db) {
      this.bgWrite(this.db.ref(`latestSensors/${homeId}/${String(sensorKey)}`).set(value));
    }
    return this.memoryStore.latestSensors[homeId]!;
  }

  public async appendSensorReading(
    homeId: string,
    readingId: string,
    reading: SensorReadingRecord
  ): Promise<void> {
    this.upsertBucketRecord(
      this.memoryStore.sensorReadings,
      homeId,
      readingId,
      reading,
      (r) => r.timestamp,
      `sensorReadings/${homeId}/${readingId}`
    );
  }

  public async getRecentSensorReadings(homeId: string, limit = 30): Promise<SensorReadingRecord[]> {
    return this.listBucketSorted(
      this.memoryStore.sensorReadings,
      homeId,
      (r) => r.timestamp,
      limit
    );
  }

  public async saveAlert(homeId: string, alert: AlertRecord): Promise<void> {
    const firebaseAlert = Object.fromEntries(
      Object.entries(alert).filter(([, value]) => value !== undefined)
    );
    this.upsertBucketRecord(
      this.memoryStore.alerts,
      homeId,
      alert.id,
      alert,
      (a) => a.timestamp,
      `alerts/${homeId}/${alert.id}`,
      firebaseAlert
    );
  }

  public async getAlerts(homeId: string, limit = 50): Promise<AlertRecord[]> {
    return this.listBucketSorted(this.memoryStore.alerts, homeId, (a) => a.timestamp, limit);
  }

  public async acknowledgeAlert(homeId: string, alertId: string): Promise<AlertRecord | null> {
    const existing = this.memoryStore.alerts[homeId]?.[alertId];
    if (!existing) return null;
    existing.acknowledged = true;

    if (this.mode === 'firebase-admin' && this.db) {
      this.bgWrite(this.db.ref(`alerts/${homeId}/${alertId}`).update({ acknowledged: true }));
    }
    return existing;
  }

  public async appendActivityLog(homeId: string, log: ActivityLogRecord): Promise<void> {
    this.upsertBucketRecord(
      this.memoryStore.activityLogs,
      homeId,
      log.id,
      log,
      (l) => l.timestamp,
      `activityLogs/${homeId}/${log.id}`
    );
  }

  public async getActivityLogs(homeId: string, limit = 50): Promise<ActivityLogRecord[]> {
    return this.listBucketSorted(this.memoryStore.activityLogs, homeId, (l) => l.timestamp, limit);
  }

  public async saveNotificationToken(
    uid: string,
    record: NotificationTokenRecord
  ): Promise<NotificationTokenRecord> {
    this.fcmDirectoryCache = null;
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
    if (this.pushLogHistory.length > 100) {
      this.pushLogHistory = this.pushLogHistory.slice(-100);
    }

    if (this.mode === 'firebase-admin' && this.db) {
      try {
        const now = Date.now();
        let userHomes: Record<string, Record<string, boolean>>;
        let allTokens: Record<string, Record<string, NotificationTokenRecord>>;

        if (this.fcmDirectoryCache && this.fcmDirectoryCache.expiresAt > now) {
          this.perfCounters.fcmDirectoryCacheHits += 1;
          userHomes = this.fcmDirectoryCache.userHomes;
          allTokens = this.fcmDirectoryCache.allTokens;
        } else {
          this.perfCounters.fcmDirectoryCacheMisses += 1;
          const [userHomesSnap, tokensSnap] = await Promise.all([
            this.db.ref('userHomes').get(),
            this.db.ref('notificationTokens').get(),
          ]);
          if (!userHomesSnap.exists() || !tokensSnap.exists()) return 0;

          userHomes = userHomesSnap.val() as Record<string, Record<string, boolean>>;
          allTokens = tokensSnap.val() as Record<string, Record<string, NotificationTokenRecord>>;
          this.fcmDirectoryCache = {
            userHomes,
            allTokens,
            expiresAt: now + 60000,
          };
        }

        const tokenEntries: Array<{ token: string; path: string }> = [];

        for (const [uid, homes] of Object.entries(userHomes)) {
          if (homes[homeId] === true && allTokens[uid]) {
            for (const [deviceKey, rec] of Object.entries(allTokens[uid])) {
              if (rec.token && !rec.token.startsWith('ExponentPushToken')) {
                tokenEntries.push({
                  token: rec.token,
                  path: `notificationTokens/${uid}/${deviceKey}`,
                });
              }
            }
          }
        }

        const uniqueTokens = [...new Set(tokenEntries.map((e) => e.token))];
        if (uniqueTokens.length > 0) {
          const response = await admin.messaging().sendEachForMulticast({
            tokens: uniqueTokens,
            notification: { title, body },
            android: { notification: { channelId: 'alerts' } },
            data,
          });
          // Tự động dọn sạch các FCM token đã hết hạn hoặc bị gỡ app khỏi Firebase
          let removedDeadToken = false;
          response.responses.forEach((res, idx) => {
            const errCode = res.error?.code;
            if (
              !res.success &&
              (errCode === 'messaging/registration-token-not-registered' ||
                errCode === 'messaging/invalid-registration-token')
            ) {
              removedDeadToken = true;
              const deadToken = uniqueTokens[idx];
              tokenEntries
                .filter((e) => e.token === deadToken)
                .forEach((e) => {
                  this.bgWrite(this.db!.ref(e.path).remove());
                });
            }
          });
          if (removedDeadToken) {
            this.fcmDirectoryCache = null;
          }
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
