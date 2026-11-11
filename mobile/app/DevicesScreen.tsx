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
import { useSmartHome } from '../hooks/useSmartHome';
import { RoomId, RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Devices'>;

const CATEGORIES: CategoryOption[] = [
  { id: 'ALL', label: 'Tất cả (4)' },
  { id: 'living_room', label: 'Phòng khách' },
  { id: 'bedroom', label: 'Phòng ngủ' },
  { id: 'kitchen', label: 'Phòng bếp' },
];

export default function DevicesScreen({ navigation, route }: Props) {
  const {
    devices,
    latestSensors,
    esp32Status,
    systemMode,
    alerts,
    simulateEsp32Offline,
    sendDeviceCommand,
    toggleSystemMode,
    setSimulateEsp32Offline,
  } = useSmartHome();

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
        subtitle="Mọi công tắc chỉ đổi trạng thái khi nhận được reportedState từ ESP32"
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
        <SearchBar value={search} onChangeText={setSearch} />

        <CategoryTabs
          categories={CATEGORIES}
          selectedId={selectedRoom}
          onSelect={setSelectedRoom}
        />

        {/* Thanh kiểm thử nhanh kịch bản TC-14 (Mất mạng / Timeout) */}
        <View style={styles.testBar}>
          <View style={styles.testInfo}>
            <Text style={styles.testTitle}>
              Kịch bản TC-14: Kiểm thử ESP32 Offline & Timeout
            </Text>
            <Text style={styles.testSub}>
              {simulateEsp32Offline
                ? 'Đang giả lập ESP32 mất kết nối: Bấm công tắc sẽ hiện PENDING rồi báo lỗi TIMEOUT.'
                : 'ESP32 đang Online: Bấm công tắc sẽ gửi lệnh và nhận reportedState ACK.'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.simBtn,
              simulateEsp32Offline && styles.simBtnOffline,
            ]}
            onPress={() => setSimulateEsp32Offline(!simulateEsp32Offline)}
          >
            <Text style={styles.simBtnText}>
              {simulateEsp32Offline ? 'Bật lại Online' : 'Giả lập Rút Nguồn'}
            </Text>
          </TouchableOpacity>
        </View>

        {filteredDevices.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Không có thiết bị điều khiển trực tiếp trong khu vực này.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onToggle={(desired) => sendDeviceCommand(device.id, desired)}
                onPressDetail={() =>
                  navigation.navigate('RoomDetails', { roomId: device.roomId })
                }
              />
            ))}
          </View>
        )}
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
    backgroundColor: '#EEF3FA',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  testBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  testInfo: {
    flex: 1,
    marginRight: 10,
  },
  testTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D2939',
  },
  testSub: {
    fontSize: 11,
    color: '#667085',
    marginTop: 2,
  },
  simBtn: {
    backgroundColor: '#2850E8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  simBtnOffline: {
    backgroundColor: '#D92D20',
  },
  simBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#667085',
    fontSize: 13,
  },
});
