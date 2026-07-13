import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../logger';
import { ApiError } from '../types';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, 'Route not found'));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err: error }, 'Request failed');

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ error: error.message, details: error.details ?? null });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: error.flatten() });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Resource already exists', details: error.meta ?? null });
      return;
    }
  }

  res.status(500).json({ error: 'Internal server error' });
}
