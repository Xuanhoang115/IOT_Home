import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import { useSmartHome } from '../hooks/useSmartHome';
import {
  NEU_COLORS,
  neuShadowSubtle,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '../styles/neumorphicTheme';
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
    showToast,
    logout,
  } = useSmartHome();

  const [urlInput, setUrlInput] = useState(apiBaseUrl);
  const [testingUrl, setTestingUrl] = useState(false);

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  const handleSaveApiUrl = async () => {
    const cleaned = urlInput.trim();
    if (!cleaned) {
      showToast('Vui lòng nhập địa chỉ máy chủ Backend hợp lệ.', 'warning');
      return;
    }
    setTestingUrl(true);
    const ok = await updateApiBaseUrl(cleaned);
    setTestingUrl(false);

    if (ok) {
      showToast(`Đã kết nối thành công tới Backend: ${cleaned}`, 'success');
    } else {
      showToast(
        'Chưa kết nối được Backend. Hệ thống vẫn điều khiển trực tiếp qua EMQX Cloud.',
        'warning'
      );
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Đã đăng xuất an toàn.', 'info');
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Cài Đặt & Tài Khoản"
        subtitle="Quản lý máy chủ kết nối, chế độ tự động và bảo mật"
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
          {/* Thông tin người dùng */}
          <View style={[styles.card, neuShadowSubtle]}>
            <Text style={[TYPOGRAPHY.h2, styles.cardTitle]}>👤 Tài khoản đang đăng nhập</Text>
            <View style={styles.infoRow}>
              <Text style={TYPOGRAPHY.caption}>Họ tên</Text>
              <Text style={TYPOGRAPHY.body}>{user?.displayName || 'Chưa đăng nhập'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={TYPOGRAPHY.caption}>Email</Text>
              <Text style={TYPOGRAPHY.body}>{user?.email || '—'}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={TYPOGRAPHY.caption}>Phân quyền</Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>
                  {user?.role === 'owner' ? 'Chủ nhà (Owner)' : 'Thành viên'} • Nhà home1
                </Text>
              </View>
            </View>
          </View>

          {/* Cấu hình kết nối Backend Server */}
          <View style={[styles.card, neuShadowSubtle]}>
            <Text style={[TYPOGRAPHY.h2, styles.cardTitle]}>
              🌐 Máy chủ Backend REST API
            </Text>
            <View
              style={[
                styles.statusBadge,
                backendConnected ? styles.statusOnline : styles.statusFallback,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  backendConnected ? styles.textOnline : styles.textFallback,
                ]}
              >
                {backendConnected
                  ? '🟢 Đang kết nối trực tiếp tới Backend'
                  : '🔵 Chế độ trực tiếp EMQX Cloud (Backend chưa bật)'}
              </Text>
            </View>

            <TextInput
              style={styles.input}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="http://192.168.1.x:3000"
              placeholderTextColor={NEU_COLORS.textMuted}
              autoCapitalize="none"
              editable={!testingUrl}
              accessibilityLabel="Địa chỉ máy chủ Backend"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, testingUrl && styles.btnDisabled]}
              onPress={handleSaveApiUrl}
              disabled={testingUrl}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Lưu và kiểm tra kết nối máy chủ"
              accessibilityState={{ busy: testingUrl }}
            >
              {testingUrl ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Đang kiểm tra kết nối...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Lưu & Kiểm Tra Kết Nối</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Cấu hình chế độ AUTO - Bảo vệ bằng Mã PIN */}
          <View style={[styles.card, neuShadowSubtle]}>
            <Text style={[TYPOGRAPHY.h2, styles.cardTitle]}>
              🔒 Chế Độ Tự Động (AUTO) & Mã PIN
            </Text>
            <Text style={[TYPOGRAPHY.bodySmall, styles.hint]}>
              Ngưỡng bật/tắt quạt: {autoConfig.tempThresholdHigh}°C /{' '}
              {autoConfig.tempThresholdLow}°C • Ngưỡng khói:{' '}
              {autoConfig.smokeThresholdAdc} ADC • Đèn PIR tự động:{' '}
              {autoConfig.motionAutoLight ? 'Đang BẬT' : 'Đang TẮT'}.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => toggleSystemMode(systemMode)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Mở khóa cấu hình chế độ tự động và đổi mã PIN"
            >
              <Text style={styles.primaryBtnText}>
                🔐 Mở Khóa Cấu Hình AUTO & Đổi Mã PIN
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất khỏi tài khoản"
          >
            <Text style={styles.logoutBtnText}>Đăng Xuất</Text>
          </TouchableOpacity>
        </ResponsiveContainer>
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
    backgroundColor: NEU_COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  card: {
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md + 2,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
  },
  cardTitle: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: NEU_COLORS.borderSubtle,
    gap: SPACING.md,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rolePill: {
    backgroundColor: NEU_COLORS.pastelPurple,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: NEU_COLORS.purpleDeep,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  statusOnline: {
    backgroundColor: NEU_COLORS.pastelGreen,
  },
  statusFallback: {
    backgroundColor: NEU_COLORS.pastelInfo,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textOnline: {
    color: '#15803D',
  },
  textFallback: {
    color: NEU_COLORS.info,
  },
  hint: {
    marginBottom: SPACING.md,
  },
  input: {
    height: 48,
    backgroundColor: NEU_COLORS.cardSoft,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
    color: NEU_COLORS.textPrimary,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  primaryBtn: {
    backgroundColor: NEU_COLORS.primary,
    minHeight: 46,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  btnDisabled: {
    opacity: 0.72,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: NEU_COLORS.pastelDanger,
    borderWidth: 1,
    borderColor: '#FECACA',
    minHeight: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  logoutBtnText: {
    color: NEU_COLORS.danger,
    fontSize: 14,
    fontWeight: '800',
  },
});
