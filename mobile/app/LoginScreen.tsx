import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSmartHome } from '../hooks/useSmartHome';
import { RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, backendConnected } = useSmartHome();
  const [email, setEmail] = useState('student1@smarthome.edu.vn');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.ok) {
      navigation.replace('Dashboard');
    } else {
      Alert.alert('Đăng nhập thất bại', result.error || 'Sai thông tin đăng nhập');
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🏠 Smart Living</Text>
      <Text style={styles.title}>Chào mừng trở lại</Text>
      <Text style={styles.subtitle}>
        Đăng nhập để điều khiển và giám sát ngôi nhà thông minh (`home1`)
      </Text>

      <View style={styles.statusChip}>
        <View
          style={[
            styles.statusDot,
            backendConnected ? styles.dotOnline : styles.dotLocal,
          ]}
        />
        <Text style={styles.statusChipText}>
          {backendConnected
            ? 'Đã kết nối Backend REST API Live'
            : 'Chế độ Offline / Simulator Ready (Sẵn sàng Demo)'}
        </Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email (VD: student1@smarthome.edu.vn)"
        placeholderTextColor="#98A2B3"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        placeholderTextColor="#98A2B3"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginText}>
          {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
        </Text>
      </TouchableOpacity>

      <View style={styles.quickBox}>
        <Text style={styles.quickLabel}>Điền nhanh tài khoản Demo:</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickChip}
            onPress={() => fillDemoAccount('student1@smarthome.edu.vn')}
          >
            <Text style={styles.quickChipText}>TV1 (Chủ nhà)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickChip}
            onPress={() => fillDemoAccount('student2@smarthome.edu.vn')}
          >
            <Text style={styles.quickChipText}>TV2 (Thành viên)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.register}>
          Chưa có tài khoản? Đăng ký ngay
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
    fontWeight: '800',
    color: '#2850E8',
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D2939',
  },
  subtitle: {
    color: '#667085',
    marginTop: 6,
    marginBottom: 16,
    fontSize: 13,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0EAFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 18,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotOnline: {
    backgroundColor: '#12B76A',
  },
  dotLocal: {
    backgroundColor: '#2850E8',
  },
  statusChipText: {
    fontSize: 12,
    color: '#1D3AB8',
    fontWeight: '600',
  },
  input: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4E9F2',
    color: '#1D2939',
  },
  loginButton: {
    height: 50,
    backgroundColor: '#2850E8',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  quickBox: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4E9F2',
  },
  quickLabel: {
    fontSize: 12,
    color: '#475467',
    marginBottom: 8,
    fontWeight: '600',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickChip: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickChipText: {
    color: '#2850E8',
    fontSize: 12,
    fontWeight: '700',
  },
  register: {
    textAlign: 'center',
    color: '#2850E8',
    marginTop: 20,
    fontWeight: '600',
  },
});
