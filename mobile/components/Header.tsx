import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Esp32StatusRecord, SystemMode } from '../types/smarthome';

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

export default function Header({
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
      <View style={styles.topRow}>
        <View>
          <Text style={styles.weather}>
            🌡️ {temperature.toFixed(1)}°C   💧 {humidity.toFixed(0)}%
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                esp32Status.online ? styles.dotOnline : styles.dotOffline,
              ]}
            />
            <Text style={styles.statusText}>
              {esp32Status.online
                ? `ESP32 Online (${esp32Status.rssi} dBm)`
                : 'ESP32 Offline (LWT)'}
            </Text>
          </View>
        </View>

        <View style={styles.rightActions}>
          {onToggleMode && (
            <TouchableOpacity
              style={[
                styles.modeBadge,
                systemMode === 'AUTO' ? styles.modeAuto : styles.modeManual,
              ]}
              onPress={onToggleMode}
            >
              <Text style={styles.modeText}>Chế độ: {systemMode}</Text>
            </TouchableOpacity>
          )}

          {onPressAlerts && (
            <TouchableOpacity style={styles.iconBtn} onPress={onPressAlerts}>
              <Text style={styles.iconEmoji}>🔔</Text>
              {unreadAlertCount > 0 && (
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>{unreadAlertCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {onPressSettings && (
            <TouchableOpacity style={styles.iconBtn} onPress={onPressSettings}>
              <Text style={styles.iconEmoji}>⚙️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2850E8',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weather: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#12B76A',
  },
  dotOffline: {
    backgroundColor: '#F04438',
  },
  statusText: {
    color: '#DCE4FF',
    fontSize: 11,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  modeAuto: {
    backgroundColor: '#12B76A',
  },
  modeManual: {
    backgroundColor: '#1D3AB8',
  },
  modeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconEmoji: {
    fontSize: 16,
  },
  alertBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F04438',
    borderRadius: 9,
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
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
  },
  subtitle: {
    color: '#DCE4FF',
    fontSize: 12,
    marginTop: 3,
  },
});
