import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Quá nhiều yêu cầu từ thiết bị này, vui lòng thử lại sau ít phút.',
    },
  },
});

export const commandRateLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'COMMAND_RATE_LIMIT_EXCEEDED',
      message: 'Bạn đang gửi lệnh điều khiển quá nhanh, vui lòng đợi 10 giây.',
    },
  },
});
