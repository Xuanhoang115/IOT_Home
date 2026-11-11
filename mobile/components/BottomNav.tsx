import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RootStackParamList } from '../types/smarthome';

interface BottomNavProps {
  activeTab: keyof RootStackParamList;
  onNavigate: (screen: keyof RootStackParamList) => void;
  unreadAlertCount?: number;
}

const NAV_ITEMS: Array<{
  key: keyof RootStackParamList;
  label: string;
  icon: string;
}> = [
  { key: 'Dashboard', label: 'Trang chủ', icon: '🏠' },
  { key: 'Devices', label: 'Thiết bị', icon: '🎛️' },
  { key: 'Sensors', label: 'Cảm biến', icon: '📡' },
  { key: 'Alerts', label: 'Cảnh báo', icon: '🚨' },
  { key: 'History', label: 'Lịch sử', icon: '🕒' },
  { key: 'Settings', label: 'Cài đặt', icon: '⚙️' },
];

export default function BottomNav({
  activeTab,
  onNavigate,
  unreadAlertCount = 0,
}: BottomNavProps) {
  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.tab}
            onPress={() => onNavigate(item.key)}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{item.icon}</Text>
              {item.key === 'Alerts' && unreadAlertCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadAlertCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E4E9F2',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  iconWrap: {
    position: 'relative',
  },
  icon: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#D92D20',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  label: {
    fontSize: 10,
    color: '#667085',
    marginTop: 2,
  },
  labelActive: {
    color: '#2850E8',
    fontWeight: '700',
  },
});
