import React from 'react';
import { View, Text } from 'react-native';

export default function DeviceDetailScreen({ route }) {
  const { device } = route.params;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 25 }}>
        {device.name}
      </Text>

      <Text>
        {device.room}
      </Text>
    </View>
  );
}