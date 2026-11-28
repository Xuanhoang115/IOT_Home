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
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import StateView from '../components/ui/StateView';
import { useSmartHome } from '../hooks/useSmartHome';
import {
  NEU_COLORS,
  neuShadowSubtle,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '../styles/neumorphicTheme';
import { RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Alerts'>;

export default function AlertsScreen({ navigation }: Props) {
  const {
    alerts,
    latestSensors,
    esp32Status,
    systemMode,
    isInitialLoading,
    syncError,
    toggleSystemMode,
    acknowledgeAlert,
    muteBuzzer,
    refreshAll,
    triggerDemoSmokeAlert,
  } = useSmartHome();

  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;
  const visibleAlerts =
    filter === 'UNREAD' ? alerts.filter((a) => !a.acknowledged) : alerts;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Trung Tâm Cảnh Báo"
        subtitle="Theo dõi cảnh báo khói, lửa và cảm biến theo thời gian thực"
        temperature={latestSensors.temperature.value}
        humidity={latestSensors.humidity.value}
        esp32Status={esp32Status}
        systemMode={systemMode}
        unreadAlertCount={unreadAlerts}
        onToggleMode={() =>
          toggleSystemMode(systemMode === 'MANUAL' ? 'AUTO' : 'MANUAL')
        }
        onPressSettings={() => navigation.navigate('Settings')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Bộ lọc & Hành động nhanh */}
          <View style={styles.topBar}>
            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={[styles.filterPill, filter === 'ALL' && styles.filterPillActive]}
                onPress={() => setFilter('ALL')}
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === 'ALL' }}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === 'ALL' && styles.filterTextActive,
                  ]}
                >
                  Tất cả ({alerts.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, filter === 'UNREAD' && styles.filterPillActive]}
                onPress={() => setFilter('UNREAD')}
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === 'UNREAD' }}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === 'UNREAD' && styles.filterTextActive,
                  ]}
                >
                  Chưa xử lý ({unreadAlerts})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={styles.muteBtn}
                onPress={muteBuzzer}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Tắt còi báo động"
              >
                <Text style={styles.muteBtnText}>🔇 Tắt còi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.simAlertBtn}
                onPress={triggerDemoSmokeAlert}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Tạo cảnh báo khói mẫu"
              >
                <Text style={styles.simAlertBtnText}>+ Báo khói mẫu</Text>
              </TouchableOpacity>
            </View>
          </View>

          {syncError ? (
            <StateView
              variant="error"
              title="Không thể tải danh sách cảnh báo"
              description={syncError}
              actionLabel="Thử lại"
              onAction={() => void refreshAll()}
            />
          ) : isInitialLoading ? (
            <SkeletonLoader variant="list" count={3} />
          ) : visibleAlerts.length === 0 ? (
            <StateView
              variant="empty"
              icon="🛡️"
              title={
                filter === 'UNREAD'
                  ? 'Ngôi nhà đang an toàn'
                  : 'Chưa có cảnh báo nào'
              }
              description={
                filter === 'UNREAD'
                  ? 'Tất cả cảnh báo đã được xác nhận xử lý. Hệ thống vẫn đang giám sát 24/7.'
                  : 'Mọi chỉ số cảm biến khói, lửa và nhiệt độ đều trong ngưỡng an toàn.'
              }
              actionLabel={filter === 'UNREAD' ? 'Xem toàn bộ lịch sử' : undefined}
              onAction={filter === 'UNREAD' ? () => setFilter('ALL') : undefined}
            />
          ) : (
            visibleAlerts.map((alert) => {
              const isCritical = alert.severity === 'CRITICAL';
              return (
                <View
                  key={alert.id}
                  style={[
                    styles.card,
                    neuShadowSubtle,
                    !alert.acknowledged &&
                      (isCritical ? styles.cardCriticalUnread : styles.cardWarningUnread),
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <View
                      style={[
                        styles.severityPill,
                        isCritical ? styles.pillCritical : styles.pillWarning,
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityBadge,
                          isCritical ? styles.textCritical : styles.textWarning,
                        ]}
                      >
                        {isCritical ? '🚨 KHẨN CẤP' : '⚠️ CẢNH BÁO'} • {alert.type}
                      </Text>
                    </View>
                    <Text style={TYPOGRAPHY.caption}>
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>

                  <Text style={[TYPOGRAPHY.body, styles.message]}>{alert.message}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaChip}>
                      🔊 Còi mạch: {alert.buzzerTriggered ? 'Đã kêu' : 'Tắt'}
                    </Text>
                    <Text style={styles.metaChip}>
                      🌀 Quạt khẩn cấp: {alert.autoFanTriggered ? 'Đã bật' : 'Không'}
                    </Text>
                  </View>

                  {!alert.acknowledged ? (
                    <TouchableOpacity
                      style={styles.ackButton}
                      onPress={() => acknowledgeAlert(alert.id)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Xác nhận đã xử lý cảnh báo"
                    >
                      <Text style={styles.ackButtonText}>
                        ✓ Xác nhận Đã Xử Lý Cảnh Báo
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.ackedRow}>
                      <Text style={styles.ackedLabel}>✓ Đã xác nhận an toàn</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ResponsiveContainer>
      </ScrollView>

      <BottomNav
        activeTab="Alerts"
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
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterGroup: {
    flexDirection: 'row',
    backgroundColor: NEU_COLORS.track,
    padding: 3,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  filterPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  filterPillActive: {
    backgroundColor: NEU_COLORS.card,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: NEU_COLORS.textSecondary,
  },
  filterTextActive: {
    color: NEU_COLORS.textPrimary,
    fontWeight: '800',
  },
  actionGroup: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  muteBtn: {
    backgroundColor: NEU_COLORS.danger,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    minHeight: 38,
    justifyContent: 'center',
  },
  muteBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  simAlertBtn: {
    backgroundColor: NEU_COLORS.pink,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    minHeight: 38,
    justifyContent: 'center',
  },
  simAlertBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: NEU_COLORS.borderSubtle,
  },
  cardCriticalUnread: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF7F7',
  },
  cardWarningUnread: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFDF5',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  severityPill: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  pillCritical: {
    backgroundColor: NEU_COLORS.pastelDanger,
  },
  pillWarning: {
    backgroundColor: NEU_COLORS.pastelWarning,
  },
  severityBadge: {
    fontSize: 11,
    fontWeight: '800',
  },
  textCritical: {
    color: NEU_COLORS.danger,
  },
  textWarning: {
    color: NEU_COLORS.warning,
  },
  message: {
    marginBottom: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metaChip: {
    fontSize: 12,
    color: NEU_COLORS.textSecondary,
    backgroundColor: NEU_COLORS.cardSoft,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    fontWeight: '600',
  },
  ackButton: {
    backgroundColor: NEU_COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  ackButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  ackedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEU_COLORS.pastelGreen,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  ackedLabel: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '700',
  },
});
