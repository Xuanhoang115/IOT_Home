import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AlertBanner from '../components/AlertBanner';
import BottomNav from '../components/BottomNav';
import DeviceCard from '../components/DeviceCard';
import Header from '../components/Header';
import RoomCard from '../components/RoomCard';
import { useSmartHome } from '../hooks/useSmartHome';
import { RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const {
    user,
    esp32Status,
    systemMode,
    rooms,
    devices,
    latestSensors,
    alerts,
    activeBannerAlert,
    sendDeviceCommand,
    toggleSystemMode,
    acknowledgeAlert,
    triggerDemoSmokeAlert,
  } = useSmartHome();

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Mô Hình Nhà Thông Minh"
        subtitle={`Xin chào, ${user?.displayName || 'Thành viên Nhóm 5'} 👋`}
        temperature={latestSensors.temperature.value}
        humidity={latestSensors.humidity.value}
        esp32Status={esp32Status}
        systemMode={systemMode}
        unreadAlertCount={unreadAlerts}
        onToggleMode={() =>
          toggleSystemMode(systemMode === 'MANUAL' ? 'AUTO' : 'MANUAL')
        }
        onPressAlerts={() => navigation.navigate('Alerts')}
        onPressSettings={() => navigation.navigate('Settings')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AlertBanner
          alert={activeBannerAlert}
          onPressViewAlerts={() => navigation.navigate('Alerts')}
          onAcknowledge={acknowledgeAlert}
        />

        {/* Tóm tắt 4 Cảm biến Realtime */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cảm Biến Thời Gian Thực</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Sensors')}>
            <Text style={styles.linkText}>Chi tiết ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sensorGrid}>
          <View style={styles.sensorBox}>
            <Text style={styles.sensorLabel}>🌡️ Nhiệt độ (DHT22)</Text>
            <Text style={styles.sensorValue}>
              {latestSensors.temperature.value.toFixed(1)} °C
            </Text>
          </View>

          <View style={styles.sensorBox}>
            <Text style={styles.sensorLabel}>💧 Độ ẩm (DHT22)</Text>
            <Text style={styles.sensorValue}>
              {latestSensors.humidity.value.toFixed(1)} %
            </Text>
          </View>

          <View
            style={[
              styles.sensorBox,
              latestSensors.smoke.abnormal && styles.sensorDanger,
            ]}
          >
            <Text style={styles.sensorLabel}>🔥 Khói/Khí (MQ-2)</Text>
            <Text
              style={[
                styles.sensorValue,
                latestSensors.smoke.abnormal && styles.sensorDangerText,
              ]}
            >
              ADC {latestSensors.smoke.rawAdc} ({latestSensors.smoke.smokeLevelPercent}%)
            </Text>
          </View>

          <View style={styles.sensorBox}>
            <Text style={styles.sensorLabel}>🚶 Chuyển động (PIR)</Text>
            <Text style={styles.sensorValue}>
              {latestSensors.motion.motionDetected ? 'Có người!' : 'Bình thường'}
            </Text>
          </View>
        </View>

        {/* Điều khiển nhanh 4 thiết bị phần cứng */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Điều Khiển Nhanh (4 Thiết Bị)</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Devices')}>
            <Text style={styles.linkText}>Tất cả ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.deviceGrid}>
          {devices.map((dev) => (
            <DeviceCard
              key={dev.id}
              device={dev}
              onToggle={(desired) => sendDeviceCommand(dev.id, desired)}
              onPressDetail={() =>
                navigation.navigate('RoomDetails', { roomId: dev.roomId })
              }
            />
          ))}
        </View>

        {/* Danh sách các Phòng */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh Sách Phòng (`home1`)</Text>
          <TouchableOpacity onPress={triggerDemoSmokeAlert}>
            <Text style={styles.testSmokeBtn}>🧪 Test Báo Khói</Text>
          </TouchableOpacity>
        </View>

        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            devices={devices}
            onPress={() =>
              navigation.navigate('RoomDetails', { roomId: room.id })
            }
          />
        ))}
      </ScrollView>

      <BottomNav
        activeTab="Dashboard"
        unreadAlertCount={unreadAlerts}
        onNavigate={(screen) => navigation.navigate(screen as never)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF3FA',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D2939',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2850E8',
  },
  testSmokeBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D92D20',
    backgroundColor: '#FEE4E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sensorBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  sensorDanger: {
    backgroundColor: '#FEF3F2',
    borderColor: '#F04438',
  },
  sensorLabel: {
    fontSize: 11,
    color: '#667085',
    fontWeight: '600',
  },
  sensorValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D2939',
    marginTop: 4,
  },
  sensorDangerText: {
    color: '#D92D20',
  },
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
