import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { MqttBridgeService, mqttBridgeService } from '../mqtt/mqttClient';
import {
  commandBodySchema,
  deviceIdSchema,
  registerNotificationTokenSchema,
  systemModeUpdateSchema,
  validateDeviceDesiredState,
} from '../schemas/validation';
import { CommandService, commandService } from '../services/commandService';
import { FirebaseService, firebaseService } from '../services/firebaseService';
import { DeviceId } from '../types/smarthome';

export class ApiController {
  constructor(
    private readonly store: FirebaseService = firebaseService,
    private readonly cmdSvc: CommandService = commandService,
    private readonly mqttSvc: MqttBridgeService = mqttBridgeService
  ) {}

  private resolveHomeId(req: Request): string {
    return req.homeId || env.HOME_ID;
  }

  private parseDeviceIdOrThrow(rawId: unknown): DeviceId {
    const parsedId = deviceIdSchema.safeParse(rawId);
    if (!parsedId.success) {
      throw new ApiError(404, `Thiết bị '${String(rawId)}' không tồn tại`, 'DEVICE_NOT_FOUND');
    }
    return parsedId.data;
  }

  public getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const homeId = (req.query.homeId as string | undefined) || env.HOME_ID;
      const home = await this.store.getHome(homeId);
      res.json({
        success: true,
        data: {
          status: 'ok',
          homeId,
          storageMode: this.store.getMode(),
          mqttConnected: this.mqttSvc.isConnected(),
          esp32Status: home?.esp32Status ?? null,
          systemMode: home?.systemMode ?? 'MANUAL',
          timestamp: Date.now(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Endpoint tổng hợp: gộp 6 API (/health, /rooms, /devices, /sensors/latest, /alerts, /history)
   * thành 1 HTTP request duy nhất để giảm 6x overhead mạng & auth middleware trên Mobile/Web.
   */
  public getSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const homeId = this.resolveHomeId(req);
      const [home, rooms, devices, latest, recentReadings, alerts, activityLogs, commands] =
        await Promise.all([
          this.store.getHome(homeId),
          this.store.getRooms(homeId),
          this.store.getDevices(homeId),
          this.store.getLatestSensors(homeId),
          this.store.getRecentSensorReadings(homeId, 20),
          this.store.getAlerts(homeId, 50),
          this.store.getActivityLogs(homeId, 50),
          this.store.getRecentCommands(homeId, 50),
        ]);

      const enrichedRooms = rooms.map((room) => ({
        ...room,
        devices: devices.filter((dev) => dev.roomId === room.id),
      }));

      res.json({
        success: true,
        data: {
          health: {
            status: 'ok',
            homeId,
            storageMode: this.store.getMode(),
            mqttConnected: this.mqttSvc.isConnected(),
            esp32Status: home?.esp32Status ?? null,
            systemMode: home?.systemMode ?? 'MANUAL',
            timestamp: Date.now(),
          },
          rooms: enrichedRooms,
          devices,
          sensors: {
            latest,
            recentReadings,
          },
          alerts,
          history: {
            activityLogs,
            commands,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public getRooms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const homeId = this.resolveHomeId(req);
      const [rooms, devices] = await Promise.all([
        this.store.getRooms(homeId),
        this.store.getDevices(homeId),
      ]);

      const enrichedRooms = rooms.map((room) => ({
        ...room,
        devices: devices.filter((dev) => dev.roomId === room.id),
      }));

      res.json({
        success: true,
        data: enrichedRooms,
      });
    } catch (err) {
      next(err);
    }
  };

  public getDevices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const homeId = this.resolveHomeId(req);
      const roomFilter = req.query.roomId as string | undefined;
      const devices = await this.store.getDevices(homeId);
      const filtered = roomFilter ? devices.filter((d) => d.roomId === roomFilter) : devices;

      res.json({
        success: true,
        data: filtered,
      });
    } catch (err) {
      next(err);
    }
  };

  public getDeviceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const homeId = this.resolveHomeId(req);
      const deviceId = this.parseDeviceIdOrThrow(req.params.id);

      const device = await this.store.getDevice(homeId, deviceId);
      if (!device) {
        throw new ApiError(404, `Thiết bị '${deviceId}' không tồn tại`, 'DEVICE_NOT_FOUND');
      }

      res.json({
        success: true,
        data: device,
      });
    } catch (err) {
      next(err);
    }
  };

  public postDeviceCommand = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const homeId = this.resolveHomeId(req);
      const deviceId = this.parseDeviceIdOrThrow(req.params.id);

      const body = commandBodySchema.parse(req.body);
      const validatedDesiredState = validateDeviceDesiredState(deviceId, body.desiredState);
      const requestedBy = req.user?.uid ?? 'unknown_user';

      const result = await this.cmdSvc.sendDeviceCommand({
        homeId,
        deviceId,
        desiredState: validatedDesiredState,
        requestedBy,
      });

      res.status(202).json({
        success: true,
        message: 'Đã gửi lệnh điều khiển, đang chờ phản hồi reportedState từ ESP32',
        data: {
          requestId: result.command.requestId,
          status: result.command.status,
          device: result.device,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public updateSystemMode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const homeId = this.resolveHomeId(req);
      const body = systemModeUpdateSchema.parse(req.body);
      const fan = await this.store.getDevice(homeId, 'fan1');
      if (!fan) {
        throw new ApiError(404, 'Không tìm thấy quạt fan1.', 'DEVICE_NOT_FOUND');
      }
      if (fan.reportedState.mode !== body.systemMode || fan.desiredState.mode !== body.systemMode) {
        if (this.store.getMode() === 'firebase-admin' && !this.mqttSvc.isConnected()) {
          throw new ApiError(503, 'Backend chưa kết nối MQTT.', 'MQTT_DISCONNECTED');
        }
        await this.cmdSvc.sendDeviceCommand({
          homeId,
          deviceId: 'fan1',
          desiredState: { mode: body.systemMode },
          requestedBy: req.user?.uid ?? 'unknown_user',
        });
      }
      const updatedHome = await this.store.updateHomeMode(
        homeId,
        body.systemMode,
        body.autoConfig
      );

      res.json({
        success: true,
        data: updatedHome,
      });
    } catch (err) {
      next(err);
    }
  };

  public getLatestSensors = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const homeId = this.resolveHomeId(req);
      const [latest, readings] = await Promise.all([
        this.store.getLatestSensors(homeId),
        this.store.getRecentSensorReadings(homeId, 20),
      ]);

      res.json({
        success: true,
        data: {
          latest,
          recentReadings: readings,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public getAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const homeId = this.resolveHomeId(req);
      const limit = Number(req.query.limit || 50);
      const alerts = await this.store.getAlerts(homeId, limit);

      res.json({
        success: true,
        data: alerts,
      });
    } catch (err) {
      next(err);
    }
  };

  public acknowledgeAlert = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const homeId = this.resolveHomeId(req);
      const alertId = String(req.params.id || '');
      const updated = await this.store.acknowledgeAlert(homeId, alertId);
      if (!updated) {
        throw new ApiError(404, `Không tìm thấy cảnh báo '${alertId}'`, 'ALERT_NOT_FOUND');
      }

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  public getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const homeId = this.resolveHomeId(req);
      const limit = Number(req.query.limit || 50);
      const [activityLogs, recentCommands] = await Promise.all([
        this.store.getActivityLogs(homeId, limit),
        this.store.getRecentCommands(homeId, limit),
      ]);

      res.json({
        success: true,
        data: {
          activityLogs,
          commands: recentCommands,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public registerNotificationToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        throw new ApiError(401, 'Chưa xác thực người dùng', 'UNAUTHORIZED');
      }

      const parsed = registerNotificationTokenSchema.parse(req.body);
      const saved = await this.store.saveNotificationToken(uid, {
        token: parsed.token,
        platform: parsed.platform,
        deviceKey: parsed.deviceKey,
        updatedAt: Date.now(),
      });

      res.status(201).json({
        success: true,
        data: saved,
      });
    } catch (err) {
      next(err);
    }
  };
}
