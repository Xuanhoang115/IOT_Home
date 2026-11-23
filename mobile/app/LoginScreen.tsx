import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import { useSmartHome } from '../hooks/useSmartHome';
import { firebaseAuth } from '../services/firebaseAuth';
import {
  APP_LOGO_IMAGE,
  LAYOUT,
  NEU_COLORS,
  neuShadow,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '../styles/neumorphicTheme';
import { RootStackParamList } from '../types/smarthome';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, backendConnected, showToast } = useSmartHome();
  const [email, setEmail] = useState(firebaseAuth ? '' : 'student1@smarthome.edu.vn');
  const [password, setPassword] = useState(firebaseAuth ? '' : '123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.ok) {
      showToast('Đăng nhập thành công! Chào mừng trở lại.', 'success');
      navigation.replace('Dashboard');
    } else {
      setErrorMsg(result.error || 'Email hoặc mật khẩu chưa chính xác.');
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
    setErrorMsg(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ResponsiveContainer maxWidth={LAYOUT.maxFormWidth}>
            <View style={[styles.card, neuShadow]}>
              <View style={styles.brandRow}>
                <Image
                  source={APP_LOGO_IMAGE}
                  style={styles.logoImage}
                  resizeMode="contain"
                  accessibilityLabel="Logo Smart Home IoT 2026"
                />
                <View>
                  <Text style={styles.logo}>Smart Living</Text>
                  <Text style={TYPOGRAPHY.caption}>Hệ thống Nhà Thông Minh IoT</Text>
                </View>
              </View>

              <Text style={[TYPOGRAPHY.h1, styles.title]}>Chào mừng trở lại</Text>
              <Text style={[TYPOGRAPHY.bodySmall, styles.subtitle]}>
                Đăng nhập để điều khiển và giám sát ngôi nhà của bạn theo thời gian thực.
              </Text>

              <View style={styles.statusChip}>
                <View
                  style={[
                    styles.statusDot,
                    backendConnected ? styles.dotOnline : styles.dotLocal,
                  ]}
                />
                <Text style={styles.statusChipText}>
                  {firebaseAuth
                    ? 'Xác thực an toàn qua Firebase Authentication'
                    : backendConnected
                    ? 'Đã kết nối máy chủ Smart Home'
                    : 'Chế độ mô phỏng cục bộ (Sẵn sàng Demo)'}
                </Text>
              </View>

              <Text style={[TYPOGRAPHY.label, styles.fieldLabel]}>Địa chỉ Email</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={NEU_COLORS.textMuted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errorMsg) setErrorMsg(null);
                }}
                editable={!loading}
                accessibilityLabel="Nhập địa chỉ email"
              />

              <Text style={[TYPOGRAPHY.label, styles.fieldLabel]}>Mật khẩu</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={NEU_COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                  accessibilityLabel="Nhập mật khẩu"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Text style={styles.eyeText}>{showPassword ? 'Ẩn' : 'Hiện'}</Text>
                </TouchableOpacity>
              </View>

              {errorMsg ? (
                <View style={styles.errorBox} accessibilityRole="alert">
                  <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Đăng nhập"
                accessibilityState={{ busy: loading, disabled: loading }}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.loginText}>Đang xác thực...</Text>
                  </View>
                ) : (
                  <Text style={styles.loginText}>Đăng Nhập</Text>
                )}
              </TouchableOpacity>

              {!firebaseAuth && (
                <View style={styles.quickBox}>
                  <Text style={styles.quickLabel}>Điền nhanh tài khoản Demo:</Text>
                  <View style={styles.quickRow}>
                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={() => fillDemoAccount('student1@smarthome.edu.vn')}
                      accessibilityRole="button"
                    >
                      <Text style={styles.quickChipText}>TV1 (Chủ nhà)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={() => fillDemoAccount('student2@smarthome.edu.vn')}
                      accessibilityRole="button"
                    >
                      <Text style={styles.quickChipText}>TV2 (Thành viên)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!firebaseAuth && (
                <TouchableOpacity
                  style={styles.registerBtn}
                  onPress={() => navigation.navigate('Register')}
                  accessibilityRole="button"
                >
                  <Text style={styles.register}>Chưa có tài khoản? Đăng ký ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          </ResponsiveContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: NEU_COLORS.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  card: {
    backgroundColor: NEU_COLORS.card,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  logoImage: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    color: NEU_COLORS.primary,
    letterSpacing: -0.4,
  },
  title: {
    marginBottom: SPACING.xs,
  },
  subtitle: {
    marginBottom: SPACING.lg,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEU_COLORS.pastelPurple,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  dotOnline: {
    backgroundColor: NEU_COLORS.success,
  },
  dotLocal: {
    backgroundColor: NEU_COLORS.primary,
  },
  statusChipText: {
    flex: 1,
    fontSize: 12,
    color: NEU_COLORS.purpleDeep,
    fontWeight: '700',
  },
  fieldLabel: {
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    height: 50,
    backgroundColor: NEU_COLORS.cardSoft,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
    color: NEU_COLORS.textPrimary,
    fontSize: 14,
  },
  passwordWrap: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEU_COLORS.cardSoft,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
    marginBottom: SPACING.lg,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.md,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    color: NEU_COLORS.textPrimary,
    fontSize: 14,
  },
  eyeBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  eyeText: {
    fontSize: 12,
    fontWeight: '700',
    color: NEU_COLORS.primary,
  },
  errorBox: {
    backgroundColor: NEU_COLORS.pastelDanger,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: NEU_COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  loginButton: {
    height: 52,
    backgroundColor: NEU_COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  loginButtonDisabled: {
    opacity: 0.75,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  quickBox: {
    marginTop: SPACING.lg,
    backgroundColor: NEU_COLORS.cardSoft,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: NEU_COLORS.borderSubtle,
  },
  quickLabel: {
    fontSize: 12,
    color: NEU_COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  quickRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickChip: {
    backgroundColor: NEU_COLORS.pastelPurple,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  quickChipText: {
    color: NEU_COLORS.purpleDeep,
    fontSize: 12,
    fontWeight: '700',
  },
  registerBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  register: {
    color: NEU_COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
