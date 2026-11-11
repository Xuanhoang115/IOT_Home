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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useSmartHome();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    const result = await register(fullName, email, password);
    if (result.ok) {
      Alert.alert('Đăng ký thành công', 'Tài khoản đã được cấp quyền vào home1.', [
        { text: 'Vào Trang Chủ', onPress: () => navigation.replace('Dashboard') },
      ]);
    } else {
      Alert.alert('Đăng ký không thành công', result.error || 'Vui lòng kiểm tra lại.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tạo Tài Khoản Mới</Text>
      <Text style={styles.subtitle}>
        Đăng ký thành viên gia đình cho hệ thống Smart Living (`home1`)
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Họ và tên (VD: Lê Văn C)"
        placeholderTextColor="#98A2B3"
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email (VD: student3@smarthome.edu.vn)"
        placeholderTextColor="#98A2B3"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Mật khẩu (tối thiểu 6 ký tự)"
        placeholderTextColor="#98A2B3"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Đăng Ký</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.login}>Đã có tài khoản? Quay lại Đăng nhập</Text>
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
    fontSize: 26,
    fontWeight: '800',
    color: '#2850E8',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#667085',
    marginTop: 8,
    marginBottom: 26,
    fontSize: 13,
  },
  input: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E4E9F2',
    color: '#1D2939',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  login: {
    textAlign: 'center',
    color: '#2850E8',
    marginTop: 20,
    fontWeight: '600',
  },
});
