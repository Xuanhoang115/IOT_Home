import React, { useState } from 'react';
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
import CategoryTabs, { CategoryOption } from '../components/CategoryTabs';
import DeviceCard from '../components/DeviceCard';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
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
import { RoomId, RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Devices'>;

export default function DevicesScreen({ navigation, route }: Props) {
  const {
    devices,
    latestSensors,
    esp32Status,
    systemMode,
    alerts,
    isInitialLoading,
    syncError,
    simulateEsp32Offline,
    sendDeviceCommand,
    toggleSystemMode,
    refreshAll,
    setSimulateEsp32Offline,
  } = useSmartHome();

  const categories: CategoryOption[] = [
    { id: 'ALL', label: `Tất cả (${devices.length})` },
    { id: 'living_room', label: 'Phòng khách' },
    { id: 'bedroom', label: 'Phòng ngủ' },
    { id: 'kitchen', label: 'Phòng bếp' },
  ];

  const { cardWidth, horizontalPadding, isCompact } = useResponsiveLayout();
  const [selectedRoom, setSelectedRoom] = useState<RoomId | 'ALL'>(
    route.params?.initialRoomId || 'ALL'
  );
  const [search, setSearch] = useState('');

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  const filteredDevices = devices.filter((dev) => {
    const matchRoom = selectedRoom === 'ALL' || dev.roomId === selectedRoom;
    const matchSearch = dev.name.toLowerCase().includes(search.toLowerCase());
    return matchRoom && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Điều Khiển Thiết Bị"
        subtitle="Chạm trực tiếp thẻ thiết bị để bật/tắt • Đồng bộ phản hồi từ ESP32"
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
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
        <SearchBar value={search} onChangeText={setSearch} />

        <CategoryTabs
          categories={categories}
          selectedId={selectedRoom}
          onSelect={setSelectedRoom}
        />

        {/* Thanh kiểm thử nhanh kịch bản TC-14 (Mất mạng / Timeout) */}
        <View
          style={[
            styles.testBar,
            neuShadowSubtle,
            isCompact && styles.testBarCompact,
          ]}
        >
          <View style={[styles.testInfo, isCompact && styles.testInfoCompact]}>
            <Text style={styles.testTitle}>
              Kiểm thử ESP32 Ngoại tuyến & Timeout
            </Text>
            <Text style={styles.testSub}>
              {simulateEsp32Offline
                ? 'Đang giả lập mất kết nối: Bấm công tắc sẽ chờ rồi báo quá hạn.'
                : 'ESP32 đang trực tuyến: Bấm công tắc gửi lệnh và nhận phản hồi thực.'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.simBtn,
              simulateEsp32Offline && styles.simBtnOffline,
              isCompact && styles.simBtnCompact,
            ]}
            onPress={() => setSimulateEsp32Offline(!simulateEsp32Offline)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              simulateEsp32Offline
                ? 'Bật lại kết nối ESP32'
                : 'Giả lập rút nguồn ESP32'
            }
          >
            <Text style={styles.simBtnText}>
              {simulateEsp32Offline ? 'Bật lại Online' : 'Giả lập Rút Nguồn'}
            </Text>
          </TouchableOpacity>
        </View>

        <FadeInView key={selectedRoom}>
        {syncError ? (
          <StateView
            variant="error"
            title="Mất kết nối đồng bộ"
            description={syncError}
            actionLabel="Thử lại"
            onAction={() => void refreshAll()}
          />
        ) : isInitialLoading ? (
          <SkeletonLoader variant="grid" count={4} />
        ) : filteredDevices.length === 0 ? (
          <StateView
            variant="empty"
            icon="🔍"
            title="Không tìm thấy thiết bị phù hợp"
            description="Khu vực này chưa có thiết bị điều khiển hoặc từ khóa tìm kiếm chưa khớp."
            actionLabel="Xem tất cả thiết bị"
            onAction={() => {
              setSelectedRoom('ALL');
              setSearch('');
            }}
          />
        ) : (
          <View style={styles.grid}>
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                cardWidth={cardWidth}
                onToggle={(desired) => sendDeviceCommand(device.id, desired)}
                onPressDetail={() =>
                  navigation.navigate('RoomDetails', { roomId: device.roomId })
                }
              />
            ))}
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
  testBar: {
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 2,
    marginBottom: SPACING.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
    gap: SPACING.sm + 2,
  },
  testBarCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  testInfo: {
    flex: 1,
  },
  testInfoCompact: {
    marginRight: 0,
  },
  testTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: NEU_COLORS.textPrimary,
  },
  testSub: {
    fontSize: 11.5,
    color: NEU_COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  simBtn: {
    backgroundColor: NEU_COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    borderRadius: RADIUS.sm + 2,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simBtnCompact: {
    alignSelf: 'flex-start',
  },
  simBtnOffline: {
    backgroundColor: NEU_COLORS.danger,
  },
  simBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
