import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  NEU_COLORS,
  neuShadowSubtle,
  RADIUS,
  SPACING,
} from '../styles/neumorphicTheme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Tìm kiếm thiết bị hoặc phòng...',
}: SearchBarProps) {
  return (
    <View style={[styles.container, neuShadowSubtle]}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={NEU_COLORS.textMuted}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Xóa từ khóa tìm kiếm"
        >
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    height: 46,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
    marginBottom: SPACING.md,
  },
  icon: {
    fontSize: 15,
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: NEU_COLORS.textPrimary,
  },
  clearIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: NEU_COLORS.textSecondary,
    paddingLeft: SPACING.sm,
  },
});
