import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const generalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  // Read-heavy pages can legitimately burst GET requests (for example profile aggregation).
  max: (req) => (req.method === 'GET' || req.method === 'HEAD' ? config.RATE_LIMIT_MAX * 4 : config.RATE_LIMIT_MAX),
  skip: (req) => req.path === '/api/health' || req.path === '/api/csrf',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
