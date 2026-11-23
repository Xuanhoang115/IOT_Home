import http from 'http';
import { performance } from 'perf_hooks';
import { createApp } from '../src/app';
import { MqttBridgeService } from '../src/mqtt/mqttClient';
import { CommandService } from '../src/services/commandService';
import { FirebaseService } from '../src/services/firebaseService';
import { SensorAndAlertService } from '../src/services/sensorAndAlertService';

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx] ?? 0;
}

function average(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0) / Math.max(1, values.length);
}

async function fetchJson(baseUrl: string, path: string, token: string): Promise<void> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  await res.json();
}

async function runBenchmark() {
  const store = new FirebaseService(true);
  const cmdSvc = new CommandService(store, async () => {}, 5000);
  const sensorAlertSvc = new SensorAndAlertService(store, 60000, 60000);
  const mqttSvc = new MqttBridgeService(cmdSvc, sensorAlertSvc, 'home1');
  const app = createApp({ store, cmdSvc, mqttSvc });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3999;
  const baseUrl = `http://127.0.0.1:${port}`;
  const token = 'dev-token:uid_student_01';

  const ITERATIONS = 50;

  // 1. Đo API Sync: TRƯỚC (6 HTTP requests rời) vs SAU (1 HTTP request /api/snapshot)
  const sixReqLatencies: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    await Promise.all([
      fetchJson(baseUrl, '/api/health', token),
      fetchJson(baseUrl, '/api/rooms', token),
      fetchJson(baseUrl, '/api/devices', token),
      fetchJson(baseUrl, '/api/sensors/latest', token),
      fetchJson(baseUrl, '/api/alerts', token),
      fetchJson(baseUrl, '/api/history', token),
    ]);
    sixReqLatencies.push(performance.now() - t0);
  }

  const snapshotLatencies: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    await fetchJson(baseUrl, '/api/snapshot', token);
    snapshotLatencies.push(performance.now() - t0);
  }

  // 2. Đo Write Amplification lên Firebase RTDB khi ESP32 gửi 100 gói MQTT liên tục
  store.resetMemoryStore('home1');
  for (let i = 0; i < 100; i++) {
    await store.updateEsp32Status('home1', {
      online: true,
      rssi: -56,
      lastSeen: Date.now() + i * 500,
    });
  }
  const perfStats = store.getPerfStats();

  // 3. Đo giới hạn RAM Cache (Memory Stability) sau 1.000 sự kiện liên tiếp
  const heapBeforeMb = process.memoryUsage().heapUsed / 1024 / 1024;
  for (let i = 0; i < 1000; i++) {
    await store.appendActivityLog('home1', {
      id: `bench_log_${i}`,
      deviceId: 'light1',
      action: i % 2 === 0 ? 'TURN_ON' : 'TURN_OFF',
      source: 'REMOTE_COMMAND',
      actorUid: 'uid_student_01',
      timestamp: Date.now() + i,
    });
  }
  const retainedLogs = (await store.getActivityLogs('home1', 500)).length;
  const heapAfterMb = process.memoryUsage().heapUsed / 1024 / 1024;

  await new Promise<void>((resolve) => server.close(() => resolve()));

  const avg6 = average(sixReqLatencies);
  const p95_6 = percentile(sixReqLatencies, 0.95);
  const avg1 = average(snapshotLatencies);
  const p95_1 = percentile(snapshotLatencies, 0.95);
  const speedupPct = ((avg6 - avg1) / avg6) * 100;
  const dbWriteSavedPct =
    (perfStats.esp32StatusDbWritesSkipped /
      (perfStats.esp32StatusDbWrites + perfStats.esp32StatusDbWritesSkipped)) *
    100;

  console.log('\n================ SMART HOME PERFORMANCE BENCHMARK ================');
  console.log(
    `1) API Sync (50 chu ky):` +
      `\n   - TRUOC (6 requests/chu ky): Avg = ${avg6.toFixed(2)} ms | P95 = ${p95_6.toFixed(2)} ms | Total HTTP reqs = ${ITERATIONS * 6}` +
      `\n   - SAU   (1 /api/snapshot)  : Avg = ${avg1.toFixed(2)} ms | P95 = ${p95_1.toFixed(2)} ms | Total HTTP reqs = ${ITERATIONS}` +
      `\n   => Giam do tre: ${speedupPct.toFixed(1)}% | Giam so HTTP request: 6.0x (83.3%)`
  );
  console.log(
    `\n2) Firebase RTDB Write Amplification (100 goi heartbeat/telemetry):` +
      `\n   - TRUOC (ghi moi goi tin)  : 100 luot ghi RTDB` +
      `\n   - SAU   (throttle 30s)     : ${perfStats.esp32StatusDbWrites} luot ghi RTDB (bo qua ${perfStats.esp32StatusDbWritesSkipped} luot du thua)` +
      `\n   => Giam luot ghi RTDB: ${dbWriteSavedPct.toFixed(1)}%`
  );
  console.log(
    `\n3) Backend Memory Bound (1.000 su kien activityLogs lien tiep):` +
      `\n   - Ban ghi giu trong RAM    : ${retainedLogs} / 1000 (gioi han <= 150)` +
      `\n   - Heap Used truoc -> sau   : ${heapBeforeMb.toFixed(2)} MB -> ${heapAfterMb.toFixed(2)} MB (delta: ${(heapAfterMb - heapBeforeMb).toFixed(2)} MB)`
  );
  console.log('==================================================================\n');
  process.exit(0);
}

void runBenchmark();
