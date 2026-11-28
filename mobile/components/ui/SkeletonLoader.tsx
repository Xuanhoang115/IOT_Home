import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import {
  NEU_COLORS,
  neuShadowSubtle,
  RADIUS,
  SPACING,
} from '../../styles/neumorphicTheme';

interface SkeletonLoaderProps {
  variant?: 'grid' | 'list';
  count?: number;
}

/**
 * Skeleton Loading State mượt mà (pulse animation nhẹ 850ms),
 * tuân thủ Design System tokens cho cả bố cục thẻ lưới và danh sách.
 */
export default function SkeletonLoader({
  variant = 'list',
  count = 3,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const items = Array.from({ length: count }, (_, idx) => idx);

  if (variant === 'grid') {
    return (
      <View
        style={styles.gridWrap}
        accessibilityRole="progressbar"
        accessibilityLabel="Đang tải danh sách thiết bị"
      >
        {items.map((idx) => (
          <Animated.View
            key={idx}
            style={[styles.gridCard, neuShadowSubtle, { opacity }]}
          >
            <View style={styles.circlePlaceholder} />
            <View style={[styles.bar, { width: '72%', height: 14, marginTop: SPACING.md }]} />
            <View style={[styles.bar, { width: '48%', height: 11, marginTop: SPACING.xs + 2 }]} />
            <View style={styles.gridBottom}>
              <View style={[styles.bar, { width: 34, height: 12 }]} />
              <View style={[styles.bar, { width: 46, height: 24, borderRadius: 12 }]} />
            </View>
          </Animated.View>
        ))}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Đang tải dữ liệu"
    >
      {items.map((idx) => (
        <Animated.View
          key={idx}
          style={[styles.listCard, neuShadowSubtle, { opacity }]}
        >
          <View style={styles.rowBetween}>
            <View style={[styles.bar, { width: '36%', height: 13 }]} />
            <View style={[styles.bar, { width: 58, height: 11 }]} />
          </View>
          <View style={[styles.bar, { width: '88%', height: 14, marginTop: SPACING.sm + 2 }]} />
          <View style={[styles.bar, { width: '62%', height: 11, marginTop: SPACING.sm }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md + 2,
    marginBottom: SPACING.md + 2,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
  },
  listCard: {
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
  },
  circlePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: NEU_COLORS.track,
  },
  bar: {
    backgroundColor: NEU_COLORS.track,
    borderRadius: RADIUS.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: NEU_COLORS.borderSubtle,
  },
});
