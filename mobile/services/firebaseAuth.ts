import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  inMemoryPersistence,
} from 'firebase/auth';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function createFirebaseAuth() {
  if (!Object.values(config).every((value) => value?.trim())) {
    return null;
  }
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  try {
    return initializeAuth(app, {
      persistence: Platform.OS === 'web' ? browserLocalPersistence : inMemoryPersistence,
    });
  } catch {
    return getAuth(app);
  }
}

export const firebaseAuth = createFirebaseAuth();
