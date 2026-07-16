import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import type { AppServices } from '../types';

const paramsSchema = z.object({
  marketId: z.string().min(1),
});

const bodySchema = z.object({
  seed: z.string().min(1).max(255).optional(),
});

export function createGovernanceRouter(services: AppServices): Router {
  const router = Router();

  router.post('/:marketId/sample', optionalAuth, validate({ params: paramsSchema, body: bodySchema }), async (req, res) => {
    const result = await services.governanceService.sampleOutcome({
      marketId: req.params.marketId,
      sampledBy: req.authUser?.sub,
      seed: req.body.seed,
    });

    res.status(201).json({ sample: result });
  });

  return router;
}
