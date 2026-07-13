import Decimal from 'decimal.js';
import { cost, makerInfluence, probabilities, takerInfluence } from './marketMath';
import { ApiError, type LeaderboardEntry, type UserSnapshot } from '../types';

function decimal(value: string): Decimal {
  return new Decimal(value);
}

export class LeaderboardService {
  constructor(private readonly prisma: any) {}

  private async calculateInfluenceMap(): Promise<Map<string, Decimal>> {
    const influenceMap = new Map<string, Decimal>();
    const markets = await this.prisma.market.findMany({ where: { isUnmade: false }, orderBy: { createdAt: 'desc' } });

    for (const market of markets) {
      const [outcomes, positions] = await Promise.all([
        this.prisma.outcome.findMany({ where: { marketId: market.id }, orderBy: { index: 'asc' } }),
        this.prisma.position.findMany({ where: { marketId: market.id } }),
      ]);

      const q = outcomes.map((outcome: any) => outcome.qValue);
      const probs = probabilities(q, market.liquidityB);
      const takerInfluences: Decimal[] = [];

      for (const position of positions) {
        const shares = (position.shares as string[]) ?? [];
        const influence = takerInfluence(probs, shares.map(String));
        takerInfluences.push(influence);
        influenceMap.set(position.userId, (influenceMap.get(position.userId) ?? new Decimal(0)).plus(influence));
      }

      const marketCost = cost(q, market.liquidityB);
      const maker = makerInfluence(marketCost, takerInfluences);
      influenceMap.set(market.makerId, (influenceMap.get(market.makerId) ?? new Decimal(0)).plus(maker));
    }

    return influenceMap;
  }

  async getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    const [users, balances, influenceMap] = await Promise.all([
      this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.balance.findMany(),
      this.calculateInfluenceMap(),
    ]);

    const balanceMap = new Map<string, Decimal>(balances.map((entry: any) => [entry.userId, decimal(entry.balance)]));

    return users
      .map((user: any) => {
        const balance = balanceMap.get(user.id) ?? new Decimal(0);
        const influence = influenceMap.get(user.id) ?? new Decimal(0);
        return {
          userId: user.id,
          username: user.username,
          balance: balance.toString(),
          influence: influence.toString(),
          power: balance.plus(influence).toString(),
        };
      })
      .sort((left: LeaderboardEntry, right: LeaderboardEntry) => decimal(right.power).comparedTo(decimal(left.power)))
      .slice(0, limit);
  }

  async getUserSnapshot(userId: string): Promise<UserSnapshot> {
    const [user, balance, leaderboard] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.balance.findUnique({ where: { userId } }),
      this.getLeaderboard(Number.MAX_SAFE_INTEGER),
    ]);

    if (!user || !balance) {
      throw new ApiError(404, 'User not found');
    }

    const entry = leaderboard.find((candidate) => candidate.userId === userId);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      balance: balance.balance,
      influence: entry?.influence ?? '0',
      power: entry?.power ?? balance.balance,
    };
  }
}
