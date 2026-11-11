import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';
import { useSmartHome } from '../hooks/useSmartHome';
import { RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const {
    user,
    backendConnected,
    apiBaseUrl,
    systemMode,
    autoConfig,
    latestSensors,
    esp32Status,
    alerts,
    toggleSystemMode,
    updateApiBaseUrl,
    logout,
  } = useSmartHome();

  const [urlInput, setUrlInput] = useState(apiBaseUrl);
  const [highTempInput, setHighTempInput] = useState(
    String(autoConfig.tempThresholdHigh)
  );
  const [lowTempInput, setLowTempInput] = useState(
    String(autoConfig.tempThresholdLow)
  );
  const [smokeInput, setSmokeInput] = useState(
    String(autoConfig.smokeThresholdAdc)
  );

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  const handleSaveApiUrl = async () => {
    const ok = await updateApiBaseUrl(urlInput.trim());
    if (ok) {
      Alert.alert('Kết nối thành công', `Đã kết nối tới Backend: ${urlInput}`);
    } else {
      Alert.alert(
        'Chưa kết nối được Backend',
        'Đã lưu URL. Hiện tại App vẫn hoạt động bình thường ở chế độ Simulator Ready.'
      );
    }
  };

  const handleSaveThresholds = async () => {
    const high = Number(highTempInput);
    const low = Number(lowTempInput);
    const smoke = Number(smokeInput);

    if (isNaN(high) || isNaN(low) || high <= low) {
      Alert.alert(
        'Ngưỡng không hợp lệ',
        'Ngưỡng nhiệt độ BẬT quạt (High) phải lớn hơn ngưỡng TẮT quạt (Low) để đảm bảo Hysteresis.'
      );
      return;
    }

    await toggleSystemMode(systemMode, {
      tempThresholdHigh: high,
      tempThresholdLow: low,
      smokeThresholdAdc: smoke,
    });
    Alert.alert('Đã lưu cấu hình', 'Đã cập nhật ngưỡng tự động Hysteresis & MQ-2.');
  };

  const handleLogout = () => {
    logout();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Cài Đặt & Tài Khoản"
        subtitle="Cấu hình Backend API, Ngưỡng Hysteresis & Thông tin thành viên"
        temperature={latestSensors.temperature.value}
        humidity={latestSensors.humidity.value}
        esp32Status={esp32Status}
        systemMode={systemMode}
        unreadAlertCount={unreadAlerts}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Thông tin người dùng */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Tài khoản đang đăng nhập</Text>
          <Text style={styles.infoLine}>
            Họ tên: {user?.displayName || 'Chưa đăng nhập'}
          </Text>
          <Text style={styles.infoLine}>Email: {user?.email || '-'}</Text>
          <Text style={styles.infoLine}>
            Vai trò: {user?.role === 'owner' ? 'Chủ nhà (Owner)' : 'Thành viên'} •
            Quyền nhà: `home1`
          </Text>
        </View>

        {/* Cấu hình kết nối Backend Server */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🌐 Địa chỉ Backend Node.js (`EXPO_PUBLIC_API_BASE_URL`)
          </Text>
          <Text style={styles.hint}>
            Trạng thái:{' '}
            {backendConnected
              ? '🟢 Đang kết nối Live với Backend REST API'
              : '🔵 Đang chạy chế độ Simulator Offline Ready'}
          </Text>
          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://192.168.1.x:3000"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApiUrl}>
            <Text style={styles.saveBtnText}>Lưu & Kiểm Tra Kết Nối</Text>
          </TouchableOpacity>
        </View>

        {/* Cấu hình ngưỡng Hysteresis Auto */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🤖 Cấu hình Ngưỡng Tự Động (`AUTO` Hysteresis)
          </Text>
          <Text style={styles.label}>Nhiệt độ BẬT quạt (°C):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={highTempInput}
            onChangeText={setHighTempInput}
          />

          <Text style={styles.label}>Nhiệt độ TẮT quạt (°C):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={lowTempInput}
            onChangeText={setLowTempInput}
          />

          <Text style={styles.label}>Ngưỡng ADC Cảnh báo khói MQ-2 (0–4095):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={smokeInput}
            onChangeText={setSmokeInput}
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveThresholds}
          >
            <Text style={styles.saveBtnText}>Cập Nhật Ngưỡng Tự Động</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Đăng Xuất</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav
        activeTab="Settings"
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D2939',
    marginBottom: 8,
  },
  infoLine: {
    fontSize: 13,
    color: '#344054',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#475467',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#475467',
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    height: 44,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    marginBottom: 10,
    color: '#1D2939',
  },
  saveBtn: {
    backgroundColor: '#2850E8',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: '#D92D20',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
