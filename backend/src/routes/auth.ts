import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import type { AppServices, AuthTokenPayload } from '../types';

const signupSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const signinSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(8).max(128),
});

function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.isProduction,
    domain: config.COOKIE_DOMAIN,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function issueToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as any,
  });
}

export function createAuthRouter(services: AppServices): Router {
  const router = Router();

  router.post('/signup', authRateLimiter, validate({ body: signupSchema }), async (req, res) => {
    const passwordHash = await bcrypt.hash(req.body.password, config.BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username: req.body.username,
        email: req.body.email,
        passwordHash,
        balance: {
          create: { balance: '1.0' },
        },
      },
    });

    const tokenPayload: AuthTokenPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    res.cookie(config.authCookieName, issueToken(tokenPayload), authCookieOptions());
    const snapshot = await services.leaderboardService.getUserSnapshot(user.id);
    res.status(201).json({ user: snapshot });
  });

  router.post('/signin', authRateLimiter, validate({ body: signinSchema }), async (req, res) => {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: req.body.identifier }, { email: req.body.identifier.toLowerCase() }],
      },
    });

    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const tokenPayload: AuthTokenPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    res.cookie(config.authCookieName, issueToken(tokenPayload), authCookieOptions());
    const snapshot = await services.leaderboardService.getUserSnapshot(user.id);
    res.json({ user: snapshot });
  });

  router.post('/signout', (_req, res) => {
    res.clearCookie(config.authCookieName, authCookieOptions());
    res.status(204).send();
  });

  router.get('/me', requireAuth, async (req, res) => {
    const snapshot = await services.leaderboardService.getUserSnapshot(req.authUser!.sub);
    res.json({ user: snapshot });
  });

  return router;
}
