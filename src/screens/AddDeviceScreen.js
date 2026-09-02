import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddDeviceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Device</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 25,
    fontWeight: '700',
  },
});