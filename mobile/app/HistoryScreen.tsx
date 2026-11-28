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
  TYPOGRAPHY,
} from '../styles/neumorphicTheme';
import { CommandSource, RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

const SOURCE_LABELS: Record<CommandSource, string> = {
  REMOTE_COMMAND: '📱 Điều khiển từ xa',
  PHYSICAL_BUTTON: '🔘 Nút nhấn vật lý',
  AUTO_RULE: '🤖 Tự động (AUTO)',
  BOOT_SYNC: '🔄 Đồng bộ khởi động',
};

export default function HistoryScreen({ navigation }: Props) {
  const {
    activityLogs,
    commands,
    latestSensors,
    esp32Status,
    systemMode,
    alerts,
    isInitialLoading,
    syncError,
    toggleSystemMode,
    refreshAll,
  } = useSmartHome();

  const { horizontalPadding } = useResponsiveLayout();
  const [activeTab, setActiveTab] = useState<'LOGS' | 'COMMANDS'>('LOGS');
  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Lịch Sử Hoạt Động"
        subtitle="Ghi nhận mọi thao tác từ Ứng dụng, Nút vật lý và Chế độ Tự động"
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
          {/* Bộ chuyển nhanh giảm thao tác cuộn dài */}
          <View style={styles.segmentTrack}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === 'LOGS' && [styles.segmentBtnActive, neuShadowSubtle],
              ]}
              onPress={() => setActiveTab('LOGS')}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'LOGS' }}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'LOGS' && styles.segmentTextActive,
                ]}
              >
                Nhật ký phần cứng ({activityLogs.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === 'COMMANDS' && [
                  styles.segmentBtnActive,
                  neuShadowSubtle,
                ],
              ]}
              onPress={() => setActiveTab('COMMANDS')}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'COMMANDS' }}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'COMMANDS' && styles.segmentTextActive,
                ]}
              >
                Trạng thái lệnh ({Math.min(commands.length, 20)})
              </Text>
            </TouchableOpacity>
          </View>

          <FadeInView key={activeTab}>
          {syncError ? (
            <StateView
              variant="error"
              title="Không thể đồng bộ lịch sử"
              description={syncError}
              actionLabel="Thử lại"
              onAction={() => void refreshAll()}
            />
          ) : isInitialLoading ? (
            <SkeletonLoader variant="list" count={4} />
          ) : activeTab === 'LOGS' ? (
            activityLogs.length === 0 ? (
              <StateView
                variant="empty"
                icon="📋"
                title="Chưa có lịch sử hoạt động"
                description="Khi bạn bật/tắt đèn, bấm nút vật lý trên mạch hoặc chuyển chế độ, nhật ký sẽ xuất hiện tại đây."
              />
            ) : (
              activityLogs.map((log) => (
                <View key={log.id} style={[styles.logCard, neuShadowSubtle]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.deviceTag}>{log.deviceId.toUpperCase()}</Text>
                    <Text style={TYPOGRAPHY.caption}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={[TYPOGRAPHY.h3, styles.actionText]}>{log.action}</Text>
                  <Text style={[TYPOGRAPHY.caption, styles.sourceText]}>
                    {SOURCE_LABELS[log.source] || log.source} • Bởi:{' '}
                    {log.actorUid || 'Hệ thống'}
                  </Text>
                </View>
              ))
            )
          ) : commands.length === 0 ? (
            <StateView
              variant="empty"
              icon="📡"
              title="Chưa có lệnh điều khiển nào"
              description="Trạng thái ACK, chờ xử lý hoặc quá hạn của các lệnh gửi tới ESP32 sẽ hiển thị tại đây."
            />
          ) : (
            commands.slice(0, 20).map((cmd) => (
              <View key={cmd.requestId} style={[styles.logCard, neuShadowSubtle]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.deviceTag}>{cmd.deviceId.toUpperCase()}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      cmd.status === 'ACKED'
                        ? styles.statusAcked
                        : cmd.status === 'TIMEOUT' || cmd.status === 'FAILED'
                        ? styles.statusTimeout
                        : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        cmd.status === 'ACKED'
                          ? styles.textAcked
                          : cmd.status === 'TIMEOUT' || cmd.status === 'FAILED'
                          ? styles.textTimeout
                          : styles.textPending,
                      ]}
                    >
                      {cmd.status}
                    </Text>
                  </View>
                </View>
                <Text style={[TYPOGRAPHY.caption, styles.sourceText]}>
                  Mã lệnh: {cmd.requestId.slice(0, 20)}...
                </Text>
                {cmd.errorReason ? (
                  <Text style={styles.errorText}>⚠️ {cmd.errorReason}</Text>
                ) : null}
              </View>
            ))
          )}
          </FadeInView>
        </ResponsiveContainer>
      </ScrollView>

      <BottomNav
        activeTab="History"
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
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: NEU_COLORS.track,
    borderRadius: RADIUS.md + 2,
    padding: SPACING.xs,
    marginBottom: SPACING.md + 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.md - 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: NEU_COLORS.card,
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: NEU_COLORS.textSecondary,
  },
  segmentTextActive: {
    color: NEU_COLORS.textPrimary,
    fontWeight: '800',
  },
  logCard: {
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 2,
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceTag: {
    fontSize: 12,
    fontWeight: '800',
    color: NEU_COLORS.primary,
    letterSpacing: 0.4,
  },
  actionText: {
    marginTop: SPACING.xs,
  },
  sourceText: {
    marginTop: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusAcked: {
    backgroundColor: NEU_COLORS.pastelGreen,
  },
  textAcked: {
    color: '#15803D',
  },
  statusTimeout: {
    backgroundColor: NEU_COLORS.pastelDanger,
  },
  textTimeout: {
    color: NEU_COLORS.danger,
  },
  statusPending: {
    backgroundColor: NEU_COLORS.pastelWarning,
  },
  textPending: {
    color: NEU_COLORS.warning,
  },
  errorText: {
    fontSize: 12,
    color: NEU_COLORS.danger,
    marginTop: 6,
    fontWeight: '600',
  },
});
