import { FullDatabaseSchema } from '../types/smarthome';

export function createInitialSeedData(homeId = 'home1', now = 1762855200000): FullDatabaseSchema {
  return {
    users: {
      uid_student_01: {
        email: 'student1@smarthome.edu.vn',
        displayName: 'Nguyễn Văn A (TV1 - Mobile)',
        role: 'owner',
        createdAt: now - 5200000,
      },
      uid_student_02: {
        email: 'student2@smarthome.edu.vn',
        displayName: 'Trần Thị B (TV2 - Cloud)',
        role: 'member',
        createdAt: now - 5100000,
      },
      uid_outsider: {
        email: 'outsider@example.com',
        displayName: 'Người Dùng Không Có Quyền',
        role: 'member',
        createdAt: now - 5000000,
      },
    },
    userHomes: {
      uid_student_01: {
        [homeId]: true,
      },
      uid_student_02: {
        [homeId]: true,
      },
      uid_outsider: {
        [homeId]: false,
      },
    },
    homes: {
      [homeId]: {
        name: 'Mô Hình Nhà Thông Minh Nhóm 5',
        systemMode: 'MANUAL',
        autoConfig: {
          tempThresholdHigh: 31.0,
          tempThresholdLow: 29.5,
          smokeThresholdAdc: 2200,
          motionAutoLight: false,
        },
        esp32Status: {
          online: true,
          lastSeen: now,
          rssi: -58,
          firmwareVersion: '1.0.0',
        },
      },
    },
    rooms: {
      [homeId]: {
        living_room: {
          id: 'living_room',
          name: 'Phòng khách',
          icon: 'sofa',
          deviceIds: ['light1', 'fan1', 'door1'],
        },
        bedroom: {
          id: 'bedroom',
          name: 'Phòng ngủ',
          icon: 'bed',
          deviceIds: ['light2'],
        },
        kitchen: {
          id: 'kitchen',
          name: 'Phòng bếp',
          icon: 'kitchen',
          deviceIds: [],
        },
      },
    },
    devices: {
      [homeId]: {
        light1: {
          id: 'light1',
          name: 'Đèn Phòng khách',
          type: 'light',
          roomId: 'living_room',
          desiredState: { power: 'OFF', mode: 'MANUAL' },
          reportedState: { power: 'OFF', mode: 'MANUAL' },
          lastCommandStatus: 'ACKED',
          lastUpdated: now,
        },
        light2: {
          id: 'light2',
          name: 'Đèn Phòng ngủ',
          type: 'light',
          roomId: 'bedroom',
          desiredState: { power: 'OFF', mode: 'MANUAL' },
          reportedState: { power: 'OFF', mode: 'MANUAL' },
          lastCommandStatus: 'ACKED',
          lastUpdated: now,
        },
        fan1: {
          id: 'fan1',
          name: 'Quạt Thông gió',
          type: 'fan',
          roomId: 'living_room',
          desiredState: { power: 'OFF', mode: 'MANUAL' },
          reportedState: { power: 'OFF', mode: 'MANUAL' },
          lastCommandStatus: 'ACKED',
          lastUpdated: now,
        },
        door1: {
          id: 'door1',
          name: 'Cửa Chính (Servo)',
          type: 'door',
          roomId: 'living_room',
          desiredState: { doorState: 'CLOSED', targetAngle: 0 },
          reportedState: {
            doorState: 'CLOSED',
            currentAngle: 0,
            positionVerified: false,
          },
          lastCommandStatus: 'ACKED',
          lastUpdated: now,
        },
      },
    },
    latestSensors: {
      [homeId]: {
        temperature: {
          value: 28.5,
          unit: 'C',
          roomId: 'living_room',
          updatedAt: now,
        },
        humidity: {
          value: 65.0,
          unit: '%',
          roomId: 'living_room',
          updatedAt: now,
        },
        motion: {
          motionDetected: false,
          roomId: 'living_room',
          updatedAt: now,
        },
        smoke: {
          rawAdc: 980,
          smokeLevelPercent: 23.9,
          abnormal: false,
          roomId: 'kitchen',
          updatedAt: now,
        },
      },
    },
    sensorReadings: {
      [homeId]: {
        [`sr_${now}`]: {
          temperature: 28.5,
          humidity: 65.0,
          smokeRawAdc: 980,
          motionDetected: false,
          timestamp: now,
        },
      },
    },
    commands: {
      [homeId]: {
        req_seed_initial_001: {
          requestId: 'req_seed_initial_001',
          deviceId: 'light1',
          desiredState: { power: 'OFF', mode: 'MANUAL' },
          status: 'ACKED',
          requestedBy: 'uid_student_01',
          createdAt: now - 1000,
          ackedAt: now,
        },
      },
    },
    alerts: {
      [homeId]: {
        alt_seed_mq2_demo: {
          id: 'alt_seed_mq2_demo',
          type: 'SMOKE_DETECTED',
          severity: 'CRITICAL',
          roomId: 'kitchen',
          deviceId: 'mq2_kitchen',
          message: 'Bản ghi mẫu: Phát hiện nồng độ khói/khí vượt ngưỡng tại Phòng bếp!',
          acknowledged: true,
          buzzerTriggered: true,
          autoFanTriggered: true,
          timestamp: now - 3600000,
        },
      },
    },
    activityLogs: {
      [homeId]: {
        [`log_${now}`]: {
          id: `log_${now}`,
          requestId: 'req_seed_initial_001',
          deviceId: 'light1',
          action: 'SYNC_INITIAL_STATE',
          source: 'BOOT_SYNC',
          actorUid: 'uid_student_01',
          timestamp: now,
        },
      },
    },
    notificationTokens: {
      uid_student_01: {
        iphone14plus_demo: {
          token: 'ExponentPushToken[demo_token_student_01]',
          platform: 'ios',
          deviceKey: 'iphone14plus_demo',
          updatedAt: now,
        },
      },
    },
  };
}
