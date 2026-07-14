import { LeaderboardService } from '../../src/services/leaderboardService';
import Decimal from 'decimal.js';
import { cost } from '../../src/services/marketMath';
import { MarketService } from '../../src/services/marketService';

class InMemoryPrisma {
  public users: any[] = [];
  public balances: any[] = [];
  public markets: any[] = [];
  public outcomes: any[] = [];
  public trades: any[] = [];
  public positions: any[] = [];
  public governanceLogs: any[] = [];
  private sequence = 0;
  private lock = Promise.resolve();

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${this.sequence}`;
  }

  async $transaction<T>(fn: (tx: InMemoryPrisma) => Promise<T>): Promise<T> {
    const previous = this.lock;
    let release!: () => void;
    this.lock = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await fn(this);
    } finally {
      release();
    }
  }

  user = {
    findUnique: undefined,
  } as any;

  balance = {
    findUnique: undefined,
  } as any;

  market = {
    findUnique: undefined,
  } as any;

  outcome = {
    findMany: undefined,
  } as any;

  position = {
    findMany: undefined,
    findUnique: undefined,
  } as any;

  trade = {
    create: undefined,
    findMany: undefined,
  } as any;

  governanceLog = {
    create: undefined,
  } as any;

  initialize(): void {
    this.user.findUnique = async ({ where }: any) => this.users.find((user) => user.id === where.id) ?? null;
    this.user.findMany = async () => [...this.users];
    this.user.create = async ({ data }: any) => {
      const user = { id: this.nextId('user'), createdAt: new Date(), ...data };
      this.users.push(user);
      if (data.balance?.create) {
        this.balances.push({ userId: user.id, updatedAt: new Date(), ...data.balance.create });
      }
      return user;
    };
    this.user.findFirst = async ({ where }: any) =>
      this.users.find((user) => where.OR.some((condition: any) => Object.entries(condition).every(([key, value]) => user[key] === value))) ?? null;

    this.balance.findUnique = async ({ where }: any) => this.balances.find((entry) => entry.userId === where.userId) ?? null;
    this.balance.findMany = async () => [...this.balances];
    this.balance.update = async ({ where, data }: any) => {
      const balance = this.balances.find((entry) => entry.userId === where.userId);
      if (!balance) throw new Error('balance not found');
      Object.assign(balance, data, { updatedAt: new Date() });
      return balance;
    };

    this.market.create = async ({ data }: any) => {
      const market = { id: this.nextId('market'), createdAt: new Date(), isUnmade: false, unmadeAt: null, ...data };
      this.markets.push(market);
      return market;
    };
    this.market.findMany = async ({ where }: any = {}) =>
      [...this.markets]
        .filter((market) => (where?.isUnmade === undefined ? true : market.isUnmade === where.isUnmade))
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    this.market.findUnique = async ({ where }: any) => this.markets.find((market) => market.id === where.id) ?? null;
    this.market.update = async ({ where, data }: any) => {
      const market = this.markets.find((entry) => entry.id === where.id);
      if (!market) throw new Error('market not found');
      Object.assign(market, data);
      return market;
    };

    this.outcome.createMany = async ({ data }: any) => {
      for (const entry of data) {
        this.outcomes.push({ id: this.nextId('outcome'), ...entry });
      }
      return { count: data.length };
    };
    this.outcome.findMany = async ({ where }: any) =>
      [...this.outcomes]
        .filter((outcome) => {
          if (typeof where.marketId === 'string') {
            return outcome.marketId === where.marketId;
          }

          if (Array.isArray(where.marketId?.in)) {
            return where.marketId.in.includes(outcome.marketId);
          }

          return true;
        })
        .sort((left, right) => left.index - right.index);
    this.outcome.update = async ({ where, data }: any) => {
      const outcome = this.outcomes.find((entry) => entry.id === where.id);
      if (!outcome) throw new Error('outcome not found');
      Object.assign(outcome, data);
      return outcome;
    };

    this.position.create = async ({ data }: any) => {
      const position = { ...data };
      this.positions.push(position);
      return position;
    };
    this.position.findMany = async ({ where }: any) => [...this.positions].filter((position) => position.marketId === where.marketId);
    this.position.findUnique = async ({ where }: any) =>
      this.positions.find((position) => position.userId === where.userId_marketId.userId && position.marketId === where.userId_marketId.marketId) ?? null;
    this.position.upsert = async ({ where, update, create }: any) => {
      const existing = await this.position.findUnique({ where });
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      this.positions.push({ ...create });
      return create;
    };

    this.trade.create = async ({ data }: any) => {
      const trade = { id: this.nextId('trade'), createdAt: new Date(), ...data };
      this.trades.push(trade);
      return trade;
    };
    this.trade.findMany = async ({ where, orderBy }: any) => {
      const filtered = [...this.trades].filter((trade) => trade.marketId === where.marketId);
      if (orderBy?.createdAt === 'desc') {
        return filtered.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
      }
      return filtered.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    };

    this.governanceLog.create = async ({ data }: any) => {
      const record = { id: this.nextId('gov'), createdAt: new Date(), ...data };
      this.governanceLogs.push(record);
      return record;
    };
  }
}

describe('trade integration', () => {
  let prisma: InMemoryPrisma;
  let marketService: MarketService;
  let leaderboardService: LeaderboardService;

  beforeEach(async () => {
    prisma = new InMemoryPrisma();
    prisma.initialize();

    await prisma.user.create({ data: { username: 'maker', email: 'maker@example.com', passwordHash: 'hash', balance: { create: { balance: '5.0' } } } });
    await prisma.user.create({ data: { username: 'alice', email: 'alice@example.com', passwordHash: 'hash', balance: { create: { balance: '5.0' } } } });
    await prisma.user.create({ data: { username: 'bob', email: 'bob@example.com', passwordHash: 'hash', balance: { create: { balance: '5.0' } } } });

    marketService = new MarketService(prisma as any);
    leaderboardService = new LeaderboardService(prisma as any);
  });

  it('creates a market, executes a trade, and updates balances', async () => {
    const maker = prisma.users[0];
    const alice = prisma.users[1];

    const market = await marketService.createMarket({
      makerId: maker.id,
      title: 'Adopt proposal X',
      description: 'Test market',
      outcomes: ['Yes', 'No'],
      liquidityB: '1',
    });

    const trade = await marketService.trade({
      marketId: market.id,
      takerId: alice.id,
      deltaQ: ['1', '0'],
    });

    expect(market.makerUsername).toBe('maker');

    expect(Number(trade.cost)).toBeGreaterThan(0);
    expect(Number(trade.balanceAfter)).toBeLessThan(5);
    const aliceBalance = await prisma.balance.findUnique({ where: { userId: alice.id } });
    expect(aliceBalance.balance).toBe(trade.balanceAfter);

    const listedMarkets = await marketService.listMarkets();
    expect(listedMarkets[0].makerUsername).toBe('maker');

    const marketDetail = await marketService.getMarketById(market.id);
    expect(marketDetail.makerUsername).toBe('maker');

    const leaderboard = await leaderboardService.getLeaderboard();
    expect(leaderboard).toHaveLength(3);
  });

  it('assigns the same rank to contributors tied on power', async () => {
    const leaderboard = await leaderboardService.getLeaderboard();

    expect(leaderboard).toHaveLength(3);
    expect(leaderboard.map((entry) => ({ username: entry.username, rank: entry.rank, power: entry.power }))).toEqual([
      { username: 'alice', rank: 1, power: '5' },
      { username: 'bob', rank: 1, power: '5' },
      { username: 'maker', rank: 1, power: '5' },
    ]);
  });

  it('serializes concurrent trades without corrupting market state', async () => {
    const maker = prisma.users[0];
    const alice = prisma.users[1];
    const bob = prisma.users[2];

    const market = await marketService.createMarket({
      makerId: maker.id,
      title: 'Launch treasury program',
      description: 'Concurrency market',
      outcomes: ['Yes', 'No'],
      liquidityB: '1',
    });

    const [aliceTrade, bobTrade] = await Promise.all([
      marketService.trade({ marketId: market.id, takerId: alice.id, deltaQ: ['1', '0'] }),
      marketService.trade({ marketId: market.id, takerId: bob.id, deltaQ: ['0', '1'] }),
    ]);

    expect(Number(aliceTrade.cost)).toBeGreaterThan(0);
    expect(Number(bobTrade.cost)).toBeGreaterThan(0);

    const outcomes = await prisma.outcome.findMany({ where: { marketId: market.id } });
    expect(outcomes[0].qValue).toBe('1');
    expect(outcomes[1].qValue).toBe('1');

    const alicePosition = await prisma.position.findUnique({ where: { userId_marketId: { userId: alice.id, marketId: market.id } } });
    const bobPosition = await prisma.position.findUnique({ where: { userId_marketId: { userId: bob.id, marketId: market.id } } });
    expect(alicePosition.shares).toEqual(['1', '0']);
    expect(bobPosition.shares).toEqual(['0', '1']);
  });

  it('supports optional initial q and charges C(q) to maker', async () => {
    const maker = prisma.users[0];
    const makerBalanceBefore = await prisma.balance.findUnique({ where: { userId: maker.id } });
    const makerBalanceBeforeValue = makerBalanceBefore.balance;

    const market = await marketService.createMarket({
      makerId: maker.id,
      title: 'Bias initial probability toward yes',
      description: 'Seeded market',
      outcomes: ['Yes', 'No'],
      liquidityB: '1',
      initialQ: ['1', '0'],
    });

    expect(market.outcomes.map((outcome: any) => outcome.qValue)).toEqual(['1', '0']);
    expect(Number(market.probabilities[0])).toBeGreaterThan(Number(market.probabilities[1]));

    const makerPosition = await prisma.position.findUnique({ where: { userId_marketId: { userId: maker.id, marketId: market.id } } });
    expect(makerPosition.shares).toEqual(['1', '0']);

    const makerBalanceAfter = await prisma.balance.findUnique({ where: { userId: maker.id } });
    const expectedCost = cost(['1', '0'], '1').toString();
    const expectedMakerInitialTradeCost = new Decimal(expectedCost).minus(new Decimal('1').times(new Decimal(2).ln())).toString();
    expect(market.initialCost).toBe(expectedCost);
    expect(makerBalanceAfter.balance).toBe(new Decimal(makerBalanceBeforeValue).minus(expectedCost).toString());

    const marketDetail = await marketService.getMarketById(market.id);
    expect(marketDetail.trades).toHaveLength(1);
    expect(marketDetail.trades[0].takerId).toBe(maker.id);
    expect(marketDetail.trades[0].takerUsername).toBe('maker');
    expect(marketDetail.trades[0].deltaQ).toEqual(['1', '0']);
    expect(marketDetail.trades[0].cost).toBe(expectedMakerInitialTradeCost);
  });

  it('preserves trade history in market detail after market is unmade', async () => {
    const maker = prisma.users[0];
    const alice = prisma.users[1];

    const market = await marketService.createMarket({
      makerId: maker.id,
      title: 'Archive still keeps history',
      description: 'Trades should remain visible after unmake',
      outcomes: ['Yes', 'No'],
      liquidityB: '1',
    });

    await marketService.trade({
      marketId: market.id,
      takerId: alice.id,
      deltaQ: ['1', '0'],
    });

    await marketService.unmake(market.id, maker.id);

    const marketDetail = await marketService.getMarketById(market.id);

    expect(marketDetail.isUnmade).toBe(true);
    expect(marketDetail.trades).toHaveLength(1);
    expect(marketDetail.trades[0].takerUsername).toBe('alice');
    expect(marketDetail.trades[0].deltaQ).toEqual(['1', '0']);
  });
});
