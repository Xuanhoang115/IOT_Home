import { createApp } from './app';
import { env } from './config/env';
import { mqttBridgeService } from './mqtt/mqttClient';
import { firebaseService } from './services/firebaseService';

const app = createApp();

mqttBridgeService.start();

const server = app.listen(env.PORT, () => {
  console.log('==========================================================');
  console.log(` SMART HOME IoT 2026 - BACKEND SERVER RUNNING`);
  console.log(` - Port           : http://localhost:${env.PORT}`);
  console.log(` - Home ID        : ${env.HOME_ID}`);
  console.log(` - Storage Mode   : ${firebaseService.getMode()}`);
  console.log(` - Health Check   : http://localhost:${env.PORT}/api/health`);
  console.log('==========================================================');
});

process.on('SIGINT', async () => {
  console.log('\n[Backend] Đang đóng kết nối MQTT và dừng server...');
  await mqttBridgeService.stop();
  server.close(() => {
    process.exit(0);
  });
});
