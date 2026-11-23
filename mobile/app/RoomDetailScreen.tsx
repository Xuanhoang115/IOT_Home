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
import BottomNav from '../components/BottomNav';
import DeviceCard from '../components/DeviceCard';
import Header from '../components/Header';
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import { useSmartHome } from '../hooks/useSmartHome';
import { RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomDetails'>;

export default function RoomDetailScreen({ navigation, route }: Props) {
  const { roomId } = route.params;
  const {
    rooms,
    devices,
    latestSensors,
    esp32Status,
    systemMode,
    autoConfig,
    alerts,
    sendDeviceCommand,
    toggleSystemMode,
  } = useSmartHome();

  const room = rooms.find((r) => r.id === roomId) || rooms[0]!;
  const roomIconMap: Record<string, string> = { bed: '🛏️', sofa: '🛋️', kitchen: '🍳' };
  const roomEmoji = roomIconMap[room.icon] || room.icon;
  const roomDevices = devices.filter((d) => d.roomId === roomId);
  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  const doorDevice = roomDevices.find((d) => d.id === 'door1');
  const fanDevice = roomDevices.find((d) => d.id === 'fan1');

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={`${roomEmoji} ${room.name}`}
        subtitle={`Quản lý chi tiết thiết bị & cảm biến tại ${room.name}`}
        temperature={latestSensors.temperature.value}
        humidity={latestSensors.humidity.value}
        esp32Status={esp32Status}
        systemMode={systemMode}
        unreadAlertCount={unreadAlerts}
        onToggleMode={() =>
          toggleSystemMode(systemMode === 'MANUAL' ? 'AUTO' : 'MANUAL')
        }
        onPressAlerts={() => navigation.navigate('Alerts')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại trang trước"
        >
          <Text style={styles.backBtnText}>‹ Quay lại</Text>
        </TouchableOpacity>

        {roomDevices.length > 0 ? (
          <View style={styles.grid}>
            {roomDevices.map((dev) => (
              <DeviceCard
                key={dev.id}
                device={dev}
                onToggle={(desired) => sendDeviceCommand(dev.id, desired)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>
              🔥 Khu vực Giám sát An toàn Khói/Khí (MQ-2)
            </Text>
            <Text style={styles.cardText}>
              Phòng bếp được trang bị cảm biến MQ-2 gắn vào chân ADC1 (GPIO34)
              qua cầu phân áp an toàn 3.3V và còi Buzzer cảnh báo độc lập.
            </Text>
            <Text style={styles.adcText}>
              Giá trị ADC hiện tại: {latestSensors.smoke.rawAdc} / 4095 (
              {latestSensors.smoke.smokeLevelPercent}%)
            </Text>
          </View>
        )}

        {/* Điều khiển chuyên sâu cho Quạt (Manual / Auto) - Bảo vệ bằng Mã PIN */}
        {fanDevice && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>
              🔒 Chế độ Quạt Thông Gió (`fan1` - Bảo mật Mã PIN)
            </Text>
            <Text style={styles.cardText}>
              Ở chế độ AUTO, hệ thống tự bật quạt khi nhiệt độ ≥{' '}
              {autoConfig.tempThresholdHigh.toFixed(1)}°C và tắt khi ≤{' '}
              {autoConfig.tempThresholdLow.toFixed(1)}°C. Mọi thao tác đổi chế độ
              đều yêu cầu xác thực Mã PIN Chủ nhà.
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  systemMode === 'MANUAL' && styles.modeBtnActive,
                ]}
                onPress={() => toggleSystemMode('MANUAL')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    systemMode === 'MANUAL' && styles.modeBtnTextActive,
                  ]}
                >
                  🔒 Chế độ MANUAL
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  systemMode === 'AUTO' && styles.modeBtnActive,
                ]}
                onPress={() => toggleSystemMode('AUTO')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    systemMode === 'AUTO' && styles.modeBtnTextActive,
                  ]}
                >
                  🔒 Chế độ AUTO
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Điều khiển góc Servo SG90 cho Cửa chính */}
        {doorDevice && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>
              🚪 Điều khiển Cửa Chính (`door1` - Servo SG90)
            </Text>
            <Text style={styles.cardText}>
              Trạng thái góc lệnh hiện tại:{' '}
              {doorDevice.reportedState.currentAngle ?? 0}° (
              {doorDevice.reportedState.doorState}) • positionVerified: false
              (phản hồi theo lệnh xung PWM cấp cho Servo SG90).
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.doorBtnOpen}
                onPress={() =>
                  sendDeviceCommand('door1', {
                    doorState: 'OPEN',
                    targetAngle: 90,
                  })
                }
              >
                <Text style={styles.doorBtnText}>Mở Cửa (90°)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doorBtnClose}
                onPress={() =>
                  sendDeviceCommand('door1', {
                    doorState: 'CLOSED',
                    targetAngle: 0,
                  })
                }
              >
                <Text style={styles.doorBtnText}>Đóng Cửa (0°)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </ResponsiveContainer>
      </ScrollView>

      <BottomNav
        activeTab="Devices"
        unreadAlertCount={unreadAlerts}
        onNavigate={(screen) => navigation.navigate(screen as never)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  backBtnText: {
    color: '#9B51E0',
    fontWeight: '800',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E2235',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 12,
    color: '#8E95A9',
    lineHeight: 18,
  },
  adcText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9B51E0',
    marginTop: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F2F4F8',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#9B51E0',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475467',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  doorBtnOpen: {
    flex: 1,
    backgroundColor: '#12B76A',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  doorBtnClose: {
    flex: 1,
    backgroundColor: '#344054',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  doorBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
