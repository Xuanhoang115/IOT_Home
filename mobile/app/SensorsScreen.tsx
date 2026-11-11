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

type Props = NativeStackScreenProps<RootStackParamList, 'Sensors'>;

export default function SensorsScreen({ navigation }: Props) {
  const {
    latestSensors,
    sensorReadings,
    esp32Status,
    systemMode,
    autoConfig,
    alerts,
    toggleSystemMode,
    triggerDemoSensorUpdate,
    triggerDemoSmokeAlert,
  } = useSmartHome();

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Giám Sát Cảm Biến"
        subtitle="DHT22 (GPIO4) • PIR HC-SR501 (GPIO27) • MQ-2 ADC1 (GPIO34)"
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
        {/* Chi tiết MQ-2 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🔥 Cảm biến Khói/Khí MQ-2 (Phòng bếp - GPIO34 ADC1)
          </Text>
          <Text style={styles.bigValue}>
            ADC: {latestSensors.smoke.rawAdc} / 4095 (
            {latestSensors.smoke.smokeLevelPercent}%)
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    latestSensors.smoke.smokeLevelPercent
                  )}%`,
                  backgroundColor: latestSensors.smoke.abnormal
                    ? '#D92D20'
                    : '#12B76A',
                },
              ]}
            />
          </View>
          <Text style={styles.metaText}>
            Ngưỡng cảnh báo: ADC {autoConfig.smokeThresholdAdc} • Cầu phân áp
            an toàn 5V → 3.3V
          </Text>
        </View>

        {/* Chi tiết DHT22 & PIR */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🌡️ Cảm biến Nhiệt độ & Độ ẩm DHT22 + PIR
          </Text>
          <Text style={styles.metaText}>
            • Nhiệt độ hiện tại: {latestSensors.temperature.value.toFixed(1)} °C
            (Ngưỡng bật quạt Auto: ≥ {autoConfig.tempThresholdHigh}°C, tắt: ≤{' '}
            {autoConfig.tempThresholdLow}°C)
          </Text>
          <Text style={styles.metaText}>
            • Độ ẩm hiện tại: {latestSensors.humidity.value.toFixed(1)} %
          </Text>
          <Text style={styles.metaText}>
            • Cảm biến chuyển động PIR:{' '}
            {latestSensors.motion.motionDetected
              ? '🚶 Phát hiện có người chuyển động!'
              : 'Đứng yên (Không có chuyển động)'}
          </Text>
        </View>

        {/* Bộ nút mô phỏng nhanh kịch bản TC-07, TC-08, TC-09 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🧪 Công cụ Giả lập Cảm biến (Test Hysteresis & Báo Khói)
          </Text>
          <View style={styles.simRow}>
            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => triggerDemoSensorUpdate(32.2, 940, false)}
            >
              <Text style={styles.simBtnText}>Nhiệt 32.2°C (Nóng)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => triggerDemoSensorUpdate(30.1, 920, true)}
            >
              <Text style={styles.simBtnText}>30.1°C + Có PIR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => triggerDemoSensorUpdate(28.4, 890, false)}
            >
              <Text style={styles.simBtnText}>28.4°C (Mát)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={triggerDemoSmokeAlert}
          >
            <Text style={styles.dangerBtnText}>
              🚨 Giả lập Khói MQ-2 Vượt Ngưỡng (ADC 2740)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lịch sử bản ghi cảm biến (Throttled 60s) */}
        <Text style={styles.sectionTitle}>
          Lịch Sử Bản Ghi Cảm Biến (`sensorReadings`)
        </Text>
        {sensorReadings.map((reading, idx) => (
          <View key={`${reading.timestamp}_${idx}`} style={styles.readingRow}>
            <Text style={styles.readingTime}>
              {new Date(reading.timestamp).toLocaleTimeString()}
            </Text>
            <Text style={styles.readingVal}>
              🌡️ {reading.temperature.toFixed(1)}°C | 💧{' '}
              {reading.humidity.toFixed(0)}% | 🔥 ADC {reading.smokeRawAdc} |{' '}
              {reading.motionDetected ? '🚶 Có người' : 'Tĩnh'}
            </Text>
          </View>
        ))}
      </ScrollView>

      <BottomNav
        activeTab="Sensors"
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
  bigValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2850E8',
    marginBottom: 8,
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#EAECF0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#475467',
    marginTop: 4,
    lineHeight: 18,
  },
  simRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  simBtn: {
    flex: 1,
    backgroundColor: '#EEF4FF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  simBtnText: {
    color: '#2850E8',
    fontSize: 11,
    fontWeight: '700',
  },
  dangerBtn: {
    marginTop: 10,
    backgroundColor: '#D92D20',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1D2939',
    marginBottom: 8,
  },
  readingRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  readingTime: {
    fontSize: 11,
    color: '#667085',
    fontWeight: '700',
  },
  readingVal: {
    fontSize: 12,
    color: '#1D2939',
    fontWeight: '600',
  },
});
