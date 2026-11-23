import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  APP_LOGO_IMAGE,
  NEU_COLORS,
  neuShadowSubtle,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '../styles/neumorphicTheme';
import { Esp32StatusRecord, SystemMode } from '../types/smarthome';
import ResponsiveContainer from './ui/ResponsiveContainer';

interface HeaderProps {
  title: string;
  subtitle?: string;
  temperature: number;
  humidity: number;
  esp32Status: Esp32StatusRecord;
  systemMode: SystemMode;
  unreadAlertCount: number;
  onToggleMode?: () => void;
  onPressAlerts?: () => void;
  onPressSettings?: () => void;
}

function Header({
  title,
  subtitle,
  temperature,
  humidity,
  esp32Status,
  systemMode,
  unreadAlertCount,
  onToggleMode,
  onPressAlerts,
  onPressSettings,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <ResponsiveContainer>
        <View style={styles.topRow}>
          <Image
            source={APP_LOGO_IMAGE}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Logo Smart Home"
          />
          <View style={styles.titleColumn}>
            <Text style={TYPOGRAPHY.h1} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[TYPOGRAPHY.caption, styles.subtitle]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.rightActions}>
            {onToggleMode && (
              <TouchableOpacity
                style={[
                  styles.modePill,
                  neuShadowSubtle,
                  systemMode === 'AUTO' && styles.modePillAuto,
                ]}
                onPress={onToggleMode}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Đổi chế độ hệ thống, hiện tại là ${systemMode}`}
              >
                <Text
                  style={[
                    styles.modePillText,
                    systemMode === 'AUTO' && styles.modePillTextAuto,
                  ]}
                >
                  {systemMode}
                </Text>
              </TouchableOpacity>
            )}

            {onPressAlerts && (
              <TouchableOpacity
                style={[styles.circleBtn, neuShadowSubtle]}
                onPress={onPressAlerts}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Cảnh báo, ${unreadAlertCount} chưa đọc`}
              >
                <Text style={styles.iconText}>🔔</Text>
                {unreadAlertCount > 0 && (
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>
                      {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {onPressSettings && (
              <TouchableOpacity
                style={[styles.circleBtn, neuShadowSubtle]}
                onPress={onPressSettings}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Mở cài đặt"
              >
                <Text style={styles.iconText}>⚙️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View
          style={[
            styles.statusStrip,
            !esp32Status.online && styles.statusStripOffline,
          ]}
        >
          <View style={styles.statusChip}>
            <View
              style={[
                styles.dot,
                esp32Status.online ? styles.dotOnline : styles.dotOffline,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                !esp32Status.online && styles.statusTextOffline,
              ]}
            >
              {esp32Status.online
                ? `ESP32 Online (${esp32Status.rssi} dBm)`
                : 'ESP32 Ngoại tuyến'}
            </Text>
          </View>

          <View style={styles.sensorMiniRow}>
            <Text style={styles.sensorMiniText}>
              🌡️ {temperature.toFixed(1)}°C
            </Text>
            <Text style={styles.sensorMiniText}>💧 {humidity.toFixed(0)}%</Text>
          </View>
        </View>
      </ResponsiveContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: NEU_COLORS.bg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm + 2,
  },
  titleColumn: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  subtitle: {
    marginTop: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modePill: {
    minHeight: 38,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: NEU_COLORS.card,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modePillAuto: {
    backgroundColor: NEU_COLORS.primary,
    borderColor: NEU_COLORS.primary,
  },
  modePillText: {
    color: NEU_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  modePillTextAuto: {
    color: '#FFFFFF',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NEU_COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
    position: 'relative',
  },
  iconText: {
    fontSize: 16,
  },
  alertBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: NEU_COLORS.coral,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm + 2,
    backgroundColor: '#EAEFF7',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  statusStripOffline: {
    backgroundColor: NEU_COLORS.pastelDanger,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  dotOnline: {
    backgroundColor: NEU_COLORS.success,
  },
  dotOffline: {
    backgroundColor: NEU_COLORS.danger,
  },
  statusText: {
    color: NEU_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextOffline: {
    color: NEU_COLORS.danger,
    fontWeight: '700',
  },
  sensorMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sensorMiniText: {
    color: NEU_COLORS.purpleDeep,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default React.memo(Header);
