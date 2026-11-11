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
import Header from '../components/Header';
import { useSmartHome } from '../hooks/useSmartHome';
import { RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Alerts'>;

export default function AlertsScreen({ navigation }: Props) {
  const {
    alerts,
    latestSensors,
    esp32Status,
    systemMode,
    acknowledgeAlert,
    triggerDemoSmokeAlert,
  } = useSmartHome();

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Trung Tâm Cảnh Báo"
        subtitle="Hỗ trợ 3 trạng thái: Foreground Banner • Background/Terminated FCM"
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
        <View style={styles.topActions}>
          <Text style={styles.countText}>
            Chưa xác nhận: {unreadAlerts} / Tổng: {alerts.length}
          </Text>

          <TouchableOpacity
            style={styles.simAlertBtn}
            onPress={triggerDemoSmokeAlert}
          >
            <Text style={styles.simAlertBtnText}>+ Tạo Cảnh Báo Khói Mẫu</Text>
          </TouchableOpacity>
        </View>

        {alerts.map((alert) => (
          <View
            key={alert.id}
            style={[
              styles.card,
              !alert.acknowledged && styles.cardUnread,
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.severityBadge}>
                {alert.severity === 'CRITICAL' ? '🚨 CRITICAL' : '⚠️ WARNING'} •{' '}
                {alert.type}
              </Text>
              <Text style={styles.timeText}>
                {new Date(alert.timestamp).toLocaleTimeString()}
              </Text>
            </View>

            <Text style={styles.message}>{alert.message}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaChip}>
                🔊 Buzzer tại mạch: {alert.buzzerTriggered ? 'ĐÃ KÊU' : 'Tắt'}
              </Text>
              <Text style={styles.metaChip}>
                🌀 Quạt khẩn cấp: {alert.autoFanTriggered ? 'ĐÃ BẬT' : 'Không'}
              </Text>
            </View>

            {!alert.acknowledged ? (
              <TouchableOpacity
                style={styles.ackButton}
                onPress={() => acknowledgeAlert(alert.id)}
              >
                <Text style={styles.ackButtonText}>
                  ✓ Xác nhận Đã Xử Lý Cảnh Báo
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.ackedLabel}>✓ Đã xác nhận an toàn</Text>
            )}
          </View>
        ))}
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
    backgroundColor: '#EEF3FA',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D2939',
  },
  simAlertBtn: {
    backgroundColor: '#D92D20',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  simAlertBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  cardUnread: {
    borderColor: '#F04438',
    backgroundColor: '#FEF3F2',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  severityBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B42318',
  },
  timeText: {
    fontSize: 11,
    color: '#667085',
  },
  message: {
    fontSize: 13,
    color: '#1D2939',
    lineHeight: 19,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metaChip: {
    fontSize: 11,
    color: '#344054',
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: '600',
  },
  ackButton: {
    backgroundColor: '#2850E8',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  ackButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ackedLabel: {
    fontSize: 12,
    color: '#12B76A',
    fontWeight: '700',
  },
});
