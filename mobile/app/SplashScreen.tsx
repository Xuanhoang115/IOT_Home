import React, { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSmartHome } from '../hooks/useSmartHome';
import { APP_LOGO_IMAGE } from '../styles/neumorphicTheme';
import { RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const { user, refreshAll } = useSmartHome();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await refreshAll();
      setTimeout(() => {
        if (!mounted) return;
        if (user) {
          navigation.replace('Dashboard');
        } else {
          navigation.replace('Login');
        }
      }, 900);
    };
    init();
    return () => {
      mounted = false;
    };
  }, [navigation, refreshAll, user]);

  return (
    <View style={styles.container}>
      <Image source={APP_LOGO_IMAGE} style={styles.logoImage} resizeMode="contain" />
      <Text style={styles.logo}>Smart Living IoT</Text>
      <Text style={styles.subtitle}>
        Hệ thống Quản lý & Điều khiển Nhà Thông Minh 2026
      </Text>
      <ActivityIndicator size="large" color="#38BDF8" style={styles.spinner} />
      <Text style={styles.footerText}>
        ESP32 • EMQX Cloud TLS • Node.js • Firebase • Expo SDK 54
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071B46',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  logoImage: {
    width: 118,
    height: 118,
    borderRadius: 28,
    marginBottom: 18,
  },
  logo: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#DCE4FF',
    textAlign: 'center',
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 40,
  },
  footerText: {
    position: 'absolute',
    bottom: 36,
    fontSize: 11,
    color: '#B2C5FF',
  },
});
