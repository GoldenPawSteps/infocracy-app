import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../logger';
import { ApiError } from '../types';

function formatZodIssue(error: ZodError): string {
  const [firstIssue] = error.issues;

  if (!firstIssue) {
    return 'Validation failed';
  }

  const path = firstIssue.path.join('.');
  return path ? `${path}: ${firstIssue.message}` : firstIssue.message;
}

function formatUniqueConstraint(error: Prisma.PrismaClientKnownRequestError): string {
  const target = error.meta?.target;

  if (Array.isArray(target) && target.length > 0) {
    return `${target.join(' and ')} already in use`;
  }

  return 'Resource already exists';
}

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
    res.status(400).json({ error: formatZodIssue(error), details: error.flatten() });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: formatUniqueConstraint(error), details: error.meta ?? null });
      return;
    }
  }

  res.status(500).json({ error: 'Internal server error' });
}
