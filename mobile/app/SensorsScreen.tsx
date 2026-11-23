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
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import { useSmartHome } from '../hooks/useSmartHome';
import {
  NEU_COLORS,
  neuGlowPink,
  neuShadow,
  neuShadowSubtle,
} from '../styles/neumorphicTheme';
import { RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Sensors'>;

const DIAL_TICKS = Array.from({ length: 21 }, (_, i) => -120 + i * 12);

export default function SensorsScreen({ navigation }: Props) {
  const {
    devices,
    latestSensors,
    sensorReadings,
    esp32Status,
    systemMode,
    autoConfig,
    alerts,
    sendDeviceCommand,
    toggleSystemMode,
    triggerDemoSensorUpdate,
    triggerDemoSmokeAlert,
  } = useSmartHome();

  const [darkDialTheme, setDarkDialTheme] = useState(false);
  const [selectedDeviceIdx, setSelectedDeviceIdx] = useState(0);
  const [showSimPanel, setShowSimPanel] = useState(false);

  const unreadAlerts = alerts.filter((a) => !a.acknowledged).length;
  const fanDevice = devices.find((d) => d.id === 'fan1');
  const isFanOn = fanDevice?.reportedState.power === 'ON';

  const deviceOptions = [
    { id: 'fan1', label: 'device 1 • Quạt & DHT22' },
    { id: 'light1', label: 'device 2 • Đèn Phòng khách' },
    { id: 'light2', label: 'device 3 • Đèn P.Ngủ & Còi' },
  ];

  const adjustThreshold = (delta: number) => {
    const nextHigh = Math.min(
      40,
      Math.max(24, Number((autoConfig.tempThresholdHigh + delta).toFixed(1)))
    );
    const nextLow = Number((nextHigh - 1.5).toFixed(1));
    toggleSystemMode(systemMode, {
      tempThresholdHigh: nextHigh,
      tempThresholdLow: nextLow,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ResponsiveContainer>
      {/* Top Bar matching Mockup Screen 2 & 3 */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.circleIconBtn, neuShadowSubtle]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>

        <View style={styles.titleCenter}>
          <Text style={styles.screenTitle}>Thermostat</Text>
          <Text style={styles.subStatus}>
            {esp32Status.online
              ? `🟢 ESP32 Online • DHT22 Live`
              : '🔴 ESP32 Offline'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.circleIconBtn, neuShadowSubtle]}
          onPress={() => setDarkDialTheme(!darkDialTheme)}
          activeOpacity={0.85}
        >
          <Text style={styles.gearIcon}>{darkDialTheme ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
      </ResponsiveContainer>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
        {/* Circular Neumorphic Thermostat Dial */}
        <View style={styles.dialSection}>
          <View style={styles.scaleLabelsRow}>
            <Text style={styles.scaleSideLabel}>20°</Text>
            <Text style={styles.scaleTopLabel}>28°</Text>
            <Text style={styles.scaleSideLabel}>36°</Text>
          </View>

          <View style={styles.dialWrapper}>
            {/* Radial Tick Marks */}
            {DIAL_TICKS.map((deg, idx) => {
              const isHighlighted = idx <= 13;
              return (
                <View
                  key={deg}
                  style={[
                    styles.tickContainer,
                    { transform: [{ rotate: `${deg}deg` }] },
                  ]}
                >
                  <View
                    style={[
                      styles.tickMark,
                      isHighlighted && styles.tickMarkActive,
                    ]}
                  />
                </View>
              );
            })}

            {/* Outer Neumorphic Bezel */}
            <View style={[styles.dialOuterRim, neuShadow]}>
              {/* Gradient Progress Ring */}
              <View
                style={[
                  styles.dialProgressRing,
                  darkDialTheme && styles.dialProgressRingDark,
                ]}
              >
                {/* Inner Raised Dial (Light Soft UI vs Dark Gradient UI) */}
                <View
                  style={[
                    styles.dialInnerCore,
                    darkDialTheme
                      ? [styles.dialInnerCoreDark, neuGlowPink]
                      : neuShadowSubtle,
                  ]}
                >
                  {darkDialTheme && <View style={styles.darkCorePinkGlow} />}

                  <Text
                    style={[
                      styles.heatingLabel,
                      darkDialTheme && styles.heatingLabelDark,
                    ]}
                  >
                    {systemMode === 'AUTO'
                      ? 'AUTO COOLING'
                      : isFanOn
                      ? 'FAN RUNNING'
                      : 'HEATING / IDLE'}
                  </Text>

                  <Text
                    style={[
                      styles.dialTempNumber,
                      darkDialTheme && styles.dialTempNumberDark,
                    ]}
                  >
                    {latestSensors.temperature.value.toFixed(1)}
                  </Text>

                  <Text
                    style={[
                      styles.thresholdSub,
                      darkDialTheme && styles.thresholdSubDark,
                    ]}
                  >
                    Ngưỡng Auto: {autoConfig.tempThresholdHigh}°C
                  </Text>

                  <Text style={styles.leafIcon}>🌱</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Threshold +/- Fine Controls */}
          <View style={styles.adjustRow}>
            <TouchableOpacity
              style={[styles.adjustBtn, neuShadowSubtle]}
              onPress={() => adjustThreshold(-0.5)}
            >
              <Text style={styles.adjustBtnText}>− 0.5°</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeSwitchPill, neuShadowSubtle]}
              onPress={() => setDarkDialTheme(!darkDialTheme)}
            >
              <Text style={styles.themeSwitchText}>
                Giao diện vòng xoay: {darkDialTheme ? 'Gradient Tối' : 'Trắng Nổi'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.adjustBtn, neuShadowSubtle]}
              onPress={() => adjustThreshold(0.5)}
            >
              <Text style={styles.adjustBtnText}>+ 0.5°</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Device Selector Pill Dropdown (like "device 1 v" in Mockup) */}
        <TouchableOpacity
          style={[styles.deviceDropdownPill, neuShadowSubtle]}
          onPress={() =>
            setSelectedDeviceIdx((selectedDeviceIdx + 1) % deviceOptions.length)
          }
          activeOpacity={0.85}
        >
          <Text style={styles.deviceDropdownText}>
            {deviceOptions[selectedDeviceIdx]!.label}
          </Text>
          <Text style={styles.dropdownChevron}>⌄</Text>
        </TouchableOpacity>

        {/* Two Square Neumorphic Sensor Cards ("Inside humidity" & "Outside temps / Threshold") */}
        <View style={styles.twoCardsRow}>
          <View style={[styles.squareMetricCard, neuShadow]}>
            <View style={[styles.metricIconCircle, styles.metricPinkBg]}>
              <Text style={styles.metricIconEmoji}>💧</Text>
            </View>
            <Text style={styles.metricTitle}>Inside humidity</Text>
            <Text style={styles.metricValue}>
              {latestSensors.humidity.value.toFixed(0)} %
            </Text>
          </View>

          <View style={[styles.squareMetricCard, neuShadow]}>
            <View style={[styles.metricIconCircle, styles.metricPurpleBg]}>
              <Text style={styles.metricIconEmoji}>🌡️</Text>
            </View>
            <Text style={styles.metricTitle}>Auto Fan Trigger</Text>
            <Text style={styles.metricValue}>
              {autoConfig.tempThresholdHigh.toFixed(1)}°
            </Text>
          </View>
        </View>

        {/* Detailed Summary Card (matching Screen 3 of the Mockup) */}
        <View style={[styles.summaryListCard, neuShadow]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <View style={styles.smallCircleIcon}>
                <Text style={styles.smallEmoji}>💧</Text>
              </View>
              <Text style={styles.summaryLabel}>Inside humidity (DHT22)</Text>
            </View>
            <Text style={styles.summaryVal}>
              {latestSensors.humidity.value.toFixed(1)} %
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <View style={styles.smallCircleIcon}>
                <Text style={styles.smallEmoji}>🔥</Text>
              </View>
              <Text style={styles.summaryLabel}>Smoke / Gas (MQ-2 Bếp)</Text>
            </View>
            <Text
              style={[
                styles.summaryVal,
                latestSensors.smoke.abnormal && { color: NEU_COLORS.danger },
              ]}
            >
              ADC {latestSensors.smoke.rawAdc} (
              {latestSensors.smoke.smokeLevelPercent}%)
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <View style={styles.smallCircleIcon}>
                <Text style={styles.smallEmoji}>🚶</Text>
              </View>
              <Text style={styles.summaryLabel}>Motion Sensor (PIR)</Text>
            </View>
            <Text style={styles.summaryVal}>
              {latestSensors.motion.motionDetected ? 'Có người!' : 'An toàn'}
            </Text>
          </View>
        </View>

        {/* Bottom 4 Circular Neumorphic Action Buttons: MODE | ECO | SCHEDULE | HISTORY */}
        <View style={styles.fourButtonsRow}>
          <View style={styles.actionBtnCol}>
            <TouchableOpacity
              style={[
                styles.roundActionBtn,
                neuShadow,
                systemMode === 'AUTO' && [
                  styles.roundActionBtnActive,
                  neuGlowPink,
                ],
              ]}
              onPress={() =>
                toggleSystemMode(systemMode === 'MANUAL' ? 'AUTO' : 'MANUAL')
              }
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.roundActionIcon,
                  systemMode === 'AUTO' && styles.roundActionIconActive,
                ]}
              >
                ♨️
              </Text>
            </TouchableOpacity>
            <Text style={styles.roundActionLabel}>
              MODE ({systemMode})
            </Text>
          </View>

          <View style={styles.actionBtnCol}>
            <TouchableOpacity
              style={[
                styles.roundActionBtn,
                neuShadow,
                isFanOn && [styles.roundActionBtnActive, neuGlowPink],
              ]}
              onPress={() =>
                sendDeviceCommand('fan1', {
                  power: isFanOn ? 'OFF' : 'ON',
                })
              }
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.roundActionIcon,
                  isFanOn && styles.roundActionIconActive,
                ]}
              >
                🍃
              </Text>
            </TouchableOpacity>
            <Text style={styles.roundActionLabel}>
              ECO FAN ({isFanOn ? 'ON' : 'OFF'})
            </Text>
          </View>

          <View style={styles.actionBtnCol}>
            <TouchableOpacity
              style={[
                styles.roundActionBtn,
                neuShadow,
                showSimPanel && styles.roundActionBtnActive,
              ]}
              onPress={() => setShowSimPanel(!showSimPanel)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.roundActionIcon,
                  showSimPanel && styles.roundActionIconActive,
                ]}
              >
                📅
              </Text>
            </TouchableOpacity>
            <Text style={styles.roundActionLabel}>TEST SIM</Text>
          </View>

          <View style={styles.actionBtnCol}>
            <TouchableOpacity
              style={[styles.roundActionBtn, neuShadow]}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.85}
            >
              <Text style={styles.roundActionIcon}>↺</Text>
            </TouchableOpacity>
            <Text style={styles.roundActionLabel}>HISTORY</Text>
          </View>
        </View>

        {/* Expandable Test Simulator & Recent Readings */}
        {showSimPanel && (
          <View style={[styles.simCard, neuShadowSubtle]}>
            <Text style={styles.simTitle}>
              🧪 Công cụ Giả lập Cảm biến & Kịch bản Kiểm thử
            </Text>
            <View style={styles.simBtnsRow}>
              <TouchableOpacity
                style={styles.simChip}
                onPress={() => triggerDemoSensorUpdate(32.2, 0, false)}
              >
                <Text style={styles.simChipText}>Nóng 32.2°C</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.simChip}
                onPress={() => triggerDemoSensorUpdate(30.1, 0, true)}
              >
                <Text style={styles.simChipText}>30.1°C + PIR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.simChip}
                onPress={() => triggerDemoSensorUpdate(27.8, 0, false)}
              >
                <Text style={styles.simChipText}>Mát 27.8°C</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.smokeTestBtn}
              onPress={triggerDemoSmokeAlert}
            >
              <Text style={styles.smokeTestBtnText}>
                🚨 Tạo Cảnh Báo Khói Mẫu (ADC 2740)
              </Text>
            </TouchableOpacity>

            {sensorReadings.slice(0, 4).map((r, i) => (
              <Text key={`${r.timestamp}_${i}`} style={styles.readingLine}>
                • {new Date(r.timestamp).toLocaleTimeString()}: 🌡️{' '}
                {r.temperature.toFixed(1)}°C | 💧 {r.humidity.toFixed(0)}% | 🔥
                ADC {r.smokeRawAdc}
              </Text>
            ))}
          </View>
        )}
        </ResponsiveContainer>
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
    backgroundColor: NEU_COLORS.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  circleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  backChevron: {
    fontSize: 22,
    fontWeight: '700',
    color: NEU_COLORS.textPrimary,
    marginTop: -2,
  },
  gearIcon: {
    fontSize: 16,
  },
  titleCenter: {
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
  },
  subStatus: {
    fontSize: 10,
    color: NEU_COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    alignItems: 'center',
  },
  dialSection: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
    width: '100%',
  },
  scaleLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 240,
    marginBottom: 4,
  },
  scaleSideLabel: {
    fontSize: 11,
    color: NEU_COLORS.textMuted,
    fontWeight: '700',
    marginTop: 28,
  },
  scaleTopLabel: {
    fontSize: 11,
    color: NEU_COLORS.textMuted,
    fontWeight: '700',
  },
  dialWrapper: {
    width: 246,
    height: 246,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tickContainer: {
    position: 'absolute',
    width: 246,
    height: 246,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tickMark: {
    width: 2,
    height: 8,
    borderRadius: 1,
    backgroundColor: '#D5DCE8',
  },
  tickMarkActive: {
    backgroundColor: NEU_COLORS.purple,
  },
  dialOuterRim: {
    width: 214,
    height: 214,
    borderRadius: 107,
    backgroundColor: '#F5F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  dialProgressRing: {
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: '#EDEFF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderTopColor: NEU_COLORS.purple,
    borderLeftColor: NEU_COLORS.pink,
    borderRightColor: '#E2E7F1',
    borderBottomColor: '#E2E7F1',
  },
  dialProgressRingDark: {
    backgroundColor: NEU_COLORS.navy,
    borderWidth: 10,
    borderTopColor: NEU_COLORS.navyDark,
    borderLeftColor: NEU_COLORS.navyDark,
    borderRightColor: NEU_COLORS.navyDark,
    borderBottomColor: NEU_COLORS.navyDark,
  },
  dialInnerCore: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
  },
  dialInnerCoreDark: {
    backgroundColor: NEU_COLORS.purple,
    borderColor: '#C084FC',
  },
  darkCorePinkGlow: {
    position: 'absolute',
    bottom: -30,
    right: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: NEU_COLORS.pink,
    opacity: 0.78,
  },
  heatingLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: NEU_COLORS.textSecondary,
    letterSpacing: 1,
  },
  heatingLabelDark: {
    color: '#FFFFFF',
  },
  dialTempNumber: {
    fontSize: 42,
    fontWeight: '300',
    color: '#9BA3B8',
    marginVertical: 2,
  },
  dialTempNumberDark: {
    color: '#FFFFFF',
    fontWeight: '400',
  },
  thresholdSub: {
    fontSize: 9,
    fontWeight: '700',
    color: NEU_COLORS.purple,
    marginBottom: 3,
  },
  thresholdSubDark: {
    color: '#FCE7F3',
  },
  leafIcon: {
    fontSize: 15,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  adjustBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  adjustBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: NEU_COLORS.purple,
  },
  themeSwitchPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  themeSwitchText: {
    fontSize: 11,
    fontWeight: '700',
    color: NEU_COLORS.textSecondary,
  },
  deviceDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    width: 220,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  deviceDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: NEU_COLORS.textSecondary,
  },
  dropdownChevron: {
    fontSize: 14,
    color: NEU_COLORS.textSecondary,
    fontWeight: '800',
  },
  twoCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  squareMetricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  metricIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricPinkBg: {
    backgroundColor: NEU_COLORS.pastelPink,
  },
  metricPurpleBg: {
    backgroundColor: NEU_COLORS.pastelPurple,
  },
  metricIconEmoji: {
    fontSize: 20,
  },
  metricTitle: {
    fontSize: 12,
    color: NEU_COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#5C6479',
  },
  summaryListCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallCircleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  smallEmoji: {
    fontSize: 14,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: NEU_COLORS.textSecondary,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F4F9',
    marginVertical: 4,
  },
  fourButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 12,
  },
  actionBtnCol: {
    alignItems: 'center',
  },
  roundActionBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginBottom: 6,
  },
  roundActionBtnActive: {
    backgroundColor: NEU_COLORS.pink,
    borderColor: NEU_COLORS.purple,
  },
  roundActionIcon: {
    fontSize: 20,
    color: NEU_COLORS.textSecondary,
  },
  roundActionIconActive: {
    color: '#FFFFFF',
  },
  roundActionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: NEU_COLORS.textSecondary,
    letterSpacing: 0.4,
  },
  simCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginTop: 8,
  },
  simTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
    marginBottom: 8,
  },
  simBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  simChip: {
    flex: 1,
    backgroundColor: NEU_COLORS.pastelPurple,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  simChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: NEU_COLORS.purpleDeep,
  },
  smokeTestBtn: {
    backgroundColor: NEU_COLORS.pastelPink,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  smokeTestBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: NEU_COLORS.coral,
  },
  readingLine: {
    fontSize: 11,
    color: NEU_COLORS.textSecondary,
    marginTop: 2,
  },
});
