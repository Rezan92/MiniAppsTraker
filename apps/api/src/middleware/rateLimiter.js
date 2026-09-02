import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // Max 30 requests per 15 minutes per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication requests. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

export const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // Max 30 requests per 15 minutes per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many invitation requests. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});
