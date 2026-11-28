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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register, showToast } = useSmartHome();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMsg(null);
    setLoading(true);
    const result = await register(fullName, email, password);
    setLoading(false);

    if (result.ok) {
      showToast('Đăng ký tài khoản thành công! Đang vào Trang chủ.', 'success');
      navigation.replace('Dashboard');
    } else {
      setErrorMsg(result.error || 'Đăng ký không thành công. Vui lòng kiểm tra lại.');
    }
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
                  <Text style={TYPOGRAPHY.caption}>Đăng ký thành viên gia đình</Text>
                </View>
              </View>

              <Text style={[TYPOGRAPHY.h1, styles.title]}>Tạo Tài Khoản Mới</Text>
              <Text style={[TYPOGRAPHY.bodySmall, styles.subtitle]}>
                Tạo tài khoản thành viên để cùng theo dõi và điều khiển ngôi nhà thông minh.
              </Text>

              <Text style={[TYPOGRAPHY.label, styles.fieldLabel]}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Nguyễn Văn A"
                placeholderTextColor={NEU_COLORS.textMuted}
                value={fullName}
                onChangeText={(v) => {
                  setFullName(v);
                  if (errorMsg) setErrorMsg(null);
                }}
                editable={!loading}
                accessibilityLabel="Nhập họ và tên"
              />

              <Text style={[TYPOGRAPHY.label, styles.fieldLabel]}>Địa chỉ Email</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={NEU_COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (errorMsg) setErrorMsg(null);
                }}
                editable={!loading}
                accessibilityLabel="Nhập địa chỉ email"
              />

              <Text style={[TYPOGRAPHY.label, styles.fieldLabel]}>Mật khẩu</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Tối thiểu 6 ký tự"
                  placeholderTextColor={NEU_COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  editable={!loading}
                  onSubmitEditing={handleRegister}
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
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Đăng ký tài khoản"
                accessibilityState={{ busy: loading, disabled: loading }}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.buttonText}>Đang tạo tài khoản...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Đăng Ký</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
              >
                <Text style={styles.login}>Đã có tài khoản? Quay lại Đăng nhập</Text>
              </TouchableOpacity>
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
    width: 48,
    height: 48,
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
    marginBottom: SPACING.xl,
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
  },
  button: {
    height: 52,
    backgroundColor: NEU_COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  login: {
    color: NEU_COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
