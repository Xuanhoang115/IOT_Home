import cors from 'cors';
import express, { Express } from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import { MqttBridgeService, mqttBridgeService } from './mqtt/mqttClient';
import { createApiRouter } from './routes/api';
import { CommandService, commandService } from './services/commandService';
import { FirebaseService, firebaseService } from './services/firebaseService';

export function createApp(deps?: {
  store?: FirebaseService;
  cmdSvc?: CommandService;
  mqttSvc?: MqttBridgeService;
}): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '64kb' }));
  const store = deps?.store ?? firebaseService;
  const cmdSvc = deps?.cmdSvc ?? commandService;
  const mqttSvc = deps?.mqttSvc ?? mqttBridgeService;

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      service: 'SMART HOME IoT 2026 — Cloud Backend API',
      status: 'online',
      homeId: env.HOME_ID,
      storageMode: store.getMode(),
      mqttConnected: mqttSvc.isConnected(),
      endpoints: {
        health: '/api/health',
        snapshot: '/api/snapshot',
      },
    });
  });

  app.use('/api', apiRateLimiter);
  app.use(
    '/api',
    createApiRouter({
      store,
      cmdSvc,
      mqttSvc,
    })
  );

  app.use(errorHandler);
  return app;
}
