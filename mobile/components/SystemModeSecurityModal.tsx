import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NEU_COLORS, neuGlowPink, neuShadow, neuShadowSubtle } from '../styles/neumorphicTheme';
import { AutoConfig, SystemMode } from '../types/smarthome';

interface SystemModeSecurityModalProps {
  visible: boolean;
  currentMode: SystemMode;
  targetMode: SystemMode;
  autoConfig: AutoConfig;
  securityPin: string;
  userRole?: 'owner' | 'member';
  onClose: () => void;
  onConfirm: (nextMode: SystemMode, nextConfig: AutoConfig) => void;
  onChangePin: (oldPin: string, newPin: string) => { ok: boolean; error?: string };
  onBruteForceLockout?: () => void;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

export default function SystemModeSecurityModal({
  visible,
  currentMode,
  targetMode,
  autoConfig,
  securityPin,
  userRole = 'owner',
  onClose,
  onConfirm,
  onChangePin,
  onBruteForceLockout,
}: SystemModeSecurityModalProps) {
  // Giai doan 1: 'LOCKED' (Phai nhap dung PIN moi mo duoc)
  // Giai doan 2: 'CONFIG' (Tuy chinh AUTO/MANUAL) hoac 'CHANGE_PIN' (Doi ma PIN 3 buoc)
  const [stage, setStage] = useState<'LOCKED' | 'CONFIG' | 'CHANGE_PIN'>('LOCKED');

  const [selectedMode, setSelectedMode] = useState<SystemMode>(targetMode);
  const [draftConfig, setDraftConfig] = useState<AutoConfig>(autoConfig);

  // Trang thai xac thuc PIN & Chong Brute-force
  const [pinInput, setPinInput] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Form doi ma PIN 3 lop (PIN cu -> PIN moi -> Xac nhan PIN moi)
  const [oldPinField, setOldPinField] = useState<string>('');
  const [newPinField, setNewPinField] = useState<string>('');
  const [confirmNewPinField, setConfirmNewPinField] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setStage('LOCKED');
      setSelectedMode(targetMode);
      setDraftConfig(autoConfig);
      setPinInput('');
      setErrorMsg('');
      setSuccessMsg('');
      setOldPinField('');
      setNewPinField('');
      setConfirmNewPinField('');
    }
  }, [visible, targetMode, autoConfig]);

  // Dong ho dem nguoc khi bi khoa Brute-force 30s
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          setErrorMsg('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleDigitPress = (digit: string) => {
    if (lockoutRemaining > 0) return;
    setErrorMsg('');
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      if (nextPin.length === 4) {
        verifyPinCode(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (lockoutRemaining > 0) return;
    setErrorMsg('');
    setPinInput((prev) => prev.slice(0, -1));
  };

  const verifyPinCode = (candidatePin: string) => {
    if (lockoutRemaining > 0) return;
    if (candidatePin.trim() === securityPin) {
      setFailedAttempts(0);
      setErrorMsg('');
      setStage('CONFIG');
      return;
    }

    const nextFailed = failedAttempts + 1;
    setFailedAttempts(nextFailed);
    setPinInput('');

    if (nextFailed >= MAX_ATTEMPTS) {
      setLockoutRemaining(LOCKOUT_SECONDS);
      setErrorMsg(
        `🚨 Nhập sai ${MAX_ATTEMPTS} lần liên tiếp! Hệ thống đã khóa bảo mật trong ${LOCKOUT_SECONDS} giây.`
      );
      if (onBruteForceLockout) onBruteForceLockout();
    } else {
      setErrorMsg(
        `⚠️ Mã PIN không chính xác! (Còn ${MAX_ATTEMPTS - nextFailed} lần thử trước khi khóa tạm thời)`
      );
    }
  };

  const adjustHighTemp = (delta: number) => {
    setDraftConfig((prev) => {
      const nextHigh = Number(
        Math.min(40, Math.max(25, prev.tempThresholdHigh + delta)).toFixed(1)
      );
      const nextLow =
        prev.tempThresholdLow >= nextHigh - 0.5
          ? Number((nextHigh - 1.0).toFixed(1))
          : prev.tempThresholdLow;
      return {
        ...prev,
        tempThresholdHigh: nextHigh,
        tempThresholdLow: nextLow,
      };
    });
  };

  const adjustLowTemp = (delta: number) => {
    setDraftConfig((prev) => {
      const maxAllowed = Number((prev.tempThresholdHigh - 0.5).toFixed(1));
      const nextLow = Number(
        Math.min(maxAllowed, Math.max(20, prev.tempThresholdLow + delta)).toFixed(1)
      );
      return {
        ...prev,
        tempThresholdLow: nextLow,
      };
    });
  };

  const adjustSmokeThreshold = (delta: number) => {
    setDraftConfig((prev) => ({
      ...prev,
      smokeThresholdAdc: Math.min(3500, Math.max(1000, prev.smokeThresholdAdc + delta)),
    }));
  };

  const handleSaveChangePin = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (userRole !== 'owner') {
      setErrorMsg('⚠️ Chỉ tài khoản Chủ nhà (Owner) mới có quyền đổi mã PIN bảo mật.');
      return;
    }
    if (oldPinField.trim().length !== 4) {
      setErrorMsg('⚠️ Vui lòng nhập đủ 4 chữ số của Mã PIN hiện tại.');
      return;
    }
    if (newPinField.trim().length !== 4 || !/^\d{4}$/.test(newPinField.trim())) {
      setErrorMsg('⚠️ Mã PIN mới phải gồm đúng 4 chữ số (0-9).');
      return;
    }
    if (newPinField.trim() === oldPinField.trim()) {
      setErrorMsg('⚠️ Mã PIN mới không được trùng với Mã PIN hiện tại.');
      return;
    }
    if (newPinField.trim() !== confirmNewPinField.trim()) {
      setErrorMsg('⚠️ Mã PIN xác nhận không khớp với Mã PIN mới!');
      return;
    }

    const res = onChangePin(oldPinField.trim(), newPinField.trim());
    if (!res.ok) {
      setErrorMsg(res.error || '⚠️ Mã PIN hiện tại không đúng.');
      return;
    }

    setOldPinField('');
    setNewPinField('');
    setConfirmNewPinField('');
    setSuccessMsg('✅ Đã cập nhật Mã PIN bảo mật mới thành công!');
    setTimeout(() => {
      setSuccessMsg('');
      setStage('CONFIG');
    }, 1100);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, neuShadow]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.lockBadge,
                stage !== 'LOCKED' && { backgroundColor: '#DCFCE7' },
              ]}
            >
              <Text style={styles.lockEmoji}>
                {stage === 'LOCKED' ? '🔒' : '🛡️'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {stage === 'LOCKED'
                  ? 'Xác Thực Bảo Mật Hệ Thống'
                  : stage === 'CHANGE_PIN'
                  ? 'Đổi Mã PIN Bảo Mật (3 Lớp)'
                  : 'Cấu Hình Chế Độ AUTO / MANUAL'}
              </Text>
              <Text style={styles.subtitle}>
                {stage === 'LOCKED'
                  ? `Yêu cầu quyền Chủ nhà để chuyển sang chế độ ${targetMode}`
                  : `Đã mở khóa xác thực • Quyền: ${userRole.toUpperCase()}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ================= GIAI ĐOẠN 1: MÀN HÌNH KHÓA MÃ PIN ================= */}
          {stage === 'LOCKED' && (
            <View style={styles.lockedContainer}>
              <View style={[styles.securityNoticeBox, neuShadowSubtle]}>
                <Text style={styles.securityNoticeTitle}>
                  🔐 Chốt chặn An toàn Chế độ Tự động
                </Text>
                <Text style={styles.securityNoticeDesc}>
                  Toàn bộ thông số ngưỡng cảm biến và quyền chuyển đổi chế độ{' '}
                  <Text style={{ fontWeight: '800', color: NEU_COLORS.purple }}>
                    {currentMode} → {targetMode}
                  </Text>{' '}
                  đang được khóa bảo vệ. Vui lòng nhập Mã PIN 4 số để mở khóa.
                </Text>
              </View>

              {/* 4 Chấm tròn trạng thái PIN */}
              <View style={styles.pinCirclesRow}>
                {[0, 1, 2, 3].map((idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.bigPinCircle,
                      pinInput.length > idx && styles.bigPinCircleFilled,
                      lockoutRemaining > 0 && styles.bigPinCircleLocked,
                    ]}
                  >
                    {pinInput.length > idx && <View style={styles.bigPinInnerDot} />}
                  </View>
                ))}
              </View>

              {lockoutRemaining > 0 ? (
                <View style={styles.lockoutBanner}>
                  <Text style={styles.lockoutTitle}>
                    ⛔ TẠM KHÓA BẢO MẬT ({lockoutRemaining}s)
                  </Text>
                  <Text style={styles.lockoutSub}>
                    Phát hiện nhập sai quá {MAX_ATTEMPTS} lần. Vui lòng đợi hết thời gian đếm ngược.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Bàn phím số Numpad 3x4 chuẩn két sắt bảo mật */}
                  <View style={styles.numpadGrid}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <TouchableOpacity
                        key={digit}
                        style={[styles.numpadKey, neuShadowSubtle]}
                        onPress={() => handleDigitPress(digit)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.numpadKeyText}>{digit}</Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={[styles.numpadKey, styles.numpadCancelKey]}
                      onPress={() => {
                        setPinInput('');
                        setErrorMsg('');
                      }}
                    >
                      <Text style={styles.numpadCancelText}>Xóa hết</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.numpadKey, neuShadowSubtle]}
                      onPress={() => handleDigitPress('0')}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.numpadKeyText}>0</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.numpadKey, styles.numpadBackKey]}
                      onPress={handleBackspace}
                    >
                      <Text style={styles.numpadBackText}>⌫</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    (pinInput.length < 4 || lockoutRemaining > 0) && { opacity: 0.5 },
                  ]}
                  disabled={pinInput.length < 4 || lockoutRemaining > 0}
                  onPress={() => verifyPinCode(pinInput)}
                >
                  <Text style={styles.confirmBtnText}>🔓 Mở Khóa Cấu Hình</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= GIAI ĐOẠN 2: ĐÃ MỞ KHÓA -> CẤU HÌNH AUTO / MANUAL ================= */}
          {stage === 'CONFIG' && (
            <View>
              <View style={styles.unlockedTopBar}>
                <Text style={styles.sectionLabel}>1. CHỌN CHẾ ĐỘ VẬN HÀNH</Text>
                <TouchableOpacity
                  style={styles.changePinPill}
                  onPress={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setStage('CHANGE_PIN');
                  }}
                >
                  <Text style={styles.changePinPillText}>🔑 Đổi Mã PIN Bảo Mật</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modeSegmentRow}>
                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    selectedMode === 'AUTO' && [styles.modeOptionActive, neuGlowPink],
                  ]}
                  onPress={() => setSelectedMode('AUTO')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.modeOptionTitle,
                      selectedMode === 'AUTO' && styles.modeOptionTitleActive,
                    ]}
                  >
                    🤖 AUTO (Tự động)
                  </Text>
                  <Text
                    style={[
                      styles.modeOptionDesc,
                      selectedMode === 'AUTO' && styles.modeOptionDescActive,
                    ]}
                  >
                    Tự bật quạt làm mát & hút khói
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    selectedMode === 'MANUAL' && [styles.modeOptionActive, neuGlowPink],
                  ]}
                  onPress={() => setSelectedMode('MANUAL')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.modeOptionTitle,
                      selectedMode === 'MANUAL' && styles.modeOptionTitleActive,
                    ]}
                  >
                    🖐️ MANUAL (Thủ công)
                  </Text>
                  <Text
                    style={[
                      styles.modeOptionDesc,
                      selectedMode === 'MANUAL' && styles.modeOptionDescActive,
                    ]}
                  >
                    Điều khiển tay qua Web & nút
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>2. TÙY CHỈNH NGƯỠNG TỰ ĐỘNG HÓA (AUTO)</Text>
              <View style={[styles.rulesBox, neuShadowSubtle]}>
                {/* Ngưỡng Bật Quạt */}
                <View style={styles.ruleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ruleTitle}>🌡️ Nhiệt độ BẬT quạt (High)</Text>
                    <Text style={styles.ruleHint}>Quạt tự bật khi ≥ ngưỡng này</Text>
                  </View>
                  <View style={styles.stepperWrap}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => adjustHighTemp(-0.5)}>
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValue}>
                      {draftConfig.tempThresholdHigh.toFixed(1)}°C
                    </Text>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => adjustHighTemp(0.5)}>
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Ngưỡng Tắt Quạt (Hysteresis) */}
                <View style={styles.ruleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ruleTitle}>❄️ Nhiệt độ TẮT quạt (Hysteresis)</Text>
                    <Text style={styles.ruleHint}>Chống đóng/ngắt quạt liên tục</Text>
                  </View>
                  <View style={styles.stepperWrap}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => adjustLowTemp(-0.5)}>
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValue}>
                      {draftConfig.tempThresholdLow.toFixed(1)}°C
                    </Text>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => adjustLowTemp(0.5)}>
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Ngưỡng Khói MQ-2 */}
                <View style={styles.ruleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ruleTitle}>🔥 Ngưỡng Báo Động Khói (ADC)</Text>
                    <Text style={styles.ruleHint}>Hú còi & bật quạt khẩn cấp</Text>
                  </View>
                  <View style={styles.stepperWrap}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustSmokeThreshold(-100)}
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValue}>{draftConfig.smokeThresholdAdc}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustSmokeThreshold(100)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Tự bật/tắt đèn theo PIR */}
                <View style={[styles.ruleRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ruleTitle}>
                      🚶 Tự BẬT/TẮT Đèn P.Khách theo người (PIR)
                    </Text>
                    <Text style={styles.ruleHint}>
                      Có người tự BẬT • Hết chuyển động tự TẮT
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.miniSwitch,
                      draftConfig.motionAutoLight && styles.miniSwitchOn,
                    ]}
                    onPress={() =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        motionAutoLight: !prev.motionAutoLight,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.miniSwitchText,
                        draftConfig.motionAutoLight && styles.miniSwitchTextOn,
                      ]}
                    >
                      {draftConfig.motionAutoLight ? 'BẬT' : 'TẮT'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, neuGlowPink]}
                  onPress={() => onConfirm(selectedMode, draftConfig)}
                >
                  <Text style={styles.confirmBtnText}>
                    ✅ Áp Dụng Chế Độ ({selectedMode})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= GIAI ĐOẠN 3: ĐỔI MÃ PIN BẢO MẬT 3 LỚP ================= */}
          {stage === 'CHANGE_PIN' && (
            <View>
              <Text style={styles.sectionLabel}>
                XÁC MINH 3 LỚP ĐỂ ĐỔI MÃ PIN BẢO MẬT
              </Text>

              <View style={[styles.rulesBox, neuShadowSubtle]}>
                <Text style={styles.inputLabel}>1. Nhập Mã PIN hiện tại:</Text>
                <TextInput
                  style={styles.pinInput}
                  value={oldPinField}
                  onChangeText={(txt) =>
                    setOldPinField(txt.replace(/[^0-9]/g, '').slice(0, 4))
                  }
                  placeholder="•••• (4 chữ số hiện tại)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                  2. Nhập Mã PIN mới (4 chữ số, khác PIN cũ):
                </Text>
                <TextInput
                  style={styles.pinInput}
                  value={newPinField}
                  onChangeText={(txt) =>
                    setNewPinField(txt.replace(/[^0-9]/g, '').slice(0, 4))
                  }
                  placeholder="•••• (4 chữ số mới)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                  3. Nhập lại Mã PIN mới để xác nhận:
                </Text>
                <TextInput
                  style={styles.pinInput}
                  value={confirmNewPinField}
                  onChangeText={(txt) =>
                    setConfirmNewPinField(txt.replace(/[^0-9]/g, '').slice(0, 4))
                  }
                  placeholder="•••• (Nhập lại khớp 100%)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
              {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setStage('CONFIG');
                  }}
                >
                  <Text style={styles.cancelBtnText}>‹ Quay lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, neuGlowPink]}
                  onPress={handleSaveChangePin}
                >
                  <Text style={styles.confirmBtnText}>💾 Lưu Mã PIN Mới</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 29, 46, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: NEU_COLORS.bg,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  lockBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lockEmoji: {
    fontSize: 22,
  },
  title: {
    fontSize: 17.5,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: NEU_COLORS.purple,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4B5563',
  },
  lockedContainer: {
    alignItems: 'center',
  },
  securityNoticeBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  securityNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
    marginBottom: 4,
  },
  securityNoticeDesc: {
    fontSize: 12,
    color: NEU_COLORS.textSecondary,
    lineHeight: 17,
  },
  pinCirclesRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 10,
  },
  bigPinCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPinCircleFilled: {
    borderColor: NEU_COLORS.purple,
    backgroundColor: '#F3E8FF',
  },
  bigPinCircleLocked: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  bigPinInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NEU_COLORS.purple,
  },
  numpadGrid: {
    width: '100%',
    maxWidth: 280,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  numpadKey: {
    width: '30%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  numpadKeyText: {
    fontSize: 18,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
  },
  numpadCancelKey: {
    backgroundColor: '#F3F4F6',
  },
  numpadCancelText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  numpadBackKey: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  numpadBackText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  lockoutBanner: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  lockoutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  lockoutSub: {
    fontSize: 12,
    color: '#991B1B',
    textAlign: 'center',
    marginTop: 4,
  },
  unlockedTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  changePinPill: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  changePinPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: NEU_COLORS.purple,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: NEU_COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  modeSegmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modeOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  modeOptionActive: {
    backgroundColor: NEU_COLORS.purple,
    borderColor: NEU_COLORS.purple,
  },
  modeOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
  },
  modeOptionTitleActive: {
    color: '#FFFFFF',
  },
  modeOptionDesc: {
    fontSize: 11,
    color: NEU_COLORS.textSecondary,
    marginTop: 2,
  },
  modeOptionDescActive: {
    color: '#F3E8FF',
  },
  rulesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ruleTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: NEU_COLORS.textPrimary,
  },
  ruleHint: {
    fontSize: 11,
    color: NEU_COLORS.textMuted,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: NEU_COLORS.purple,
  },
  stepValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: NEU_COLORS.textPrimary,
    minWidth: 50,
    textAlign: 'center',
  },
  miniSwitch: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  miniSwitchOn: {
    backgroundColor: NEU_COLORS.pink,
  },
  miniSwitchText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#4B5563',
  },
  miniSwitchTextOn: {
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: NEU_COLORS.textPrimary,
    marginBottom: 4,
  },
  pinInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '700',
    color: NEU_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
  },
  successText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  confirmBtn: {
    flex: 1.7,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: NEU_COLORS.purple,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
