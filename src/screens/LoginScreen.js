import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleLogin = () => {
    if (email === 'admin' && password === '123456') {
      navigation.replace('Home');
    }
    else {
      Alert.alert('đăng nhập thất bại');
    }
  };
  return (
    <View style={styles.container}>

      <Text style={styles.logo}>Smart Living</Text>

      <Text style={styles.title}>
        Welcome Back
      </Text>

      <Text style={styles.subtitle}>
        Login to control your smart home
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => navigation.replace('Home')}
      >
        <Text style={styles.loginText}>
          Login
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.register}>
          Don't have an account? Register
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

  logo: {
    fontSize: 30,
    fontWeight: '700',
    color: '#2850E8',
    textAlign: 'center',
    marginBottom: 30,
  },

  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#222',
  },

  subtitle: {
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

  loginButton: {
    height: 50,
    backgroundColor: '#2850E8',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  loginText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  register: {
    textAlign: 'center',
    color: '#2850E8',
    marginTop: 20,
  },
});