import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  LAYOUT,
  NEU_COLORS,
  neuGlowPink,
  neuShadow,
  SPACING,
} from '../styles/neumorphicTheme';
import { RootStackParamList } from '../types/smarthome';

interface BottomNavProps {
  activeTab: keyof RootStackParamList;
  onNavigate: (screen: keyof RootStackParamList) => void;
  unreadAlertCount?: number;
}

interface NavTabItemProps {
  label: string;
  icon: string;
  active: boolean;
  badgeCount?: number;
  onPress: () => void;
}

function NavTabItem({
  label,
  icon,
  active,
  badgeCount = 0,
  onPress,
}: NavTabItemProps) {
  return (
    <TouchableOpacity
      style={styles.wingTab}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <View style={styles.iconWrap}>
        <Text style={[styles.wingIcon, active && styles.wingIconActive]}>
          {icon}
        </Text>
        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.wingLabel, active && styles.wingLabelActive]}>
        {label}
      </Text>
      {active && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
}

function BottomNav({
  activeTab,
  onNavigate,
  unreadAlertCount = 0,
}: BottomNavProps) {
  const isSensorsActive = activeTab === 'Sensors';

  return (
    <View style={styles.shell}>
      <View style={styles.outerWrap}>
        <View style={styles.leftWing}>
          <NavTabItem
            label="Trang chủ"
            icon="⌂"
            active={activeTab === 'Dashboard'}
            onPress={() => onNavigate('Dashboard')}
          />
          <NavTabItem
            label="Thiết bị"
            icon="⊞"
            active={activeTab === 'Devices'}
            onPress={() => onNavigate('Devices')}
          />
        </View>

        <View style={styles.centerCutout}>
          <TouchableOpacity
            style={[
              styles.centerOrbOuter,
              neuShadow,
              isSensorsActive && neuGlowPink,
            ]}
            onPress={() => onNavigate('Sensors')}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityLabel="Cảm biến và nhiệt độ"
            accessibilityState={{ selected: isSensorsActive }}
          >
            <View
              style={[
                styles.centerOrbInner,
                isSensorsActive && styles.centerOrbInnerActive,
              ]}
            >
              <Text
                style={[
                  styles.centerMicIcon,
                  isSensorsActive && styles.centerMicIconActive,
                ]}
              >
                🌡️
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.rightWing}>
          <NavTabItem
            label="Cảnh báo"
            icon="🔔"
            active={activeTab === 'Alerts'}
            badgeCount={unreadAlertCount}
            onPress={() => onNavigate('Alerts')}
          />
          <NavTabItem
            label="Lịch sử"
            icon="↺"
            active={activeTab === 'History'}
            onPress={() => onNavigate('History')}
          />
          <NavTabItem
            label="Cài đặt"
            icon="👤"
            active={activeTab === 'Settings'}
            onPress={() => onNavigate('Settings')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: NEU_COLORS.bg,
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  outerWrap: {
    width: '100%',
    maxWidth: LAYOUT.maxBottomNavWidth,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 6,
    height: 78,
    position: 'relative',
  },
  leftWing: {
    flex: 1,
    height: 64,
    backgroundColor: NEU_COLORS.navy,
    borderTopRightRadius: 32,
    borderTopLeftRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingRight: 10,
  },
  rightWing: {
    flex: 1.35,
    height: 64,
    backgroundColor: NEU_COLORS.navy,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingLeft: 10,
  },
  centerCutout: {
    width: 74,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12,
    zIndex: 10,
  },
  centerOrbOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F6F8FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  centerOrbInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE6FD',
  },
  centerOrbInnerActive: {
    backgroundColor: NEU_COLORS.pink,
    borderColor: NEU_COLORS.primary,
  },
  centerMicIcon: {
    fontSize: 20,
    color: NEU_COLORS.pink,
  },
  centerMicIconActive: {
    color: '#FFFFFF',
  },
  wingTab: {
    minWidth: 48,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  iconWrap: {
    position: 'relative',
  },
  wingIcon: {
    fontSize: 18,
    color: NEU_COLORS.textOnDarkMuted,
    fontWeight: '700',
  },
  wingIconActive: {
    color: '#FFFFFF',
  },
  wingLabel: {
    fontSize: 11,
    color: NEU_COLORS.textOnDarkMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  wingLabelActive: {
    color: '#F472B6',
    fontWeight: '800',
  },
  activeIndicator: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F472B6',
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: NEU_COLORS.coral,
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});

export default React.memo(BottomNav);
