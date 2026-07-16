import request from 'supertest';

import { createApp } from '../../src/app';
import type { AppServices } from '../../src/types';

function createServicesMock(sampleOutcome: AppServices['governanceService']['sampleOutcome']): AppServices {
  return {
    marketService: {
      createMarket: async () => ({}) as any,
      listMarkets: async () => [],
      getMarketById: async () => ({}),
      trade: async () => ({}),
      unmake: async () => ({}),
    },
    leaderboardService: {
      getLeaderboard: async () => [],
      getUserSnapshot: async () => ({}) as any,
    },
    governanceService: {
      sampleOutcome,
    },
    eventBus: {
      emit: async () => {},
    },
  };
}

describe('POST /api/governance/:marketId/sample', () => {
  it('allows anonymous users to sample a governance decision', async () => {
    const sampleOutcome = jest.fn(async (input: { marketId: string; sampledBy?: string; seed?: string }) => ({
      marketId: input.marketId,
      outcome: 1,
      probability: '0.42',
      seed: input.seed ?? 'anonymous-seed',
    }));

    const app = createApp(createServicesMock(sampleOutcome));
    const csrfResponse = await request(app).get('/api/csrf');
    const csrfToken = csrfResponse.body.csrfToken as string;
    const csrfCookie = csrfResponse.headers['set-cookie']?.[0];

    const response = await request(app)
      .post('/api/governance/market_123/sample')
      .set('x-csrf-token', csrfToken)
      .set('Cookie', [csrfCookie])
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.sample).toMatchObject({
      marketId: 'market_123',
      outcome: 1,
      probability: '0.42',
      seed: 'anonymous-seed',
    });
    expect(sampleOutcome).toHaveBeenCalledWith({
      marketId: 'market_123',
      sampledBy: undefined,
      seed: undefined,
    });
  });
});