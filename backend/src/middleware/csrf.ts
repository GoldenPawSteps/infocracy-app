import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { ApiError } from '../types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function cookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: config.isProduction,
    domain: config.COOKIE_DOMAIN,
    path: '/',
  };
}

export function attachCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  let token = cookies[config.csrfCookieName];

  if (!token) {
    token = randomBytes(32).toString('hex');
    res.cookie(config.csrfCookieName, token, cookieOptions());
  }

  res.locals.csrfToken = token;
  next();
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  const token = cookies[config.csrfCookieName];
  const headerToken = req.header('x-csrf-token');

  if (!token || !headerToken || token !== headerToken) {
    next(new ApiError(403, 'Invalid CSRF token'));
    return;
  }

  next();
}
