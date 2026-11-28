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
import FadeInView from '../components/ui/FadeInView';
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import StateView from '../components/ui/StateView';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useSmartHome } from '../hooks/useSmartHome';
import {
  NEU_COLORS,
  neuShadowSubtle,
  RADIUS,
  SPACING,
} from '../styles/neumorphicTheme';
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
    isInitialLoading,
    syncError,
    sendDeviceCommand,
    toggleSystemMode,
    refreshAll,
  } = useSmartHome();

  const { cardWidth, horizontalPadding, isTablet, isDesktop } = useResponsiveLayout();
  const room = rooms.find((r) => r.id === roomId) || rooms[0]!;
  const roomIconMap: Record<string, string> = { bed: '🛏️', sofa: '🛋️', kitchen: '🍳' };
  const roomEmoji = roomIconMap[room.icon] || room.icon;
  const roomDevices = devices.filter((d) => d.roomId === roomId);
  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  const doorDevice = roomDevices.find((d) => d.id === 'door1');
  const fanDevice = roomDevices.find((d) => d.id === 'fan1');
  const bedroomLights = roomDevices.filter((d) => d.id === 'light2' || d.id === 'light3');
  const areAllBedroomLightsOn =
    bedroomLights.length > 0 &&
    bedroomLights.every((d) => {
      const p =
        d.lastCommandStatus === 'PENDING'
          ? d.desiredState.power
          : d.reportedState.power;
      return p === 'ON';
    });

  const handleToggleAllBedroomLights = (power: 'ON' | 'OFF') => {
    bedroomLights.forEach((d) => {
      void sendDeviceCommand(d.id, { power });
    });
  };

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
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
        <FadeInView>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Quay lại trang trước"
        >
          <Text style={styles.backBtnText}>‹ Quay lại</Text>
        </TouchableOpacity>

        {syncError ? (
          <StateView
            variant="error"
            title="Mất kết nối đồng bộ phòng"
            description={syncError}
            actionLabel="Thử lại"
            onAction={() => void refreshAll()}
          />
        ) : isInitialLoading ? (
          <SkeletonLoader variant="grid" count={2} />
        ) : roomDevices.length > 0 ? (
          <View
            style={[
              styles.grid,
              (isTablet || isDesktop) &&
                roomDevices.length < 3 &&
                styles.gridWideSparse,
            ]}
          >
            {roomDevices.map((dev) => (
              <DeviceCard
                key={dev.id}
                device={dev}
                cardWidth={cardWidth}
                onToggle={(desired) => sendDeviceCommand(dev.id, desired)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>
              🔥 Khu vực Giám sát An toàn Khói / Khí gas (MQ-2)
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

        {/* Điều khiển nhanh cả 3 đèn Phòng ngủ (2 phòng: 2 bóng + 1 bóng) */}
        {roomId === 'bedroom' && bedroomLights.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>
              💡 Điều khiển 2 Phòng Ngủ (Tổng 3 đèn LED)
            </Text>
            <Text style={styles.cardText}>
              Bạn có thể bật/tắt riêng từng phòng ở 2 thẻ phía trên (Phòng ngủ 1 gồm 2 bóng trên D26, Phòng ngủ 2 gồm 1 bóng trên D23), hoặc bật/tắt nhanh cả 3 đèn cùng lúc giống nút bấm vật lý D18:
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  areAllBedroomLightsOn && styles.modeBtnActive,
                ]}
                onPress={() => handleToggleAllBedroomLights('ON')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Bật cả 3 đèn phòng ngủ"
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    areAllBedroomLightsOn && styles.modeBtnTextActive,
                  ]}
                >
                  💡 Bật cả 3 đèn (2 phòng)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  !areAllBedroomLightsOn && styles.modeBtnActive,
                ]}
                onPress={() => handleToggleAllBedroomLights('OFF')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Tắt cả 3 đèn phòng ngủ"
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    !areAllBedroomLightsOn && styles.modeBtnTextActive,
                  ]}
                >
                  🌙 Tắt hết 3 đèn
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Điều khiển chuyên sâu cho Quạt (Manual / Auto) - Bảo vệ bằng Mã PIN */}
        {fanDevice && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>
              🔒 Chế độ Quạt Thông Gió (Bảo mật Mã PIN)
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
                activeOpacity={0.85}
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
                activeOpacity={0.85}
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
              🚪 Điều khiển Cửa Chính (Servo SG90)
            </Text>
            <Text style={styles.cardText}>
              Góc mở hiện tại: {doorDevice.reportedState.currentAngle ?? 0}° (
              {doorDevice.reportedState.doorState === 'OPEN'
                ? 'Đang mở'
                : 'Đang đóng'}
              ) • Điều khiển theo xung PWM cấp cho Servo SG90.
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
                activeOpacity={0.85}
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
                activeOpacity={0.85}
              >
                <Text style={styles.doorBtnText}>Đóng Cửa (0°)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </FadeInView>
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
    backgroundColor: NEU_COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md + 2,
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
  },
  backBtnText: {
    color: NEU_COLORS.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridWideSparse: {
    justifyContent: 'flex-start',
    columnGap: SPACING.md,
  },
  infoCard: {
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md + 2,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
    ...neuShadowSubtle,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: NEU_COLORS.textSecondary,
    lineHeight: 19,
  },
  adcText: {
    fontSize: 14,
    fontWeight: '700',
    color: NEU_COLORS.primary,
    marginTop: SPACING.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.sm + 2,
    marginTop: SPACING.md,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    backgroundColor: NEU_COLORS.cardSoft,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
  },
  modeBtnActive: {
    backgroundColor: NEU_COLORS.primary,
    borderColor: NEU_COLORS.primary,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: NEU_COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  doorBtnOpen: {
    flex: 1,
    backgroundColor: NEU_COLORS.success,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  doorBtnClose: {
    flex: 1,
    backgroundColor: NEU_COLORS.navy,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  doorBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
