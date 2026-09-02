import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export default function RegisterScreen({ navigation }) {
  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Create Account
      </Text>

      <Text style={styles.subtitle}>
        Register for Smart Living
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>
          Register
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.login}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FC',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2850E8',
    textAlign: 'center',
  },

  subtitle: {
    textAlign: 'center',
    color: '#777',
    marginTop: 8,
    marginBottom: 30,
  },

  input: {
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },

  button: {
    height: 50,
    backgroundColor: '#2850E8',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  login: {
    textAlign: 'center',
    color: '#2850E8',
    marginTop: 20,
  },
});