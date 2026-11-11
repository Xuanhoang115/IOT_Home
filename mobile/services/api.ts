import {
  ActivityLogRecord,
  AlertRecord,
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

const DEFAULT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:3000';

export class SmartHomeApiClient {
  private baseUrl: string = DEFAULT_API_BASE_URL;
  private token: string = 'dev-token:uid_student_01';

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public setToken(token: string): void {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
          ...(options.headers || {}),
        },
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        const errMsg = json?.error?.message || `HTTP Error ${response.status}`;
        throw new Error(errMsg);
      }
      return json.data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  public async getHealth(): Promise<{
    status: string;
    homeId: string;
    storageMode: string;
    mqttConnected: boolean;
    esp32Status: Esp32StatusRecord | null;
    systemMode: SystemMode;
  }> {
    return this.request('/api/health');
  }

  public async getRooms(): Promise<RoomRecord[]> {
    return this.request('/api/rooms');
  }

  public async getDevices(): Promise<DeviceRecord[]> {
    return this.request('/api/devices');
  }

  public async sendCommand(
    deviceId: DeviceId,
    desiredState: DesiredState
  ): Promise<{
    requestId: string;
    status: string;
    device: DeviceRecord;
  }> {
    return this.request(`/api/devices/${deviceId}/commands`, {
      method: 'POST',
      body: JSON.stringify({ desiredState }),
    });
  }

  public async updateSystemMode(
    systemMode: SystemMode,
    autoConfig?: Partial<AutoConfig>
  ): Promise<{
    systemMode: SystemMode;
    autoConfig: AutoConfig;
  }> {
    return this.request('/api/home/mode', {
      method: 'PATCH',
      body: JSON.stringify({ systemMode, autoConfig }),
    });
  }

  public async getSensors(): Promise<{
    latest: LatestSensorsRecord;
    recentReadings: SensorReadingRecord[];
  }> {
    return this.request('/api/sensors/latest');
  }

  public async getAlerts(): Promise<AlertRecord[]> {
    return this.request('/api/alerts');
  }

  public async acknowledgeAlert(alertId: string): Promise<AlertRecord> {
    return this.request(`/api/alerts/${alertId}/ack`, {
      method: 'POST',
    });
  }

  public async getHistory(): Promise<{
    activityLogs: ActivityLogRecord[];
    commands: CommandRecord[];
  }> {
    return this.request('/api/history');
  }

  public async registerPushToken(
    token: string,
    platform: 'android' | 'ios' | 'web',
    deviceKey: string
  ): Promise<void> {
    await this.request('/api/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform, deviceKey }),
    });
  }
}

export const apiClient = new SmartHomeApiClient();
