import path from 'path';
import dotenv from 'dotenv';
import mqtt from 'mqtt';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.HIVEMQ_HOST?.trim() || '';
const port = Number(process.env.HIVEMQ_PORT || 8883);
const protocol = (process.env.HIVEMQ_PROTOCOL || 'mqtts') as 'mqtts' | 'mqtt';
const username = process.env.HIVEMQ_USERNAME?.trim() || '';
const password = process.env.HIVEMQ_PASSWORD?.trim() || '';
const homeId = process.env.HOME_ID?.trim() || 'home1';

function isPlaceholder(value: string): boolean {
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes('your-cluster-id') ||
    lower.includes('your_strong_mqtt_password') ||
    lower.includes('<') ||
    lower.includes('example')
  );
}

async function runHiveMqCheck(): Promise<void> {
  console.log('==========================================================');
  console.log(' SMART HOME IoT 2026 - KIỂM TRA KẾT NỐI HIVEMQ CLOUD (TLS)');
  console.log('==========================================================');

  if (isPlaceholder(host) || isPlaceholder(username) || isPlaceholder(password)) {
    console.log('\n[HƯỚNG DẪN CẤU HÌNH AN TOÀN]:');
    console.log('Hiện tại chưa tìm thấy thông tin HiveMQ Cloud thật trong file backend/.env.');
    console.log('Để kiểm tra kết nối tới broker thật, bạn hãy thực hiện các bước sau:');
    console.log('  1. Copy file mẫu: Copy-Item backend/.env.example backend/.env');
    console.log('  2. Mở file backend/.env và điền thông tin từ HiveMQ Cloud Console:');
    console.log('     - HIVEMQ_HOST=<cluster-id>.s1.eu.hivemq.cloud');
    console.log('     - HIVEMQ_PORT=8883');
    console.log('     - HIVEMQ_PROTOCOL=mqtts');
    console.log('     - HIVEMQ_USERNAME=smarthome_backend');
    console.log('     - HIVEMQ_PASSWORD=<mật_khẩu_của_bạn>');
    console.log('  3. Chạy lại lệnh: npm --prefix backend run test:hivemq\n');
    process.exit(0);
  }

  const brokerUrl = `${protocol}://${host}:${port}`;
  const clientId = `smarthome-tester-${Math.random().toString(16).slice(2, 8)}`;
  const diagTopic = `smarthome/${homeId}/esp32/status`;

  console.log(`Đang kết nối tới ${brokerUrl} với ClientID=${clientId}...`);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error('Quá thời gian chờ kết nối (10 giây). Vui lòng kiểm tra Host/Port/Firewall.'));
    }, 10000);

    const client = mqtt.connect(brokerUrl, {
      clientId,
      username,
      password,
      clean: true,
      keepalive: 30,
      rejectUnauthorized: true,
    });

    client.on('connect', () => {
      console.log('[OK] Đã kết nối TLS thành công tới HiveMQ Cloud!');
      client.subscribe(`smarthome/${homeId}/#`, { qos: 1 }, (err) => {
        if (err) {
          clearTimeout(timeout);
          client.end(true);
          reject(err);
          return;
        }
        console.log(`[OK] Đã subscribe thành công topic: smarthome/${homeId}/# (QoS 1)`);
        clearTimeout(timeout);
        setTimeout(() => {
          console.log(`[OK] Đang đóng kết nối kiểm thử an toàn...`);
          client.end(false, () => resolve());
        }, 1500);
      });
    });

    client.on('message', (topic, payload) => {
      console.log(`[RETAINED/LIVE MSG] Topic: ${topic} | Payload: ${payload.toString()}`);
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      client.end(true);
      reject(err);
    });
  });

  console.log('[HOÀN TẤT] Kiểm thử HiveMQ Cloud TLS thành công!');
}

runHiveMqCheck().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[LỖI KẾT NỐI HIVEMQ]: ${message}`);
  process.exit(1);
});
