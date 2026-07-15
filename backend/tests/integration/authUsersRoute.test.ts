import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../src/app';
import { config } from '../../src/config';
import type { AppServices } from '../../src/types';

function createServicesMock(getUserSnapshot: AppServices['leaderboardService']['getUserSnapshot']): AppServices {
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
      getUserSnapshot,
    },
    governanceService: {
      sampleOutcome: async () => ({}),
    },
    eventBus: {
      emit: async () => {},
    },
  };
}

function authCookieFor(userId: string, username = 'tester', email = 'tester@example.com'): string {
  const token = jwt.sign(
    {
      sub: userId,
      username,
      email,
    },
    config.JWT_SECRET,
    { expiresIn: '1h' },
  );

  return `${config.authCookieName}=${token}`;
}

describe('GET /api/auth/users/:userId', () => {
  it('returns full snapshot for current authenticated user', async () => {
    const getUserSnapshot = jest.fn(async (userId: string) => ({
      id: userId,
      username: 'alice',
      email: 'alice@example.com',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      balance: '5',
      influence: '2',
      power: '7',
    }));

    const app = createApp(createServicesMock(getUserSnapshot));

    const response = await request(app).get('/api/auth/users/user_self').set('Cookie', [authCookieFor('user_self')]);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: 'user_self',
      username: 'alice',
      email: 'alice@example.com',
      balance: '5',
      influence: '2',
      power: '7',
    });
    expect(getUserSnapshot).toHaveBeenCalledWith('user_self');
  });

  it('redacts email when requesting another user profile', async () => {
    const getUserSnapshot = jest.fn(async () => ({
      id: 'user_other',
      username: 'bob',
      email: 'bob@example.com',
      createdAt: new Date('2024-02-01T00:00:00.000Z'),
      balance: '3',
      influence: '1',
      power: '4',
    }));

    const app = createApp(createServicesMock(getUserSnapshot));

    const response = await request(app).get('/api/auth/users/user_other').set('Cookie', [authCookieFor('user_self')]);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: 'user_other',
      username: 'bob',
      email: '',
      balance: '3',
      influence: '1',
      power: '4',
    });
    expect(getUserSnapshot).toHaveBeenCalledWith('user_other');
  });
});