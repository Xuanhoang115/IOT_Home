import React, { useState } from 'react';
import {
  Image,
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
import RoomCard from '../components/RoomCard';
import FadeInView from '../components/ui/FadeInView';
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import StateView from '../components/ui/StateView';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useSmartHome } from '../hooks/useSmartHome';
import {
  APP_LOGO_IMAGE,
  NEU_COLORS,
  neuGlowPink,
  neuShadow,
  neuShadowSubtle,
  RADIUS,
  ROOM_PHOTOS,
  SPACING,
} from '../styles/neumorphicTheme';
import { RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const FAMILY_AVATARS = [
  {
    id: 'tv1',
    uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'tv2',
    uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'tv3',
    uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'tv4',
    uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'tv5',
    uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
  },
];

export default function DashboardScreen({ navigation }: Props) {
  const {
    user,
    esp32Status,
    systemMode,
    autoConfig,
    rooms,
    devices,
    latestSensors,
    alerts,
    activeBannerAlert,
    isInitialLoading,
    syncError,
    sendDeviceCommand,
    toggleSystemMode,
    acknowledgeAlert,
    muteBuzzer,
    refreshAll,
    showToast,
    triggerDemoSmokeAlert,
  } = useSmartHome();

  const { cardWidth, horizontalPadding, isCompact } = useResponsiveLayout();
  const [activeSegment, setActiveSegment] = useState<'ROOM' | 'DEVICES'>('ROOM');

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  const activeLights = devices.filter((dev) => {
    if (dev.type !== 'light') return false;
    const power =
      dev.lastCommandStatus === 'PENDING'
        ? dev.desiredState.power
        : dev.reportedState.power;
    return power === 'ON';
  });

  const handleTurnOffAllLights = async () => {
    if (activeLights.length === 0) {
      showToast('Tất cả đèn hiện đã tắt.', 'info');
      return;
    }
    await Promise.all(
      activeLights.map((dev) => sendDeviceCommand(dev.id, { power: 'OFF' }))
    );
    showToast(`Đã gửi lệnh tắt ${activeLights.length} đèn đang bật.`, 'success');
  };

  const getRoomPrimaryDevice = (roomId: string) => {
    if (roomId === 'bedroom') {
      const bedroomLights = devices.filter((d) => d.id === 'light2' || d.id === 'light3');
      const anyOn = bedroomLights.find((d) => {
        const p =
          d.lastCommandStatus === 'PENDING'
            ? d.desiredState.power
            : d.reportedState.power;
        return p === 'ON';
      });
      return anyOn || bedroomLights[0];
    }
    if (roomId === 'living_room') return devices.find((d) => d.id === 'light1');
    return undefined;
  };

  const handleToggleRoomPrimary = (roomId: string) => {
    if (roomId === 'bedroom') {
      const bedroomLights = devices.filter((d) => d.id === 'light2' || d.id === 'light3');
      if (bedroomLights.length === 0) return;
      const allOn = bedroomLights.every((d) => {
        const p =
          d.lastCommandStatus === 'PENDING'
            ? d.desiredState.power
            : d.reportedState.power;
        return p === 'ON';
      });
      const nextPower = allOn ? 'OFF' : 'ON';
      bedroomLights.forEach((d) => {
        void sendDeviceCommand(d.id, { power: nextPower });
      });
      showToast(
        nextPower === 'ON'
          ? 'Đã bật cả 3 đèn Phòng ngủ (2 phòng).'
          : 'Đã tắt cả 3 đèn Phòng ngủ.',
        'info'
      );
      return;
    }
    const dev = getRoomPrimaryDevice(roomId);
    if (!dev) return;
    const currentPower =
      dev.lastCommandStatus === 'PENDING'
        ? dev.desiredState.power
        : dev.reportedState.power;
    sendDeviceCommand(dev.id, {
      power: currentPower === 'ON' ? 'OFF' : 'ON',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
        {/* Top Row: Logo + "Home" + Mute, Mode, Alert & Settings */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Image
              source={APP_LOGO_IMAGE}
              style={isCompact ? styles.logoCompact : styles.logoStandard}
              resizeMode="contain"
              accessibilityLabel="Logo Smart Home"
            />
            <Text style={[styles.homeHeading, isCompact && styles.homeHeadingCompact]}>
              Home
            </Text>
          </View>

          <View style={[styles.topRightBtns, isCompact && styles.topRightBtnsCompact]}>
            <TouchableOpacity
              style={[
                styles.muteChip,
                neuShadowSubtle,
                isCompact && styles.muteChipCompact,
              ]}
              onPress={muteBuzzer}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Tắt còi báo động khẩn cấp"
            >
              <Text style={styles.muteChipText}>
                {isCompact ? '🔇' : '🔇 Tắt còi'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeChip,
                neuShadowSubtle,
                systemMode === 'AUTO' && styles.modeChipAuto,
              ]}
              onPress={() =>
                toggleSystemMode(systemMode === 'MANUAL' ? 'AUTO' : 'MANUAL')
              }
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Đổi chế độ, hiện tại ${systemMode}`}
            >
              <Text
                style={[
                  styles.modeChipText,
                  systemMode === 'AUTO' && styles.modeChipTextAuto,
                ]}
              >
                {systemMode}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconCircleBtn, neuShadowSubtle]}
              onPress={() => navigation.navigate('Alerts')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Trung tâm cảnh báo, ${unreadAlerts} chưa đọc`}
            >
              <Text style={styles.iconBtnEmoji}>🔔</Text>
              {unreadAlerts > 0 && (
                <View style={styles.unreadDot}>
                  <Text style={styles.unreadDotText}>{unreadAlerts}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconCircleBtn, neuShadowSubtle]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Mở cài đặt"
            >
              <Text style={styles.iconBtnEmoji}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Family Members Row with Overlapping Avatars */}
        <View style={styles.familyRow}>
          <View>
            <Text style={styles.familyLabel}>Thành viên gia đình</Text>
            <Text style={styles.userSub}>
              {user?.displayName || 'Nhóm 5 • Smart Home IoT'}
            </Text>
          </View>

          <View style={styles.avatarStack}>
            {FAMILY_AVATARS.map((av, idx) => (
              <Image
                key={av.id}
                source={{ uri: av.uri }}
                style={[
                  styles.avatarImg,
                  idx > 0 && { marginLeft: -10 },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Error / Offline State Banner khi mất kết nối phần cứng ESP32 */}
        {!esp32Status.online && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <View style={styles.offlineTextWrap}>
              <Text style={styles.offlineTitle}>⚠️ Mạch ESP32 đang ngoại tuyến</Text>
              <Text style={styles.offlineSub}>
                Kiểm tra nguồn USB hoặc Wi-Fi của mạch. Lệnh gửi lúc này sẽ chờ tối đa 8 giây.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.offlineRetryBtn}
              onPress={() => void refreshAll()}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Thử đồng bộ lại trạng thái ESP32"
            >
              <Text style={styles.offlineRetryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emergency Smoke Alert Banner (Foreground) */}
        <AlertBanner
          alert={activeBannerAlert}
          onPressViewAlerts={() => navigation.navigate('Alerts')}
          onAcknowledge={acknowledgeAlert}
        />

        {/* My Location Purple-Pink Gradient Weather & DHT22 Card */}
        <TouchableOpacity
          style={[styles.locationBanner, neuGlowPink]}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Sensors')}
        >
          {/* Decorative Gradient Glow Layers */}
          <View style={styles.gradientBlobLeft} />
          <View style={styles.gradientBlobRight} />

          <View style={styles.locationLeft}>
            <Text style={styles.locationTitle}>Ngôi Nhà Của Tôi</Text>
            <Text style={styles.locationCity}>
              TP.HCM • Smart Home ({esp32Status.online ? 'Trực tuyến' : 'Ngoại tuyến'})
            </Text>

            <View style={styles.espBadgeRow}>
              <View
                style={[
                  styles.espDot,
                  esp32Status.online ? styles.espDotOn : styles.espDotOff,
                ]}
              />
              <Text style={styles.espBadgeText}>
                {esp32Status.online
                  ? `ESP32 (${esp32Status.rssi} dBm) • Chạm xem cảm biến`
                  : 'ESP32 Ngoại tuyến'}
              </Text>
            </View>

            <View style={styles.weatherConditionRow}>
              <Text style={styles.weatherIcon}>
                {latestSensors.motion.motionDetected ? '🚶' : '⛅'}
              </Text>
              <Text style={styles.weatherCondText}>
                Độ ẩm {latestSensors.humidity.value.toFixed(0)}% • Khói ADC{' '}
                {latestSensors.smoke.rawAdc} • PIR:{' '}
                {latestSensors.motion.motionDetected ? 'CÓ NGƯỜI!' : 'Tĩnh'}
              </Text>
            </View>
          </View>

          <View style={styles.locationRight}>
            <Text style={styles.hugeTemp}>
              {latestSensors.temperature.value.toFixed(1)}°
            </Text>
            <Text style={styles.highLowText}>
              Bật:{autoConfig.tempThresholdHigh}°  Tắt:{autoConfig.tempThresholdLow}°
            </Text>
          </View>
        </TouchableOpacity>

        {/* Thanh thao tác nhanh 1 chạm giảm thao tác thừa */}
        <View style={styles.quickStrip}>
          <TouchableOpacity
            style={[
              styles.quickPill,
              neuShadowSubtle,
              activeLights.length > 0 && styles.quickPillActive,
            ]}
            onPress={() => void handleTurnOffAllLights()}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Tắt tất cả đèn đang bật, hiện có ${activeLights.length} đèn`}
          >
            <Text
              style={[
                styles.quickPillText,
                activeLights.length > 0 && styles.quickPillTextActive,
              ]}
              numberOfLines={1}
            >
              💡 Tắt hết đèn ({activeLights.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickPill, neuShadowSubtle]}
            onPress={() => navigation.navigate('Sensors')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Mở màn hình cảm biến"
          >
            <Text style={styles.quickPillText} numberOfLines={1}>
              🌡️ Cảm biến
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickPill, neuShadowSubtle]}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Mở lịch sử hoạt động"
          >
            <Text style={styles.quickPillText} numberOfLines={1}>
              📋 Lịch sử
            </Text>
          </TouchableOpacity>
        </View>

        {/* Neumorphic Segmented Pill Toggle: Phòng | Thiết bị */}
        <View style={styles.segmentTrack}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'ROOM' && [styles.segmentBtnActive, neuShadowSubtle],
            ]}
            onPress={() => setActiveSegment('ROOM')}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSegment === 'ROOM' }}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'ROOM' && styles.segmentTextActive,
              ]}
            >
              Phòng ({rooms.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'DEVICES' && [
                styles.segmentBtnActive,
                neuShadowSubtle,
              ],
            ]}
            onPress={() => setActiveSegment('DEVICES')}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSegment === 'DEVICES' }}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'DEVICES' && styles.segmentTextActive,
              ]}
            >
              Thiết bị ({devices.length})
            </Text>
          </TouchableOpacity>
        </View>

        {syncError && (
          <StateView
            variant="error"
            title="Mất kết nối đồng bộ"
            description={syncError}
            actionLabel="Thử lại"
            onAction={() => void refreshAll()}
          />
        )}

        {isInitialLoading ? (
          <SkeletonLoader variant="grid" count={4} />
        ) : activeSegment === 'ROOM' ? (
          <FadeInView key="segment-room">
            {/* Lưới phòng đáp ứng 2 / 3 / 4 cột */}
            <View style={styles.gridWrap}>
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  cardWidth={cardWidth}
                  primaryDevice={getRoomPrimaryDevice(room.id)}
                  smokeAbnormal={latestSensors.smoke.abnormal}
                  smokeRawAdc={latestSensors.smoke.rawAdc}
                  onPress={() =>
                    navigation.navigate('RoomDetails', { roomId: room.id })
                  }
                  onTogglePrimary={() => handleToggleRoomPrimary(room.id)}
                />
              ))}

              {/* Thẻ số 4: Lối vào & Cảm biến PIR */}
              <TouchableOpacity
                style={[styles.entranceCard, neuShadow, { width: cardWidth }]}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('Sensors')}
                accessibilityRole="button"
                accessibilityLabel="Xem cảm biến chuyển động cửa chính"
              >
                <View style={styles.entranceImgWrap}>
                  <Image
                    source={{ uri: ROOM_PHOTOS.entrance }}
                    style={styles.entranceImg}
                    resizeMode="cover"
                  />
                  <View style={styles.entranceBadge}>
                    <Text style={styles.entranceEmoji}>🚪</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => navigation.navigate('Sensors')}
                  >
                    <Text style={styles.moreBtnText}>⋮</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.entranceTitle} numberOfLines={1}>
                  Cửa chính & PIR
                </Text>
                <Text style={styles.entranceSub} numberOfLines={1}>
                  Cảm biến hồng ngoại HC-SR501
                </Text>

                <View style={styles.entranceBottom}>
                  <View
                    style={[
                      styles.pirStatusPill,
                      latestSensors.motion.motionDetected
                        ? styles.pirStatusPillAlert
                        : styles.pirStatusPillSafe,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pirStatusText,
                        latestSensors.motion.motionDetected
                          ? styles.pirStatusTextAlert
                          : styles.pirStatusTextSafe,
                      ]}
                      numberOfLines={1}
                    >
                      {latestSensors.motion.motionDetected
                        ? '🚶 CÓ NGƯỜI!'
                        : '🟢 AN TOÀN (TĨNH)'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Điều khiển nhanh thiết bị */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Điều khiển nhanh ({devices.length} thiết bị)
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Sensors')}>
                <Text style={styles.linkText}>Cảm biến ›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gridWrap}>
              {devices.map((dev) => (
                <DeviceCard
                  key={dev.id}
                  device={dev}
                  cardWidth={cardWidth}
                  onToggle={(desired) => sendDeviceCommand(dev.id, desired)}
                  onPressDetail={() =>
                    navigation.navigate('RoomDetails', { roomId: dev.roomId })
                  }
                />
              ))}
            </View>
          </FadeInView>
        ) : (
          <FadeInView key="segment-devices">
            {/* Devices Tab Content */}
            <View style={styles.gridWrap}>
              {devices.map((dev) => (
                <DeviceCard
                  key={dev.id}
                  device={dev}
                  cardWidth={cardWidth}
                  onToggle={(desired) => sendDeviceCommand(dev.id, desired)}
                  onPressDetail={() =>
                    navigation.navigate('RoomDetails', { roomId: dev.roomId })
                  }
                />
              ))}
            </View>

            <View style={styles.quickActionRow}>
              <TouchableOpacity
                style={[styles.thermostatShortcutBtn, neuShadowSubtle]}
                onPress={() => navigation.navigate('Sensors')}
              >
                <Text style={styles.thermostatShortcutText}>
                  🌡️ Mở Vòng Xoay Nhiệt Độ & Cảm Biến
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.testSmokeBtn}
                onPress={triggerDemoSmokeAlert}
              >
                <Text style={styles.testSmokeBtnText}>🧪 Test Báo Khói</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        )}
        </ResponsiveContainer>
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
    backgroundColor: NEU_COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: SPACING.md + 2,
    paddingBottom: SPACING.xxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
  },
  logoStandard: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
  },
  logoCompact: {
    width: 32,
    height: 32,
    borderRadius: SPACING.sm,
  },
  homeHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  homeHeadingCompact: {
    fontSize: 22,
  },
  topRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  topRightBtnsCompact: {
    gap: 6,
  },
  muteChip: {
    backgroundColor: NEU_COLORS.pastelDanger,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 7,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FDA29B',
  },
  muteChipCompact: {
    paddingHorizontal: SPACING.sm,
  },
  muteChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: NEU_COLORS.danger,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  offlineTextWrap: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  offlineSub: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 2,
    lineHeight: 16,
  },
  offlineRetryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  offlineRetryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modeChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  modeChipAuto: {
    backgroundColor: NEU_COLORS.purple,
    borderColor: NEU_COLORS.pink,
  },
  modeChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
  },
  modeChipTextAuto: {
    color: '#FFFFFF',
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    position: 'relative',
  },
  iconBtnEmoji: {
    fontSize: 15,
  },
  unreadDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: NEU_COLORS.coral,
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  familyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  familyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: NEU_COLORS.textSecondary,
  },
  userSub: {
    fontSize: 11,
    color: NEU_COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#D0D5DD',
  },
  locationBanner: {
    backgroundColor: NEU_COLORS.purple,
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg + 2,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  quickStrip: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md + 2,
  },
  quickPill: {
    flex: 1,
    backgroundColor: NEU_COLORS.card,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
    minHeight: 40,
  },
  quickPillActive: {
    backgroundColor: NEU_COLORS.pastelPurple,
    borderColor: NEU_COLORS.purple,
  },
  quickPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: NEU_COLORS.textPrimary,
  },
  quickPillTextActive: {
    color: NEU_COLORS.purpleDeep,
    fontWeight: '800',
  },
  gradientBlobLeft: {
    position: 'absolute',
    top: -40,
    left: -30,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#7E22CE',
    opacity: 0.55,
  },
  gradientBlobRight: {
    position: 'absolute',
    bottom: -50,
    right: -20,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#EC4899',
    opacity: 0.72,
  },
  locationLeft: {
    flex: 1,
    zIndex: 2,
    marginRight: 10,
  },
  locationTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  locationCity: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  espBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  espDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  espDotOn: {
    backgroundColor: '#4ADE80',
  },
  espDotOff: {
    backgroundColor: '#FCA5A5',
  },
  espBadgeText: {
    color: '#F3E8FF',
    fontSize: 10,
    fontWeight: '600',
  },
  weatherConditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  weatherIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  weatherCondText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  locationRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2,
  },
  hugeTemp: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '300',
    letterSpacing: -1,
  },
  highLowText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: NEU_COLORS.track,
    borderRadius: RADIUS.md + 2,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md - 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: NEU_COLORS.card,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: NEU_COLORS.textSecondary,
  },
  segmentTextActive: {
    color: NEU_COLORS.textPrimary,
    fontWeight: '800',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  entranceCard: {
    width: '48.5%',
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md + 2,
    borderWidth: 1.5,
    borderColor: NEU_COLORS.borderLight,
  },
  entranceImgWrap: {
    width: '100%',
    height: 104,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E9F2',
    marginBottom: 10,
    position: 'relative',
  },
  entranceImg: {
    width: '100%',
    height: '100%',
  },
  entranceBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  entranceEmoji: {
    fontSize: 13,
  },
  moreBtn: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
  },
  entranceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
    paddingHorizontal: 4,
  },
  entranceSub: {
    fontSize: 11,
    color: NEU_COLORS.textSecondary,
    marginTop: 2,
    paddingHorizontal: 4,
    fontWeight: '500',
  },
  entranceBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: NEU_COLORS.purple,
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  thermostatShortcutBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  thermostatShortcutText: {
    fontSize: 12,
    fontWeight: '800',
    color: NEU_COLORS.purple,
  },
  testSmokeBtn: {
    backgroundColor: NEU_COLORS.pastelPink,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  testSmokeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: NEU_COLORS.coral,
  },
  pirStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pirStatusPillSafe: {
    backgroundColor: '#DCFCE7',
  },
  pirStatusPillAlert: {
    backgroundColor: '#FEE2E2',
  },
  pirStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pirStatusTextSafe: {
    color: '#15803D',
  },
  pirStatusTextAlert: {
    color: '#DC2626',
  },
});
