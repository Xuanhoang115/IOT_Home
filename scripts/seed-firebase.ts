import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { createInitialSeedData } from '../backend/src/config/seedData';
import { env, isFirebaseAdminConfigured } from '../backend/src/config/env';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

async function seedFirebaseDatabase(): Promise<void> {
  console.log('==========================================================');
  console.log(' SMART HOME IoT 2026 - SEED DỮ LIỆU MẪU FIREBASE (PHASE 5)');
  console.log('==========================================================');

  const homeId = env.HOME_ID || 'home1';
  const seedPayload = createInitialSeedData(homeId, Date.now());

  if (!isFirebaseAdminConfigured(env)) {
    console.log('\n[THÔNG BÁO CẤU HÌNH AN TOÀN]:');
    console.log('Hiện tại file backend/.env chưa có thông tin Service Account thật của Firebase.');
    console.log('- Khi chạy Backend (npm --prefix backend run dev), hệ thống đã TỰ ĐỘNG nạp');
    console.log('  bộ dữ liệu mẫu (In-Memory Seed Data) của nhà "home1" để bạn test API ngay lập tức!');
    console.log('\nKhi bạn đã tạo xong Firebase Project theo docs/FIREBASE_SETUP.md và muốn đẩy');
    console.log('dữ liệu mẫu lên Firebase Realtime Database thật trên Cloud:');
    console.log('  1. Mở file backend/.env và điền:');
    console.log('     - FIREBASE_PROJECT_ID=<project-id>');
    console.log('     - FIREBASE_CLIENT_EMAIL=<firebase-adminsdk-email>');
    console.log('     - FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    console.log('     - FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.asia-southeast1.firebasedatabase.app');
    console.log('  2. Chạy lại lệnh: npm --prefix backend run seed\n');
    console.log('[OK] Đã kiểm tra cấu trúc 10 nhánh dữ liệu mẫu hợp lệ:');
    console.log('  -', Object.keys(seedPayload).join(', '));
    return;
  }

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

  const db = admin.database();
  console.log(`Đang ghi bộ dữ liệu khởi tạo của '${homeId}' lên ${env.FIREBASE_DATABASE_URL}...`);

  await db.ref('/').update(seedPayload);

  console.log('[HOÀN TẤT] Đã seed đầy đủ 10 nhánh dữ liệu lên Firebase Realtime Database!');
  process.exit(0);
}

seedFirebaseDatabase().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[LỖI SEED FIREBASE]: ${message}`);
  process.exit(1);
});
