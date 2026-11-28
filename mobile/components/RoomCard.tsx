import React from 'react';
import { DimensionValue, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  NEU_COLORS,
  neuShadow,
  RADIUS,
  ROOM_PHOTOS,
  SPACING,
  TYPOGRAPHY,
} from '../styles/neumorphicTheme';
import { DeviceRecord, RoomRecord } from '../types/smarthome';
import ToggleSwitch from './ui/ToggleSwitch';

interface RoomCardProps {
  room: RoomRecord;
  primaryDevice?: DeviceRecord;
  smokeAbnormal?: boolean;
  smokeRawAdc?: number;
  onPress: () => void;
  onTogglePrimary?: () => void;
  cardWidth?: DimensionValue;
}

const ROOM_ICON_MAP: Record<string, string> = {
  bed: '🛏️',
  sofa: '🛋️',
  kitchen: '🍳',
};

function RoomCard({
  room,
  primaryDevice,
  smokeAbnormal = false,
  smokeRawAdc = 0,
  onPress,
  onTogglePrimary,
  cardWidth = '48.5%',
}: RoomCardProps) {
  const photoUri = ROOM_PHOTOS[room.id] || ROOM_PHOTOS.living_room;
  const displayEmoji = ROOM_ICON_MAP[room.icon] || room.icon || '🏠';

  const isPending = primaryDevice?.lastCommandStatus === 'PENDING';
  const effectiveState = primaryDevice
    ? isPending
      ? primaryDevice.desiredState
      : primaryDevice.reportedState
    : undefined;
  const isPrimaryActive =
    primaryDevice && effectiveState
      ? primaryDevice.type === 'door'
        ? effectiveState.doorState === 'OPEN'
        : effectiveState.power === 'ON'
      : false;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { width: cardWidth },
        neuShadow,
        smokeAbnormal && !primaryDevice && styles.cardAlert,
      ]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`Mở chi tiết ${room.name}`}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: photoUri }}
          style={styles.roomImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlayBadge}>
          <Text style={styles.roomEmoji}>{displayEmoji}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={onPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Chi tiết ${room.name}`}
        >
          <Text style={styles.moreBtnText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <Text style={[TYPOGRAPHY.h3, styles.roomTitle]} numberOfLines={1}>
        {room.name}
      </Text>
      <Text style={[TYPOGRAPHY.caption, styles.roomSub]} numberOfLines={1}>
        {primaryDevice ? primaryDevice.name : 'Giám sát khói/gas MQ-2'}
      </Text>

      {primaryDevice ? (
        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.stateText,
              isPending && styles.stateTextPending,
              !isPending && isPrimaryActive && styles.stateTextActive,
            ]}
          >
            {isPending ? 'Đang gửi...' : isPrimaryActive ? 'BẬT' : 'TẮT'}
          </Text>

          <ToggleSwitch
            value={isPrimaryActive}
            loading={isPending}
            onToggle={onTogglePrimary || onPress}
            accessibilityLabel={`Bật tắt nhanh ${primaryDevice.name}`}
          />
        </View>
      ) : (
        <View style={styles.bottomRow}>
          <View
            style={[
              styles.sensorSafePill,
              smokeAbnormal && styles.sensorDangerPill,
            ]}
          >
            <Text
              style={[
                styles.sensorSafeText,
                smokeAbnormal && styles.sensorDangerText,
              ]}
              numberOfLines={1}
            >
              {smokeAbnormal
                ? `🚨 ADC ${smokeRawAdc}`
                : `🟢 An toàn (${smokeRawAdc})`}
            </Text>
          </View>
          <Text style={styles.detailLink}>Chi tiết ›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md + 2,
    borderWidth: 1.5,
    borderColor: NEU_COLORS.borderSubtle,
  },
  cardAlert: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF7F7',
  },
  imageContainer: {
    width: '100%',
    height: 108,
    borderRadius: RADIUS.md + 2,
    overflow: 'hidden',
    backgroundColor: NEU_COLORS.track,
    marginBottom: SPACING.sm + 2,
    position: 'relative',
  },
  roomImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  roomEmoji: {
    fontSize: 14,
  },
  moreBtn: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
  },
  roomTitle: {
    fontWeight: '800',
    paddingHorizontal: SPACING.xs,
  },
  roomSub: {
    marginTop: 2,
    paddingHorizontal: SPACING.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xs,
    paddingBottom: 2,
    minHeight: 28,
    gap: 4,
  },
  stateText: {
    fontSize: 12,
    fontWeight: '800',
    color: NEU_COLORS.textSecondary,
  },
  stateTextPending: {
    color: NEU_COLORS.warning,
  },
  stateTextActive: {
    color: NEU_COLORS.primary,
  },
  sensorSafePill: {
    backgroundColor: NEU_COLORS.pastelGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    flexShrink: 1,
  },
  sensorDangerPill: {
    backgroundColor: NEU_COLORS.pastelDanger,
  },
  sensorSafeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  sensorDangerText: {
    color: NEU_COLORS.danger,
  },
  detailLink: {
    fontSize: 12,
    fontWeight: '700',
    color: NEU_COLORS.primary,
  },
});

export default React.memo(RoomCard);
