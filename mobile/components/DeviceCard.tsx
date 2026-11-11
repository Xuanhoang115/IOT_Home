import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DesiredState, DeviceRecord } from '../types/smarthome';

interface DeviceCardProps {
  device: DeviceRecord;
  onToggle: (desiredState: DesiredState) => void;
  onPressDetail?: () => void;
}

const ROOM_LABELS: Record<string, string> = {
  living_room: 'Phòng khách',
  bedroom: 'Phòng ngủ',
  kitchen: 'Phòng bếp',
};

export default function DeviceCard({ device, onToggle, onPressDetail }: DeviceCardProps) {
  const isDoor = device.type === 'door';
  // QUAN TRỌNG: Trạng thái hiển thị chính thức trên UI luôn lấy từ reportedState (do ESP32 xác nhận)
  const isActive = isDoor
    ? device.reportedState.doorState === 'OPEN'
    : device.reportedState.power === 'ON';

  const isPending = device.lastCommandStatus === 'PENDING';
  const isTimeout = device.lastCommandStatus === 'TIMEOUT';

  const handleTogglePress = () => {
    if (isPending) return;
    if (isDoor) {
      const nextDoorState = isActive ? 'CLOSED' : 'OPEN';
      onToggle({
        doorState: nextDoorState,
        targetAngle: nextDoorState === 'OPEN' ? 90 : 0,
      });
    } else {
      onToggle({
        power: isActive ? 'OFF' : 'ON',
      });
    }
  };

  const getIcon = () => {
    if (device.type === 'light') return isActive ? '💡' : '🔌';
    if (device.type === 'fan') return isActive ? '🌀' : '🌬️';
    return isActive ? '🚪🔓' : '🚪🔒';
  };

  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      activeOpacity={0.85}
      onPress={onPressDetail || handleTogglePress}
    >
      <View style={styles.topRow}>
        <Text style={styles.icon}>{getIcon()}</Text>

        <TouchableOpacity
          style={[
            styles.switch,
            isActive && styles.switchActive,
            isPending && styles.switchPending,
          ]}
          onPress={handleTogglePress}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={[styles.dot, isActive && styles.dotActive]} />
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {device.name}
      </Text>
      <Text style={styles.room}>{ROOM_LABELS[device.roomId] || device.roomId}</Text>

      <View style={styles.footer}>
        {isPending ? (
          <Text style={styles.statusPending}>⏳ Đang chờ ESP32 ACK...</Text>
        ) : isTimeout ? (
          <Text style={styles.statusTimeout}>⚠️ Lỗi Timeout (Offline)</Text>
        ) : (
          <Text style={[styles.statusAcked, isActive && styles.statusOnText]}>
            {isDoor
              ? isActive
                ? `MỞ (${device.reportedState.currentAngle ?? 90}° - PWM)`
                : 'ĐÓNG (0° - PWM)'
              : isActive
              ? `ĐANG BẬT ${device.reportedState.mode ? `(${device.reportedState.mode})` : ''}`
              : 'ĐANG TẮT'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  cardActive: {
    borderColor: '#2850E8',
    backgroundColor: '#F8FAFF',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 30,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D0D5DD',
    padding: 3,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#2850E8',
  },
  switchPending: {
    backgroundColor: '#F79009',
    alignItems: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  dotActive: {
    alignSelf: 'flex-end',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D2939',
  },
  room: {
    fontSize: 11,
    color: '#667085',
    marginTop: 2,
  },
  footer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F4F7',
  },
  statusPending: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC6803',
  },
  statusTimeout: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D92D20',
  },
  statusAcked: {
    fontSize: 11,
    fontWeight: '600',
    color: '#667085',
  },
  statusOnText: {
    color: '#2850E8',
    fontWeight: '700',
  },
});
