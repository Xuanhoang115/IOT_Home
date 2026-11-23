import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  NEU_COLORS,
  neuShadowSubtle,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '../../styles/neumorphicTheme';

interface StateViewProps {
  variant: 'empty' | 'error' | 'loading';
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function StateView({
  variant,
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: StateViewProps) {
  const isError = variant === 'error';
  const isLoading = variant === 'loading';

  return (
    <View
      style={[
        styles.container,
        neuShadowSubtle,
        isError && styles.containerError,
      ]}
      accessibilityRole={isError ? 'alert' : 'summary'}
    >
      <View
        style={[
          styles.iconCircle,
          isError && styles.iconCircleError,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={NEU_COLORS.primary} />
        ) : (
          <Text style={styles.iconText}>
            {icon || (isError ? '⚠️' : '✨')}
          </Text>
        )}
      </View>

      <Text style={[TYPOGRAPHY.h2, styles.title, isError && styles.titleError]}>
        {title}
      </Text>

      {description ? (
        <Text style={[TYPOGRAPHY.bodySmall, styles.description]}>
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.actionBtn, isError && styles.actionBtnError]}
          onPress={onAction}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
    marginVertical: SPACING.sm,
  },
  containerError: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: NEU_COLORS.pastelPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  iconCircleError: {
    backgroundColor: NEU_COLORS.pastelDanger,
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    textAlign: 'center',
  },
  titleError: {
    color: NEU_COLORS.danger,
  },
  description: {
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: 320,
  },
  actionBtn: {
    marginTop: SPACING.lg,
    backgroundColor: NEU_COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    minHeight: 42,
    justifyContent: 'center',
  },
  actionBtnError: {
    backgroundColor: NEU_COLORS.danger,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
