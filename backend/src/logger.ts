import pino from 'pino';
import { config } from './config';

export const logger = pino({
  name: 'infocracy-backend',
  level: config.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    censor: '[REDACTED]',
  },
});
