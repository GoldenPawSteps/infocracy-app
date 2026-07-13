import { Router } from 'express';
import { createAuthRouter } from './auth';
import { createGovernanceRouter } from './governance';
import { createLeaderboardRouter } from './leaderboard';
import { createMarketsRouter } from './markets';
import type { AppServices } from '../types';

export function createApiRouter(services: AppServices): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/csrf', (_req, res) => {
    res.json({ csrfToken: res.locals.csrfToken });
  });

  router.use('/auth', createAuthRouter(services));
  router.use('/markets', createMarketsRouter(services));
  router.use('/leaderboard', createLeaderboardRouter(services));
  router.use('/governance', createGovernanceRouter(services));

  return router;
}
