import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  LAYOUT,
  NEU_COLORS,
  neuShadow,
  RADIUS,
  SPACING,
} from '../../styles/neumorphicTheme';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

interface FeedbackToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

const TONE_CONFIG: Record<
  ToastTone,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: '#ECFDF3',
    border: '#86EFAC',
    text: '#166534',
    icon: '✓',
  },
  error: {
    bg: '#FEF2F2',
    border: '#FCA5A5',
    text: '#991B1B',
    icon: '!',
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FCD34D',
    text: '#92400E',
    icon: '⚠',
  },
  info: {
    bg: '#F0F9FF',
    border: '#7DD3FC',
    text: '#075985',
    icon: 'i',
  },
};

export default function FeedbackToast({ toast, onDismiss }: FeedbackToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-14)).current;

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    translateY.setValue(-14);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, toast, translateY]);

  if (!toast) return null;
  const palette = TONE_CONFIG[toast.tone];

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          neuShadow,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            opacity,
            transform: [{ translateY }],
          },
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <View style={[styles.badge, { backgroundColor: palette.text }]}>
          <Text style={styles.badgeIcon}>{palette.icon}</Text>
        </View>
        <Text style={[styles.message, { color: palette.text }]} numberOfLines={2}>
          {toast.text}
        </Text>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo"
        >
          <Text style={[styles.closeText, { color: palette.text }]}>✕</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 16,
    left: SPACING.lg,
    right: SPACING.lg,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    width: '100%',
    maxWidth: LAYOUT.maxFormWidth + 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
});
