import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
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
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onSelect(cat.id)}
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
    marginBottom: 14,
    flexGrow: 0,
  },
  tab: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  tabActive: {
    backgroundColor: '#2850E8',
    borderColor: '#2850E8',
  },
  text: {
    fontSize: 12,
    color: '#475467',
    fontWeight: '600',
  },
  textActive: {
    color: '#FFFFFF',
  },
});
