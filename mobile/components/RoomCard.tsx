import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DeviceRecord, RoomRecord } from '../types/smarthome';

interface RoomCardProps {
  room: RoomRecord;
  devices: DeviceRecord[];
  onPress: () => void;
}

export default function RoomCard({ room, devices, onPress }: RoomCardProps) {
  const roomDevices = devices.filter((d) => d.roomId === room.id);
  const activeCount = roomDevices.filter((d) =>
    d.type === 'door' ? d.reportedState.doorState === 'OPEN' : d.reportedState.power === 'ON'
  ).length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.icon}>{room.icon}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{room.name}</Text>
        <Text style={styles.sub}>
          {roomDevices.length > 0
            ? `${activeCount}/${roomDevices.length} thiết bị đang bật`
            : 'Khu vực cảm biến khói MQ-2'}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  icon: {
    fontSize: 28,
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D2939',
  },
  sub: {
    fontSize: 12,
    color: '#667085',
    marginTop: 2,
  },
  arrow: {
    fontSize: 22,
    color: '#98A2B3',
    fontWeight: '600',
  },
});
