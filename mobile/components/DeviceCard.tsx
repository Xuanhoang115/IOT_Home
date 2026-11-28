import React from 'react';
import { DimensionValue, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  NEU_COLORS,
  neuShadow,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '../styles/neumorphicTheme';
import { DesiredState, DeviceRecord } from '../types/smarthome';
import ToggleSwitch from './ui/ToggleSwitch';

interface DeviceCardProps {
  device: DeviceRecord;
  onToggle: (desiredState: DesiredState) => void;
  onPressDetail?: () => void;
  cardWidth?: DimensionValue;
}

const ROOM_LABELS: Record<string, string> = {
  living_room: 'Phòng khách',
  bedroom: 'Phòng ngủ',
  kitchen: 'Phòng bếp',
};

function DeviceCard({
  device,
  onToggle,
  onPressDetail,
  cardWidth = '48.5%',
}: DeviceCardProps) {
  const isDoor = device.type === 'door';
  const isPending = device.lastCommandStatus === 'PENDING';
  const isTimeout = device.lastCommandStatus === 'TIMEOUT';
  const isFailed = device.lastCommandStatus === 'FAILED';
  const hasError = isTimeout || isFailed;

  // Khi đang gửi lệnh (PENDING), hiển thị trạng thái mục tiêu ngay lập tức;
  // nếu ESP32 offline (TIMEOUT/FAILED), trả về đúng reportedState thật.
  const effectiveState = isPending ? device.desiredState : device.reportedState;
  const isActive = isDoor
    ? effectiveState.doorState === 'OPEN'
    : effectiveState.power === 'ON';

  const handleTogglePress = () => {
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
    if (device.type === 'light') return isActive ? '💡' : '🛋️';
    if (device.type === 'fan') return isActive ? '🌀' : '🍃';
    return isActive ? '🔓' : '🚪';
  };

  const statusText = isPending
    ? 'Đang đồng bộ ESP32...'
    : isTimeout
    ? 'Hết thời gian chờ (Timeout)'
    : isFailed
    ? 'Gửi lệnh thất bại'
    : isDoor
    ? isActive
      ? `Đang mở (${device.reportedState.currentAngle ?? 90}°)`
      : 'Đã đóng (0°)'
    : device.reportedState.mode
    ? `Chế độ ${device.reportedState.mode}`
    : 'Sẵn sàng';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { width: cardWidth },
        neuShadow,
        isActive && styles.cardActive,
        hasError && styles.cardError,
      ]}
      activeOpacity={0.88}
      onPress={handleTogglePress}
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${isActive ? 'đang bật' : 'đang tắt'}. Chạm để bật hoặc tắt`}
    >
      <View style={styles.topHeader}>
        <View
          style={[
            styles.iconCircle,
            isActive ? styles.iconCircleActive : styles.iconCircleIdle,
            hasError && styles.iconCircleError,
          ]}
        >
          <Text style={styles.icon}>{getIcon()}</Text>
        </View>

        <TouchableOpacity
          style={styles.dotsBtn}
          onPress={onPressDetail || handleTogglePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Xem chi tiết ${device.name}`}
        >
          <Text style={styles.dotsText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <Text style={[TYPOGRAPHY.h3, styles.name]} numberOfLines={1}>
        {device.name}
      </Text>
      <Text style={[TYPOGRAPHY.caption, styles.room]} numberOfLines={1}>
        {ROOM_LABELS[device.roomId] || device.roomId}
      </Text>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            isPending
              ? styles.dotPending
              : hasError
              ? styles.dotError
              : isActive
              ? styles.dotActive
              : styles.dotIdle,
          ]}
        />
        <Text
          style={[
            styles.statusText,
            isPending && styles.statusPending,
            hasError && styles.statusError,
            !isPending && !hasError && isActive && styles.statusActive,
          ]}
          numberOfLines={1}
        >
          {statusText}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.onOffLabel, isActive && styles.onOffLabelActive]}>
          {isDoor ? (isActive ? 'MỞ' : 'ĐÓNG') : isActive ? 'BẬT' : 'TẮT'}
        </Text>

        <ToggleSwitch
          value={isActive}
          loading={isPending}
          onToggle={handleTogglePress}
          accessibilityLabel={`Công tắc ${device.name}`}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md + 2,
    marginBottom: SPACING.md + 2,
    borderWidth: 1.5,
    borderColor: NEU_COLORS.borderSubtle,
  },
  cardActive: {
    backgroundColor: '#FCF9FF',
    borderColor: '#E9D5FF',
  },
  cardError: {
    backgroundColor: '#FFF7F7',
    borderColor: '#FECACA',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleIdle: {
    backgroundColor: NEU_COLORS.cardSoft,
  },
  iconCircleActive: {
    backgroundColor: NEU_COLORS.pastelPink,
  },
  iconCircleError: {
    backgroundColor: NEU_COLORS.pastelDanger,
  },
  icon: {
    fontSize: 21,
  },
  dotsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: NEU_COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsText: {
    fontSize: 15,
    color: NEU_COLORS.textSecondary,
    fontWeight: '800',
  },
  name: {
    fontWeight: '800',
  },
  room: {
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotPending: {
    backgroundColor: NEU_COLORS.warning,
  },
  dotError: {
    backgroundColor: NEU_COLORS.danger,
  },
  dotActive: {
    backgroundColor: NEU_COLORS.primary,
  },
  dotIdle: {
    backgroundColor: NEU_COLORS.borderDark,
  },
  statusText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: NEU_COLORS.textSecondary,
  },
  statusPending: {
    color: NEU_COLORS.warning,
    fontWeight: '700',
  },
  statusError: {
    color: NEU_COLORS.danger,
    fontWeight: '700',
  },
  statusActive: {
    color: NEU_COLORS.primary,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: NEU_COLORS.borderSubtle,
  },
  onOffLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: NEU_COLORS.textSecondary,
    letterSpacing: 0.4,
  },
  onOffLabelActive: {
    color: NEU_COLORS.primary,
  },
});

export default React.memo(DeviceCard);
