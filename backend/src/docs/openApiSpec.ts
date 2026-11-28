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
  <meta name="color-scheme" content="dark" />
  <title>SMART HOME IoT 2026 API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #0f1218;
      color: #f1f5f9;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .swagger-ui { color: #f1f5f9; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .wrapper { max-width: 1120px; padding: 0 24px; }
    .swagger-ui .info { margin: 32px 0 20px; }
    .swagger-ui .info .title {
      color: #ffffff;
      font-weight: 800;
      letter-spacing: -0.4px;
    }
    .swagger-ui .info .title small {
      background: #334155;
      color: #f8fafc;
      border-radius: 999px;
      padding: 3px 10px;
    }
    .swagger-ui .info .title small.version-stamp {
      background: #65a30d;
      color: #ffffff;
    }
    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table {
      color: #cbd5e1;
      font-size: 14px;
      line-height: 1.6;
    }
    .swagger-ui .info a {
      color: #60a5fa;
      text-decoration: none;
      font-weight: 600;
    }
    .swagger-ui .info a:hover { text-decoration: underline; }
    .swagger-ui .scheme-container {
      background: #171b24;
      box-shadow: none;
      border-top: 1px solid #262c3a;
      border-bottom: 1px solid #262c3a;
      padding: 18px 0;
    }
    .swagger-ui .filter-container {
      background: transparent;
      margin: 16px 0 4px;
    }
    .swagger-ui .filter-container .operation-filter-input {
      background: #171b24 !important;
      color: #f8fafc !important;
      border: 1px solid #334155 !important;
      border-radius: 10px !important;
      padding: 10px 14px !important;
      font-size: 14px;
    }
    .swagger-ui .filter-container .operation-filter-input::placeholder {
      color: #94a3b8;
    }
    .swagger-ui .servers-title, .swagger-ui label, .swagger-ui .opblock-tag,
    .swagger-ui .opblock-tag small, .swagger-ui h4, .swagger-ui h5,
    .swagger-ui .opblock-description-wrapper p, .swagger-ui .opblock-summary-description,
    .swagger-ui .opblock-summary-path, .swagger-ui .response-col_status,
    .swagger-ui .response-col_description, .swagger-ui .response-col_links,
    .swagger-ui table thead tr th, .swagger-ui table thead tr td,
    .swagger-ui .parameter__name, .swagger-ui .parameter__type,
    .swagger-ui .parameter__in, .swagger-ui .tab li button.tablinks,
    .swagger-ui .responses-inner h4, .swagger-ui .responses-inner h5,
    .swagger-ui .model-title, .swagger-ui .model, .swagger-ui .prop-type,
    .swagger-ui .renderedMarkdown p, .swagger-ui .renderedMarkdown code {
      color: #e2e8f0 !important;
    }
    .swagger-ui .renderedMarkdown code {
      background: #1e293b;
      padding: 2px 6px;
      border-radius: 5px;
    }
    .swagger-ui .opblock-tag small, .swagger-ui .opblock-summary-description,
    .swagger-ui .parameter__in {
      color: #94a3b8 !important;
    }
    .swagger-ui .opblock-tag {
      border-bottom: 1px solid #262c3a;
      transition: background 0.15s ease;
    }
    .swagger-ui .opblock-tag:hover { background: rgba(255,255,255,0.04); }
    .swagger-ui select, .swagger-ui input[type=text], .swagger-ui input[type=password],
    .swagger-ui textarea {
      background: #0f1218 !important;
      color: #f8fafc !important;
      border: 1px solid #334155 !important;
      border-radius: 8px;
    }
    .swagger-ui .btn.authorize {
      color: #4ade80;
      border-color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
      border-radius: 8px;
      transition: background 0.15s ease, transform 0.15s ease;
    }
    .swagger-ui .btn.authorize:hover {
      background: rgba(34, 197, 94, 0.18);
    }
    .swagger-ui .btn.authorize svg { fill: #4ade80 !important; }
    .swagger-ui .opblock {
      border-radius: 10px;
      box-shadow: none;
      margin: 0 0 12px;
      background: #171b24;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .swagger-ui .opblock .opblock-summary {
      padding: 6px 10px;
    }
    .swagger-ui .opblock .opblock-summary-method {
      border-radius: 6px;
      font-weight: 800;
      min-width: 72px;
    }
    .swagger-ui .opblock.opblock-get {
      border-color: #1d4ed8;
      background: rgba(37, 99, 235, 0.12);
    }
    .swagger-ui .opblock.opblock-get:hover { background: rgba(37, 99, 235, 0.17); }
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #2563eb; }
    .swagger-ui .opblock.opblock-post {
      border-color: #15803d;
      background: rgba(22, 163, 74, 0.12);
    }
    .swagger-ui .opblock.opblock-post:hover { background: rgba(22, 163, 74, 0.17); }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #16a34a; }
    .swagger-ui .opblock.opblock-patch {
      border-color: #0f766e;
      background: rgba(13, 148, 136, 0.14);
    }
    .swagger-ui .opblock.opblock-patch:hover { background: rgba(13, 148, 136, 0.2); }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #0d9488; }
    .swagger-ui .opblock .opblock-section-header {
      background: #1e2432;
      box-shadow: none;
      border-top: 1px solid #262c3a;
      border-bottom: 1px solid #262c3a;
    }
    .swagger-ui .opblock-body pre.microlight,
    .swagger-ui .highlight-code pre.microlight {
      background: #0b0e14 !important;
      color: #e2e8f0 !important;
      border: 1px solid #262c3a;
      border-radius: 8px;
    }
    /* Sửa các nút Copy / Download bị nền trắng chói trên nền tối */
    .swagger-ui .copy-to-clipboard,
    .swagger-ui .download-contents {
      background: #1e293b !important;
      border: 1px solid #475569 !important;
      border-radius: 6px !important;
      color: #e2e8f0 !important;
    }
    .swagger-ui .copy-to-clipboard button {
      background: transparent !important;
      filter: invert(0.92);
    }
    .swagger-ui .copy-to-clipboard:hover,
    .swagger-ui .download-contents:hover {
      background: #334155 !important;
    }
    /* Sửa icon ổ khóa, mũi tên đóng/mở bị đen chìm trên nền tối */
    .swagger-ui svg.arrow,
    .swagger-ui .expand-operation svg,
    .swagger-ui .opblock-control-arrow svg,
    .swagger-ui .opblock-tag svg,
    .swagger-ui .authorization__btn svg,
    .swagger-ui .model-toggle::after {
      fill: #cbd5e1 !important;
      color: #cbd5e1 !important;
    }
    .swagger-ui .authorization__btn.locked svg {
      fill: #4ade80 !important;
    }
    .swagger-ui .authorization__btn.unlocked svg {
      fill: #94a3b8 !important;
    }
    .swagger-ui .opblock-control-arrow:hover svg,
    .swagger-ui .expand-operation:hover svg,
    .swagger-ui .authorization__btn:hover svg {
      fill: #ffffff !important;
    }
    .swagger-ui .dialog-ux .modal-ux {
      background: #171b24;
      border: 1px solid #334155;
      border-radius: 14px;
    }
    .swagger-ui .dialog-ux .modal-ux-header { border-bottom: 1px solid #262c3a; }
    .swagger-ui .dialog-ux .modal-ux-header h3, .swagger-ui .dialog-ux .modal-ux-content p,
    .swagger-ui .dialog-ux .modal-ux-content h4, .swagger-ui .dialog-ux .modal-ux-content code {
      color: #f8fafc !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header .close-modal svg {
      fill: #cbd5e1 !important;
    }
    .swagger-ui .btn {
      border-radius: 8px;
      color: #f8fafc;
      border-color: #475569;
      background: #1e2432;
      transition: background 0.15s ease;
    }
    .swagger-ui .btn:hover { background: #334155; }
    .swagger-ui .btn.execute { background: #2563eb; border-color: #2563eb; color: #ffffff; }
    .swagger-ui .btn.execute:hover { background: #1d4ed8; }
    .swagger-ui .btn.cancel { border-color: #ef4444; color: #fca5a5; }
    @media (max-width: 640px) {
      .swagger-ui .wrapper { padding: 0 12px; }
      .swagger-ui .scheme-container .schemes { flex-direction: column; align-items: stretch; gap: 12px; }
      .swagger-ui .opblock .opblock-summary-description { display: none; }
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
        filter: true,
        persistAuthorization: true,
        docExpansion: 'list',
        presets: [SwaggerUIBundle.presets.apis],
      });
    };
  </script>
</body>
</html>`;
}
