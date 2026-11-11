import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';
import { useSmartHome } from '../hooks/useSmartHome';
import { CommandSource, RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

const SOURCE_LABELS: Record<CommandSource, string> = {
  REMOTE_COMMAND: '📱 Điều khiển từ App',
  PHYSICAL_BUTTON: '🔘 Nút nhấn vật lý',
  AUTO_RULE: '🤖 Tự động (Auto Rule)',
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
  } = useSmartHome();

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Lịch Sử Hoạt Động"
        subtitle="Ghi nhận mọi thao tác từ App, Nút nhấn vật lý và Quy tắc Auto"
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
        <Text style={styles.sectionTitle}>
          Nhật Ký Thực Thi Phần Cứng (`activityLogs`)
        </Text>

        {activityLogs.map((log) => (
          <View key={log.id} style={styles.logCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.deviceTag}>Thiết bị: {log.deviceId}</Text>
              <Text style={styles.timeText}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </Text>
            </View>
            <Text style={styles.actionText}>{log.action}</Text>
            <Text style={styles.sourceText}>
              Nguồn: {SOURCE_LABELS[log.source] || log.source} • Bởi:{' '}
              {log.actorUid || 'system'}
            </Text>
          </View>
        ))}

        {commands.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
              Trạng Thái Lệnh Gần Đây (`commands`)
            </Text>
            {commands.slice(0, 10).map((cmd) => (
              <View key={cmd.requestId} style={styles.logCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.deviceTag}>{cmd.deviceId}</Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      cmd.status === 'ACKED'
                        ? styles.statusAcked
                        : cmd.status === 'TIMEOUT'
                        ? styles.statusTimeout
                        : styles.statusPending,
                    ]}
                  >
                    {cmd.status}
                  </Text>
                </View>
                <Text style={styles.sourceText}>
                  Mã lệnh: {cmd.requestId.slice(0, 18)}...
                </Text>
                {cmd.errorReason && (
                  <Text style={styles.errorText}>{cmd.errorReason}</Text>
                )}
              </View>
            ))}
          </>
        )}
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
    backgroundColor: '#EEF3FA',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1D2939',
    marginBottom: 10,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceTag: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2850E8',
  },
  timeText: {
    fontSize: 11,
    color: '#667085',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D2939',
    marginTop: 4,
  },
  sourceText: {
    fontSize: 11,
    color: '#475467',
    marginTop: 4,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusAcked: {
    backgroundColor: '#D1FADF',
    color: '#027A48',
  },
  statusTimeout: {
    backgroundColor: '#FEE4E2',
    color: '#B42318',
  },
  statusPending: {
    backgroundColor: '#FEF0C7',
    color: '#B54708',
  },
  errorText: {
    fontSize: 11,
    color: '#D92D20',
    marginTop: 4,
  },
});
