import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ControlScreen from '../screens/ControlScreen';
import AddDeviceScreen from '../screens/AddDeviceScreen';
import DeviceDetailScreen from '../screens/DeviceDetailScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        <Stack.Screen
          name="Control"
          component={ControlScreen}
        />

        <Stack.Screen
          name="AddDevice"
          component={AddDeviceScreen}
        />

        <Stack.Screen
          name="DeviceDetail"
          component={DeviceDetailScreen}
        />

        <Stack.Screen
          name="History"
          component={HistoryScreen}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}