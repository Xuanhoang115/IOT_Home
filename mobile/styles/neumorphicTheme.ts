import { StyleSheet } from 'react-native';

/**
 * SMART HOME IoT 2026 — DESIGN SYSTEM TOKENS
 * Tuân thủ chuẩn WCAG AA (độ tương phản chữ >= 4.5:1), lưới 4pt và nhất quán Web/Android.
 */
export const NEU_COLORS = {
  // Surfaces & Backgrounds
  bg: '#F3F5FA',
  bgLight: '#F8FAFD',
  card: '#FFFFFF',
  cardSoft: '#F6F8FC',
  track: '#E4E8F2',

  // Brand & Primary
  primary: '#7C3AED',
  purple: '#7C3AED',
  purpleDeep: '#6D28D9',
  pink: '#EC4899',
  coral: '#F43F5E',
  navy: '#1E2438',
  navyDark: '#141928',

  // Text (WCAG AA compliant trên nền trắng & xám nhạt)
  textPrimary: '#161B2E',
  textSecondary: '#5B6478',
  textMuted: '#6E778B',
  textOnDark: '#F8FAFC',
  textOnDarkMuted: '#B6C0D4',

  // Pastel & Semantic Surfaces
  pastelPink: '#FCE7F3',
  pastelPurple: '#EFE6FD',
  pastelGreen: '#DCFCE7',
  pastelDanger: '#FEE2E2',
  pastelWarning: '#FEF3C7',
  pastelInfo: '#E0F2FE',

  // Semantic Accents
  ecoGreen: '#16A34A',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
  info: '#0284C7',

  // Borders
  borderLight: '#FFFFFF',
  borderSubtle: '#E6EAF2',
  borderDark: '#D5DCE8',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 26,
  pill: 999,
} as const;

export const LAYOUT = {
  maxContentWidth: 960,
  maxFormWidth: 440,
  maxBottomNavWidth: 680,
  minTouchTarget: 44,
} as const;

export const TYPOGRAPHY = StyleSheet.create({
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
    letterSpacing: -0.6,
  },
  h1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: NEU_COLORS.textPrimary,
  },
  h3: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: NEU_COLORS.textPrimary,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: NEU_COLORS.textPrimary,
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: NEU_COLORS.textSecondary,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: NEU_COLORS.textSecondary,
  },
  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: NEU_COLORS.textSecondary,
    letterSpacing: 0.2,
  },
});

const shadowStyles = StyleSheet.create({
  neuShadow: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  neuShadowSubtle: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 2,
  },
  neuGlowPink: {
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
});

export const neuShadow = shadowStyles.neuShadow;
export const neuShadowSubtle = shadowStyles.neuShadowSubtle;
export const neuGlowPink = shadowStyles.neuGlowPink;

// Logo chính thức của dự án Smart Home IoT 2026 (dùng cho Favicon, App Icon, Dashboard, Splash)
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const APP_LOGO_IMAGE = require('../../assets/icon.png');

export const ROOM_PHOTOS: Record<string, string> = {
  bedroom:
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=600&q=80',
  living_room:
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
  kitchen:
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80',
  entrance:
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
};
