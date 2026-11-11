import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import { RootStackParamList } from './types/smarthome';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MobileApp() {
  return (
    <SafeAreaProvider>
      <SmartHomeProvider>
        <NavigationContainer>
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
