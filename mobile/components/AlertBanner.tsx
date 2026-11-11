import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertRecord } from '../types/smarthome';

interface AlertBannerProps {
  alert: AlertRecord | null;
  onPressViewAlerts: () => void;
  onAcknowledge: (alertId: string) => void;
}

export default function AlertBanner({
  alert,
  onPressViewAlerts,
  onAcknowledge,
}: AlertBannerProps) {
  if (!alert) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.headerRow}>
        <Text style={styles.badge}>🚨 KHẨN CẤP (FOREGROUND)</Text>
        <Text style={styles.roomTag}>
          {alert.roomId === 'kitchen' ? 'Phòng bếp' : 'Phòng khách'}
        </Text>
      </View>

      <Text style={styles.message}>{alert.message}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.viewBtn} onPress={onPressViewAlerts}>
          <Text style={styles.viewBtnText}>Xem Cảnh Báo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ackBtn}
          onPress={() => onAcknowledge(alert.id)}
        >
          <Text style={styles.ackBtnText}>Đã Xác Nhận</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D92D20',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDA29B',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  roomTag: {
    backgroundColor: '#912018',
    color: '#FEE4E2',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  viewBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: {
    color: '#B42318',
    fontWeight: '700',
    fontSize: 12,
  },
  ackBtn: {
    backgroundColor: '#7A271A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ackBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
});
