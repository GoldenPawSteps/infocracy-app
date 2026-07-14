import { Router } from 'express';
import Decimal from 'decimal.js';
import { z } from 'zod';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import type { AppServices } from '../types';

const decimalStringSchema = z.union([z.string(), z.number()]).transform((value) => String(value)).refine((value) => {
  try {
    return new Decimal(value).isFinite();
  } catch {
    return false;
  }
}, 'Must be a valid decimal');

const positiveDecimalStringSchema = decimalStringSchema.refine((value) => new Decimal(value).gt(0), 'Must be greater than zero');
const nonNegativeDecimalStringSchema = decimalStringSchema.refine((value) => new Decimal(value).gte(0), 'Must be greater than or equal to zero');

const marketIdSchema = z.object({
  id: z.string().min(1),
});

const createMarketSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(4000).default(''),
    outcomes: z.array(z.object({ name: z.string().trim().min(1).max(100) })).min(2).max(20),
    liquidityB: positiveDecimalStringSchema,
    initialQ: z.array(nonNegativeDecimalStringSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.initialQ && value.initialQ.length !== value.outcomes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['initialQ'],
        message: 'initialQ must have the same length as outcomes',
      });
    }
  });

const tradeSchema = z.object({
  deltaQ: z.array(decimalStringSchema).min(2).max(20),
});

export function createMarketsRouter(services: AppServices): Router {
  const router = Router();

  router.post('/', requireAuth, validate({ body: createMarketSchema }), async (req, res) => {
    const market = await services.marketService.createMarket({
      makerId: req.authUser!.sub,
      title: req.body.title,
      description: req.body.description,
      outcomes: req.body.outcomes.map((outcome: { name: string }) => outcome.name),
      liquidityB: req.body.liquidityB,
      initialQ: req.body.initialQ,
    });

    await services.eventBus.emit('market:created', market);
    await services.eventBus.emit('leaderboard:updated', await services.leaderboardService.getLeaderboard(10));
    res.status(201).json({ market });
  });

  router.get('/', optionalAuth, async (req, res) => {
    const markets = await services.marketService.listMarkets(req.authUser?.sub);
    res.json({ markets });
  });

  router.get('/:id', validate({ params: marketIdSchema }), async (req, res) => {
    const market = await services.marketService.getMarketById(req.params.id);
    res.json({ market });
  });

  router.post('/:id/trade', requireAuth, validate({ params: marketIdSchema, body: tradeSchema }), async (req, res) => {
    const trade = await services.marketService.trade({
      marketId: req.params.id,
      takerId: req.authUser!.sub,
      deltaQ: req.body.deltaQ,
    });

    await services.eventBus.emit('market:traded', trade);
    await services.eventBus.emit('leaderboard:updated', await services.leaderboardService.getLeaderboard(10));
    res.status(201).json({ trade });
  });

  router.post('/:id/unmake', requireAuth, validate({ params: marketIdSchema }), async (req, res) => {
    const settlement = await services.marketService.unmake(req.params.id, req.authUser!.sub);
    await services.eventBus.emit('market:unmade', settlement);
    await services.eventBus.emit('leaderboard:updated', await services.leaderboardService.getLeaderboard(10));
    res.json({ settlement });
  });

  return router;
}
