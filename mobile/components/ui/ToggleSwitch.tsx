import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { NEU_COLORS, neuGlowPink } from '../../styles/neumorphicTheme';

interface ToggleSwitchProps {
  value: boolean;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  onToggle: () => void;
}

const TRACK_WIDTH = 50;
const THUMB_SIZE = 22;
const PADDING = 3;
const TRAVEL_DISTANCE = TRACK_WIDTH - THUMB_SIZE - PADDING * 2;

export default function ToggleSwitch({
  value,
  loading = false,
  disabled = false,
  accessibilityLabel,
  onToggle,
}: ToggleSwitchProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, value]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRAVEL_DISTANCE],
  });

  return (
    <TouchableOpacity
      style={[
        styles.track,
        value && styles.trackActive,
        loading && styles.trackLoading,
        disabled && styles.trackDisabled,
      ]}
      onPress={onToggle}
      disabled={disabled || loading}
      activeOpacity={0.82}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, busy: loading, disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={NEU_COLORS.warning} />
      ) : (
        <Animated.View
          style={[
            styles.thumb,
            value && styles.thumbActive,
            value && neuGlowPink,
            { transform: [{ translateX }] },
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DDE3EE',
    padding: PADDING,
    justifyContent: 'center',
  },
  trackActive: {
    backgroundColor: '#F3DDF8',
  },
  trackLoading: {
    backgroundColor: NEU_COLORS.pastelWarning,
    alignItems: 'center',
  },
  trackDisabled: {
    opacity: 0.55,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbActive: {
    backgroundColor: NEU_COLORS.pink,
    borderWidth: 2,
    borderColor: NEU_COLORS.primary,
  },
});
