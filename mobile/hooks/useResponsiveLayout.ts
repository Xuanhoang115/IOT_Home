import { DimensionValue, useWindowDimensions } from 'react-native';
import { SPACING } from '../styles/neumorphicTheme';

export interface ResponsiveLayoutMetrics {
  width: number;
  isCompact: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  columns: 2 | 3 | 4;
  cardWidth: DimensionValue;
  horizontalPadding: number;
}

/**
 * Tính toán breakpoint & kích thước lưới chuẩn cho mọi kích thước màn hình:
 * - Compact mobile (< 380px): 2 cột, padding 12px
 * - Standard mobile (380 - 767px): 2 cột, padding 16px
 * - Tablet (768 - 1023px): 3 cột, padding 20px
 * - Desktop Web (>= 1024px): 4 cột, padding 24px
 */
export function useResponsiveLayout(): ResponsiveLayoutMetrics {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const columns: 2 | 3 | 4 = isDesktop ? 4 : isTablet ? 3 : 2;
  const cardWidth: DimensionValue =
    columns === 4 ? '23.8%' : columns === 3 ? '32%' : '48.5%';
  const horizontalPadding = isCompact
    ? SPACING.md
    : isDesktop
    ? SPACING.xxl
    : isTablet
    ? SPACING.xl
    : SPACING.lg;

  return {
    width,
    isCompact,
    isTablet,
    isDesktop,
    columns,
    cardWidth,
    horizontalPadding,
  };
}
