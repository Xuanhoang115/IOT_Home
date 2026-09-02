import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Smart Living
      </Text>

      <Text style={styles.subtitle}>
        Welcome home 👋
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Control')}
      >
        <Text style={styles.buttonText}>
          Control devices
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.buttonText}>
          History
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.buttonText}>
          Profile
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 70,
    backgroundColor: '#F4F7FC',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2850E8',
  },

  subtitle: {
    fontSize: 16,
    color: '#777',
    marginTop: 5,
    marginBottom: 30,
  },

  button: {
    height: 55,
    backgroundColor: '#FFF',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },

  buttonText: {
    fontSize: 16,
    color: '#2850E8',
    fontWeight: '600',
  },
});