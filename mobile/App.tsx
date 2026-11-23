import React, { useEffect, useState } from 'react';
import { Image, Platform } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AlertsScreen from './app/AlertsScreen';
import DashboardScreen from './app/DashboardScreen';
import DevicesScreen from './app/DevicesScreen';
import HistoryScreen from './app/HistoryScreen';
import LoginScreen from './app/LoginScreen';
import RegisterScreen from './app/RegisterScreen';
import RoomDetailScreen from './app/RoomDetailScreen';
import SensorsScreen from './app/SensorsScreen';
import SettingsScreen from './app/SettingsScreen';
import SplashScreen from './app/SplashScreen';
import { SmartHomeProvider } from './contexts/SmartHomeContext';
import { useSmartHome } from './hooks/useSmartHome';
import { apiClient } from './services/api';
import { APP_LOGO_IMAGE } from './styles/neumorphicTheme';
import { RootStackParamList } from './types/smarthome';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

function AndroidPushNotifications({ routeName }: { routeName?: string }) {
  const { user } = useSmartHome();
  const uid = user?.uid;
  const [openAlerts, setOpenAlerts] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android' || !uid) return;

    let active = true;
    let removeListeners: (() => void) | undefined;
    async function register() {
      const notifications = await import('expo-notifications');
      if (!active) return;

      function handleResponse(response: Awaited<ReturnType<typeof notifications.getLastNotificationResponseAsync>>) {
        if (response?.notification.request.content.data?.targetScreen === 'Alerts') {
          setOpenAlerts(true);
          void notifications.clearLastNotificationResponseAsync().catch((error) =>
            console.warn('[FCM] Không thể xóa phản hồi thông báo:', error)
          );
        }
      }

      const responseListener = notifications.addNotificationResponseReceivedListener(handleResponse);
      removeListeners = () => responseListener.remove();
      handleResponse(await notifications.getLastNotificationResponseAsync());
      if (!active) return;

      await notifications.setNotificationChannelAsync('alerts', {
        name: 'Cảnh báo Smart Home',
        importance: notifications.AndroidImportance.HIGH,
      });
      let permission = await notifications.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain && active) {
        permission = await notifications.requestPermissionsAsync();
      }
      if (!permission.granted || !active) return;

      const token = await notifications.getDevicePushTokenAsync();
      if (active && token.type === 'android' && typeof token.data === 'string') {
        const deviceKey = 'android_' + token.data.slice(0, 100).replace(/[^a-zA-Z0-9_-]/g, '_');
        await apiClient.registerPushToken(token.data, 'android', deviceKey);
        console.info('[FCM] Đã đăng ký thông báo Android.');
      }
    }

    void register().catch(() => {
      if (active) console.warn('[FCM] Không thể đăng ký thông báo Android.');
    });
    return () => {
      active = false;
      removeListeners?.();
    };
  }, [uid]);

  useEffect(() => {
    if (!openAlerts || !uid || !routeName || !navigationRef.isReady()) return;
    if (routeName === 'Splash' || routeName === 'Login' || routeName === 'Register') return;
    setOpenAlerts(false);
    navigationRef.navigate('Alerts');
  }, [openAlerts, routeName, uid]);

  return null;
}

export default function MobileApp() {
  const [routeName, setRouteName] = useState<string>();
  const updateRouteName = () => setRouteName(navigationRef.getCurrentRoute()?.name);

  // Tu dong gan Logo du an lam Favicon tren tab trinh duyet Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    try {
      const resolved =
        typeof APP_LOGO_IMAGE === 'string'
          ? APP_LOGO_IMAGE
          : typeof APP_LOGO_IMAGE === 'object' && APP_LOGO_IMAGE?.uri
          ? APP_LOGO_IMAGE.uri
          : Image.resolveAssetSource?.(APP_LOGO_IMAGE)?.uri;
      if (resolved) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = resolved;
      }
      document.title = 'Smart Home IoT 2026';
    } catch {
      // ignore
    }
  }, []);

  return (
    <SafeAreaProvider>
      <SmartHomeProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={updateRouteName}
          onStateChange={updateRouteName}
        >
          <AndroidPushNotifications routeName={routeName} />
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Devices" component={DevicesScreen} />
            <Stack.Screen name="RoomDetails" component={RoomDetailScreen} />
            <Stack.Screen name="Sensors" component={SensorsScreen} />
            <Stack.Screen name="Alerts" component={AlertsScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SmartHomeProvider>
    </SafeAreaProvider>
  );
}
