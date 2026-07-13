import 'express-async-errors';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config';
import { logger } from './logger';
import { optionalAuth } from './middleware/auth';
import { attachCsrfToken, requireCsrf } from './middleware/csrf';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalRateLimiter } from './middleware/rateLimiter';
import { createApiRouter } from './routes';
import type { AppServices } from './types';

export function createApp(services: AppServices) {
  const app = express();

  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(generalRateLimiter);
  app.use(attachCsrfToken);
  app.use(optionalAuth);
  app.use(requireCsrf);

  app.use('/api', createApiRouter(services));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
