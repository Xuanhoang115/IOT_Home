import fs from 'fs';
import path from 'path';
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

  app.use('/api', apiRateLimiter);
  app.use(
    '/api',
    createApiRouter({
      store,
      cmdSvc,
      mqttSvc,
    })
  );

  // Nếu có bản build giao diện Web (mobile/dist), phục vụ luôn giao diện Smart Home ngay tại trang chủ!
  const candidateWebDirs = [
    path.resolve(__dirname, '../../../mobile/dist'),
    path.resolve(__dirname, '../../mobile/dist'),
  ];
  const webDistDir = candidateWebDirs.find((dir) =>
    fs.existsSync(path.join(dir, 'index.html'))
  );

  if (webDistDir) {
    app.use(express.static(webDistDir));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(webDistDir, 'index.html'));
    });
  } else {
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
  }

  app.use(errorHandler);
  return app;
}
