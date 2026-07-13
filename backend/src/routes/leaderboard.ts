import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import type { AppServices } from '../types';

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export function createLeaderboardRouter(services: AppServices): Router {
  const router = Router();

  router.get('/', validate({ query: querySchema }), async (req, res) => {
    const { limit } = req.query as { limit?: number };
    const leaderboard = await services.leaderboardService.getLeaderboard(limit ?? 50);
    res.json({ leaderboard });
  });

  return router;
}
