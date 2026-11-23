export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'SMART HOME IoT 2026 API',
    version: '1.0.0',
    description:
      'Backend REST API cho hệ thống Nhà Thông Minh IoT 2026: điều khiển thiết bị ESP32 qua EMQX Cloud MQTT TLS, giám sát cảm biến thời gian thực (DHT22, PIR, MQ-2, Flame), đồng bộ Firebase Realtime Database và đẩy cảnh báo FCM tới Android.',
  },
  servers: [
    {
      url: '/',
      description: 'Current Server (Render Cloud / Local)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Firebase ID Token (JWT)',
        description:
          'Nhập Firebase ID Token (hoặc `dev-token:uid_student_01` khi chạy chế độ In-Memory local).',
      },
    },
  },
  tags: [
    { name: 'System & Health', description: 'Kiểm tra trạng thái máy chủ, MQTT và tổng hợp dữ liệu' },
    { name: 'Rooms & Devices', description: 'Quản lý phòng và điều khiển thiết bị ESP32' },
    { name: 'System Mode', description: 'Chế độ tự động (AUTO / MANUAL) và ngưỡng cảm biến' },
    { name: 'Sensors & History', description: 'Dữ liệu cảm biến DHT22, PIR, MQ-2 và lịch sử hoạt động' },
    { name: 'Alerts & Notifications', description: 'Cảnh báo khói/lửa và đăng ký token FCM Android' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['System & Health'],
        summary: 'Kiểm tra trạng thái Server, MQTT & ESP32',
        description: 'Endpoint công khai trả về trạng thái kết nối EMQX MQTT, Firebase và ESP32 Online/Offline.',
        responses: {
          '200': { description: 'Trạng thái hệ thống hiện tại' },
        },
      },
    },
    '/api/snapshot': {
      get: {
        tags: ['System & Health'],
        summary: 'Lấy toàn bộ dữ liệu tổng hợp (1-Request Snapshot)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Trả về đầy đủ health, rooms, devices, sensors, alerts và history' },
          '401': { description: 'Thiếu hoặc sai Bearer Token' },
        },
      },
    },
    '/api/rooms': {
      get: {
        tags: ['Rooms & Devices'],
        summary: 'Lấy danh sách các phòng kèm thiết bị',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Danh sách phòng (Phòng khách, Phòng ngủ, Phòng bếp)' },
        },
      },
    },
    '/api/devices': {
      get: {
        tags: ['Rooms & Devices'],
        summary: 'Lấy danh sách tất cả thiết bị',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'roomId',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['living_room', 'bedroom', 'kitchen'] },
            description: 'Lọc thiết bị theo phòng',
          },
        ],
        responses: {
          '200': { description: 'Danh sách thiết bị và trạng thái reportedState mới nhất' },
        },
      },
    },
    '/api/devices/{id}': {
      get: {
        tags: ['Rooms & Devices'],
        summary: 'Xem chi tiết 1 thiết bị theo ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['light1', 'light2', 'fan1', 'door1'] },
          },
        ],
        responses: {
          '200': { description: 'Thông tin chi tiết thiết bị' },
          '404': { description: 'Không tìm thấy thiết bị' },
        },
      },
    },
    '/api/devices/{id}/commands': {
      post: {
        tags: ['Rooms & Devices'],
        summary: 'Gửi lệnh điều khiển xuống ESP32 (MQTT QoS 1)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['light1', 'light2', 'fan1', 'door1'] },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  desiredState: {
                    type: 'object',
                    example: { power: 'ON' },
                  },
                },
                required: ['desiredState'],
              },
              examples: {
                turnOnLight: {
                  summary: 'Bật đèn (light1 / light2)',
                  value: { desiredState: { power: 'ON' } },
                },
                openDoor: {
                  summary: 'Mở cửa Servo (door1)',
                  value: { desiredState: { doorState: 'OPEN', targetAngle: 90 } },
                },
                fanAuto: {
                  summary: 'Chuyển quạt sang chế độ AUTO (fan1)',
                  value: { desiredState: { mode: 'AUTO' } },
                },
              },
            },
          },
        },
        responses: {
          '202': { description: 'Đã gửi lệnh MQTT và chờ xác nhận ACK từ ESP32' },
          '400': { description: 'Payload không hợp lệ' },
        },
      },
    },
    '/api/home/mode': {
      patch: {
        tags: ['System Mode'],
        summary: 'Chuyển đổi chế độ AUTO / MANUAL & cập nhật ngưỡng tự động',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  systemMode: { type: 'string', enum: ['MANUAL', 'AUTO'] },
                  autoConfig: {
                    type: 'object',
                    properties: {
                      tempThresholdHigh: { type: 'number', example: 31.0 },
                      tempThresholdLow: { type: 'number', example: 29.5 },
                      smokeThresholdAdc: { type: 'integer', example: 2200 },
                      motionAutoLight: { type: 'boolean', example: true },
                    },
                  },
                },
                required: ['systemMode'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Đã cập nhật chế độ hệ thống thành công' },
        },
      },
    },
    '/api/sensors/latest': {
      get: {
        tags: ['Sensors & History'],
        summary: 'Lấy thông số cảm biến mới nhất và lịch sử gần đây',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Giá trị DHT22 (nhiệt độ, độ ẩm), PIR và MQ-2 mới nhất' },
        },
      },
    },
    '/api/history': {
      get: {
        tags: ['Sensors & History'],
        summary: 'Lấy nhật ký hoạt động (activityLogs) và lịch sử lệnh (commands)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 50 },
          },
        ],
        responses: {
          '200': { description: 'Danh sách nhật ký và lệnh điều khiển' },
        },
      },
    },
    '/api/alerts': {
      get: {
        tags: ['Alerts & Notifications'],
        summary: 'Lấy danh sách cảnh báo khói, lửa và lỗi cảm biến',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 50 },
          },
        ],
        responses: {
          '200': { description: 'Danh sách cảnh báo sắp xếp mới nhất trước' },
        },
      },
    },
    '/api/alerts/{id}/ack': {
      post: {
        tags: ['Alerts & Notifications'],
        summary: 'Xác nhận đã xử lý an toàn 1 cảnh báo',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Mã cảnh báo (alertId)',
          },
        ],
        responses: {
          '200': { description: 'Đã cập nhật acknowledged = true trên Firebase' },
          '404': { description: 'Không tìm thấy cảnh báo' },
        },
      },
    },
    '/api/notifications/register-token': {
      post: {
        tags: ['Alerts & Notifications'],
        summary: 'Đăng ký FCM Push Token cho thiết bị Android/Web',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string', example: 'fcm_device_token_string...' },
                  platform: { type: 'string', enum: ['android', 'ios', 'web'], example: 'android' },
                  deviceKey: { type: 'string', example: 'android_device_01' },
                },
                required: ['token', 'platform'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Đã lưu FCM token vào Firebase thành công' },
        },
      },
    },
  },
} as const;

export function renderSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SMART HOME IoT 2026 API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      background-color: #111318;
      color: #e5e7eb;
    }
    .swagger-ui {
      filter: invert(88%) hue-rotate(180deg);
    }
    .swagger-ui .microlight {
      filter: invert(100%) hue-rotate(180deg);
    }
    .swagger-ui .topbar {
      display: none;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true,
        docExpansion: 'list',
        presets: [SwaggerUIBundle.presets.apis],
      });
    };
  </script>
</body>
</html>`;
}
