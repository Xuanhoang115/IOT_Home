import { Router } from 'express';
import { ApiController } from '../controllers/apiController';
import { createAuthMiddleware } from '../middleware/authMiddleware';
import { commandRateLimiter } from '../middleware/rateLimiter';
import { MqttBridgeService, mqttBridgeService } from '../mqtt/mqttClient';
import { CommandService, commandService } from '../services/commandService';
import { FirebaseService, firebaseService } from '../services/firebaseService';

export function createApiRouter(deps?: {
  store?: FirebaseService;
  cmdSvc?: CommandService;
  mqttSvc?: MqttBridgeService;
}): Router {
  const store = deps?.store ?? firebaseService;
  const cmdSvc = deps?.cmdSvc ?? commandService;
  const mqttSvc = deps?.mqttSvc ?? mqttBridgeService;

  const router = Router();
  const controller = new ApiController(store, cmdSvc, mqttSvc);
  const authMiddleware = createAuthMiddleware(store);

  // Public healthcheck endpoint
  router.get('/health', controller.getHealth);

  // Protected endpoints (Require Firebase ID Token + home1 access)
  router.get('/rooms', authMiddleware, controller.getRooms);
  router.get('/devices', authMiddleware, controller.getDevices);
  router.get('/devices/:id', authMiddleware, controller.getDeviceById);
  router.post(
    '/devices/:id/commands',
    authMiddleware,
    commandRateLimiter,
    controller.postDeviceCommand
  );
  router.patch('/home/mode', authMiddleware, controller.updateSystemMode);
  router.get('/sensors/latest', authMiddleware, controller.getLatestSensors);
  router.get('/alerts', authMiddleware, controller.getAlerts);
  router.post('/alerts/:id/ack', authMiddleware, controller.acknowledgeAlert);
  router.get('/history', authMiddleware, controller.getHistory);
  router.post(
    '/notifications/register-token',
    authMiddleware,
    controller.registerNotificationToken
  );

  return router;
}
