import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { AuthTokenPayload } from '../types';
import { ApiError } from '../types';

function readToken(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[config.authCookieName];
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    req.authUser = jwt.verify(token, config.JWT_SECRET) as AuthTokenPayload;
  } catch {
    req.authUser = undefined;
  }

  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  optionalAuth(req, _res, () => {
    if (!req.authUser) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }
    next();
  });
}
