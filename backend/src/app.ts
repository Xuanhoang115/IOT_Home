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
  app.use('/api', apiRateLimiter);
  app.use(
    '/api',
    createApiRouter({
      store: deps?.store ?? firebaseService,
      cmdSvc: deps?.cmdSvc ?? commandService,
      mqttSvc: deps?.mqttSvc ?? mqttBridgeService,
    })
  );

  app.use(errorHandler);
  return app;
}
