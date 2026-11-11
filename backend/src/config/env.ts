import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  HOME_ID: z.string().min(1).default('home1'),
  COMMAND_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  ALERT_COOLDOWN_MS: z.coerce.number().int().nonnegative().default(60000),
  SENSOR_LOG_INTERVAL_MS: z.coerce.number().int().nonnegative().default(60000),

  HIVEMQ_HOST: z.string().default(''),
  HIVEMQ_PORT: z.coerce.number().int().positive().default(8883),
  HIVEMQ_PROTOCOL: z.enum(['mqtts', 'mqtt']).default('mqtts'),
  HIVEMQ_USERNAME: z.string().default(''),
  HIVEMQ_PASSWORD: z.string().default(''),
  HIVEMQ_CLIENT_ID_PREFIX: z.string().default('smarthome-backend'),

  FIREBASE_PROJECT_ID: z.string().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().default(''),
  FIREBASE_PRIVATE_KEY: z.string().default(''),
  FIREBASE_DATABASE_URL: z.string().default(''),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);

function isPlaceholder(val: string): boolean {
  if (!val || val.trim() === '') return true;
  const lower = val.toLowerCase();
  return (
    lower.includes('your-cluster-id') ||
    lower.includes('your_strong_mqtt_password') ||
    lower.includes('your_private_key_here') ||
    lower.includes('xxxxx@') ||
    lower.includes('<')
  );
}

export function isHiveMqConfigured(currentEnv: AppEnv = env): boolean {
  return (
    !isPlaceholder(currentEnv.HIVEMQ_HOST) &&
    !isPlaceholder(currentEnv.HIVEMQ_USERNAME) &&
    !isPlaceholder(currentEnv.HIVEMQ_PASSWORD)
  );
}

export function isFirebaseAdminConfigured(currentEnv: AppEnv = env): boolean {
  return (
    !isPlaceholder(currentEnv.FIREBASE_PROJECT_ID) &&
    !isPlaceholder(currentEnv.FIREBASE_CLIENT_EMAIL) &&
    !isPlaceholder(currentEnv.FIREBASE_PRIVATE_KEY) &&
    !isPlaceholder(currentEnv.FIREBASE_DATABASE_URL) &&
    currentEnv.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')
  );
}
