import { describe, expect, it } from 'vitest';
import { Esp32SimulatorCore } from '../simulator/esp32-simulator';
import {
  evaluateTemperatureAutoFan,
  mqttAlertSchema,
  mqttSmokeSchema,
  shouldTriggerAlertNotification,
  validateDeviceDesiredState,
} from '../src/schemas/validation';

describe('Unit Tests - Zod Validation, Deduplication, Hysteresis & Alert Cooldown', () => {
  describe('1. Zod Validation Schemas cho Lệnh Điều Khiển Thiết Bị', () => {
    it('chấp nhận lệnh hợp lệ cho light1, light2, fan1 và door1', () => {
      const lightState = validateDeviceDesiredState('light1', { power: 'ON', mode: 'MANUAL' });
      expect(lightState).toEqual({ power: 'ON', mode: 'MANUAL' });

      const fanState = validateDeviceDesiredState('fan1', { mode: 'AUTO' });
      expect(fanState).toEqual({ mode: 'AUTO' });

      const doorOpen = validateDeviceDesiredState('door1', { doorState: 'OPEN' });
      expect(doorOpen).toEqual({ doorState: 'OPEN', targetAngle: 90 });

      const doorClosed = validateDeviceDesiredState('door1', { doorState: 'CLOSED' });
      expect(doorClosed).toEqual({ doorState: 'CLOSED', targetAngle: 0 });
    });

    it('từ chối lệnh sai kiểu dữ liệu hoặc thiếu trường bắt buộc', () => {
      expect(() => validateDeviceDesiredState('light1', { power: 'BLINK' })).toThrow();
      expect(() => validateDeviceDesiredState('fan1', {})).toThrow();
      expect(() =>
        validateDeviceDesiredState('door1', { doorState: 'OPEN', targetAngle: 270 })
      ).toThrow();
    });

    it('kiểm tra đúng schema cảm biến khói MQ-2 và bản tin cảnh báo', () => {
      const smoke = mqttSmokeSchema.parse({
        homeId: 'home1',
        type: 'smoke',
        rawAdc: 2650,
        smokeLevelPercent: 64.7,
        abnormal: true,
        timestamp: 1762855215000,
      });
      expect(smoke.thresholdAdc).toBe(2200);
      expect(smoke.roomId).toBe('kitchen');

      const alert = mqttAlertSchema.parse({
        alertId: 'alt_001',
        homeId: 'home1',
        type: 'SMOKE_DETECTED',
        severity: 'CRITICAL',
        roomId: 'kitchen',
        message: 'Cảnh báo khói vượt ngưỡng!',
        buzzerTriggered: true,
        timestamp: 1762855220000,
      });
      expect(alert.severity).toBe('CRITICAL');
    });
  });

  describe('2. Chống lặp lệnh (RequestId Ring-Buffer Deduplication) trên ESP32', () => {
    it('không thực thi lại phần cứng khi nhận trùng requestId từ MQTT QoS 1', () => {
      const sim = new Esp32SimulatorCore('home1');

      const firstAck = sim.processCommand({
        requestId: 'req_dup_test_01',
        homeId: 'home1',
        deviceId: 'door1',
        desiredState: { doorState: 'OPEN', targetAngle: 90 },
        requestedBy: 'uid_student_01',
        timestamp: 1000,
      });

      expect(firstAck.isDuplicate).toBe(false);
      expect(firstAck.reportedState).toEqual({
        doorState: 'OPEN',
        currentAngle: 90,
        positionVerified: false,
      });

      // Giả lập người dùng nhấn nút vật lý đóng cửa lại
      sim.simulatePhysicalButtonToggle('door1', 1500);
      expect(sim.state.devices.door1.doorState).toBe('CLOSED');

      // Broker gửi lặp lại bản tin QoS 1 cũ có cùng requestId 'req_dup_test_01'
      const duplicateAck = sim.processCommand({
        requestId: 'req_dup_test_01',
        homeId: 'home1',
        deviceId: 'door1',
        desiredState: { doorState: 'OPEN', targetAngle: 90 },
        requestedBy: 'uid_student_01',
        timestamp: 2000,
      });

      // Cửa KHÔNG bị mở lại ngoài ý muốn, nhưng vẫn gửi ACK kèm isDuplicate: true
      expect(duplicateAck.isDuplicate).toBe(true);
      expect(sim.state.devices.door1.doorState).toBe('CLOSED');
    });
  });

  describe('3. Logic Hysteresis cho Quạt ở chế độ AUTO', () => {
    it('bật quạt khi >= 31.0°C, giữ nguyên ở vùng trễ (29.5°C - 31.0°C) và tắt khi <= 29.5°C', () => {
      // Đang OFF, nhiệt độ 30.2°C -> Vẫn OFF
      expect(evaluateTemperatureAutoFan(30.2, 'OFF', 31.0, 29.5)).toBe('OFF');

      // Nhiệt độ tăng lên 31.2°C -> Bật ON
      expect(evaluateTemperatureAutoFan(31.2, 'OFF', 31.0, 29.5)).toBe('ON');

      // Nhiệt độ hạ nhẹ xuống 30.0°C (nằm giữa 29.5 và 31.0) -> Giữ nguyên ON để không bật/tắt liên tục
      expect(evaluateTemperatureAutoFan(30.0, 'ON', 31.0, 29.5)).toBe('ON');

      // Nhiệt độ hạ xuống 29.4°C (<= 29.5°C) -> Tắt OFF
      expect(evaluateTemperatureAutoFan(29.4, 'ON', 31.0, 29.5)).toBe('OFF');
    });
  });

  describe('4. Cơ chế Cooldown chống spam Push Notification cảnh báo', () => {
    it('chặn gửi thông báo trùng loại trong vòng 60 giây nhưng cho phép loại cảnh báo khác', () => {
      const cache = new Map<string, number>();
      const cooldownMs = 60000;

      // Cảnh báo khói đầu tiên tại t = 100_000 -> Cho phép gửi
      expect(
        shouldTriggerAlertNotification('home1:SMOKE_DETECTED', 100_000, cache, cooldownMs)
      ).toBe(true);

      // Cảnh báo khói tiếp theo sau 15 giây (t = 115_000) -> Chặn spam
      expect(
        shouldTriggerAlertNotification('home1:SMOKE_DETECTED', 115_000, cache, cooldownMs)
      ).toBe(false);

      // Cảnh báo chuyển động tại t = 120_000 (khác loại) -> Cho phép gửi ngay
      expect(
        shouldTriggerAlertNotification('home1:MOTION_DETECTED', 120_000, cache, cooldownMs)
      ).toBe(true);

      // Cảnh báo khói sau 61 giây (t = 161_000) -> Đã hết cooldown, cho phép gửi lại
      expect(
        shouldTriggerAlertNotification('home1:SMOKE_DETECTED', 161_000, cache, cooldownMs)
      ).toBe(true);
    });
  });
});
