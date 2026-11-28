import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  NEU_COLORS,
  neuShadowSubtle,
  RADIUS,
  SPACING,
} from '../styles/neumorphicTheme';
import { RoomId } from '../types/smarthome';

export interface CategoryOption {
  id: RoomId | 'ALL';
  label: string;
}

interface CategoryTabsProps {
  categories: CategoryOption[];
  selectedId: RoomId | 'ALL';
  onSelect: (id: RoomId | 'ALL') => void;
}

export default function CategoryTabs({
  categories,
  selectedId,
  onSelect,
}: CategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
    >
      {categories.map((cat) => {
        const active = cat.id === selectedId;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.tab, neuShadowSubtle, active && styles.tabActive]}
            onPress={() => onSelect(cat.id)}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityLabel={cat.label}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: SPACING.md + 2,
    flexGrow: 0,
  },
  tab: {
    backgroundColor: NEU_COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
  },
  tabActive: {
    backgroundColor: NEU_COLORS.primary,
    borderColor: NEU_COLORS.primary,
  },
  text: {
    fontSize: 12,
    color: NEU_COLORS.textSecondary,
    fontWeight: '700',
  },
  textActive: {
    color: '#FFFFFF',
  },
});
