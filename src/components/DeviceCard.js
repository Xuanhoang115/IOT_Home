import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export default function DeviceCard({ device, onPress }) {
  const [active, setActive] = useState(device.active);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={onPress}
    >

      <View style={styles.imageBox}>
        <Text style={styles.deviceIcon}>
          {device.icon}
        </Text>
      </View>

      <Text style={styles.name}>
        {device.name}
      </Text>

      <Text style={styles.room}>
        {device.room}
      </Text>

      <Text style={styles.count}>
        {device.count}
      </Text>

      <TouchableOpacity
        style={[
          styles.switch,
          active && styles.switchActive,
        ]}
        onPress={() => setActive(!active)}
      >
        <View
          style={[
            styles.dot,
            active && styles.dotActive,
          ]}
        />
      </TouchableOpacity>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    height: 145,
    backgroundColor: '#FFF',
    borderRadius: 11,
    padding: 10,
    marginBottom: 12,
    position: 'relative',

    elevation: 2,
  },

  imageBox: {
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },

  deviceIcon: {
    fontSize: 45,
  },

  name: {
    color: '#2871DF',
    fontSize: 10,
    marginTop: 5,
  },

  room: {
    color: '#444',
    fontSize: 8,
    marginTop: 5,
  },

  count: {
    color: '#555',
    fontSize: 8,
    marginTop: 2,
  },

  switch: {
    position: 'absolute',
    right: 10,
    bottom: 12,

    width: 30,
    height: 16,
    borderRadius: 10,

    backgroundColor: '#E2E2E2',
    padding: 2,
  },

  switchActive: {
    backgroundColor: '#08B9EF',
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
  },

  dotActive: {
    alignSelf: 'flex-end',
  },
});