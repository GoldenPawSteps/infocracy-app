import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { ApiError, type CreateMarketInput, type TradeInput } from '../types';
import { cost, makerInfluence, probabilities, takerInfluence, tradeCost } from './marketMath';

const MAX_TRANSACTION_RETRIES = 3;

function decimal(value: string): Decimal {
  return new Decimal(value);
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => String(entry));
}

export class MarketService {
  constructor(private readonly prisma: any) {}

  private async runSerializableTransaction<T>(operation: (tx: any) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!retryable || attempt === MAX_TRANSACTION_RETRIES - 1) {
          throw error;
        }
      }
    }

    throw new Error('Transaction failed after retries');
  }

  private async getMarketContext(tx: any, marketId: string): Promise<{
    market: any;
    outcomes: any[];
    positions: any[];
  }> {
    const market = await tx.market.findUnique({ where: { id: marketId } });
    if (!market) {
      throw new ApiError(404, 'Market not found');
    }

    const [outcomes, positions] = await Promise.all([
      tx.outcome.findMany({ where: { marketId }, orderBy: { index: 'asc' } }),
      tx.position.findMany({ where: { marketId } }),
    ]);

    return { market, outcomes, positions };
  }

  async createMarket(input: CreateMarketInput): Promise<any> {
    return this.runSerializableTransaction(async (tx) => {
      const [user, balanceRecord] = await Promise.all([
        tx.user.findUnique({ where: { id: input.makerId } }),
        tx.balance.findUnique({ where: { userId: input.makerId } }),
      ]);

      if (!user || !balanceRecord) {
        throw new ApiError(404, 'Maker not found');
      }

      const zeroVector = Array.from({ length: input.outcomes.length }, () => '0');
      const initialQ = input.initialQ ?? zeroVector;
      if (initialQ.length !== input.outcomes.length) {
        throw new ApiError(400, 'initialQ length must match number of outcomes');
      }
      if (initialQ.some((value) => decimal(value).lt(0))) {
        throw new ApiError(400, 'initialQ values must be greater than or equal to zero');
      }

      const initialCost = cost(initialQ, input.liquidityB);
      const balance = decimal(balanceRecord.balance);

      if (balance.lt(initialCost)) {
        throw new ApiError(400, 'Insufficient balance to create market');
      }

      const market = await tx.market.create({
        data: {
          makerId: input.makerId,
          title: input.title,
          description: input.description,
          nOutcomes: input.outcomes.length,
          liquidityB: input.liquidityB,
        },
      });

      await tx.outcome.createMany({
        data: input.outcomes.map((name, index) => ({
          marketId: market.id,
          index,
          name,
          qValue: initialQ[index],
        })),
      });

      await tx.position.create({
        data: {
          userId: input.makerId,
          marketId: market.id,
          shares: initialQ,
        },
      });

      await tx.balance.update({
        where: { userId: input.makerId },
        data: { balance: balance.minus(initialCost).toString() },
      });

      const hasSeedTrade = initialQ.some((value) => decimal(value).gt(0));
      if (hasSeedTrade) {
        const infrastructureCost = decimal(input.liquidityB).times(new Decimal(input.outcomes.length).ln());
        const makerInitialTradeCost = initialCost.minus(infrastructureCost);
        await tx.trade.create({
          data: {
            marketId: market.id,
            takerId: input.makerId,
            deltaQ: initialQ,
            cost: makerInitialTradeCost.toString(),
          },
        });
      }

      return {
        id: market.id,
        makerId: market.makerId,
        makerUsername: user.username,
        title: market.title,
        description: market.description,
        liquidityB: market.liquidityB,
        nOutcomes: market.nOutcomes,
        initialCost: initialCost.toString(),
        probabilities: probabilities(initialQ, input.liquidityB).map((value) => value.toString()),
        outcomes: input.outcomes.map((name, index) => ({ index, name, qValue: initialQ[index] })),
        createdAt: market.createdAt,
      };
    });
  }

  async listMarkets(): Promise<any[]> {
    const markets = await this.prisma.market.findMany({ orderBy: { createdAt: 'desc' } });
    if (markets.length === 0) {
      return [];
    }

    const marketIds = markets.map((market: any) => market.id);
    const makerIds = [...new Set(markets.map((market: any) => market.makerId))];
    const allOutcomes = await this.prisma.outcome.findMany({
      where: { marketId: { in: marketIds } },
      orderBy: { index: 'asc' },
    });
    const makers = await this.prisma.user.findMany();
    const makerMap = new Map<string, string>(
      makers
        .filter((user: any) => makerIds.includes(user.id))
        .map((user: any) => [user.id, user.username]),
    );

    const outcomesByMarket = new Map<string, any[]>();
    for (const outcome of allOutcomes) {
      const list = outcomesByMarket.get(outcome.marketId) ?? [];
      list.push(outcome);
      outcomesByMarket.set(outcome.marketId, list);
    }

    return markets.map((market: any) => {
      const outcomes = outcomesByMarket.get(market.id) ?? [];
      const probs = probabilities(outcomes.map((outcome: any) => outcome.qValue), market.liquidityB);
      return {
        id: market.id,
        makerId: market.makerId,
        makerUsername: makerMap.get(market.makerId) ?? 'Unknown',
        title: market.title,
        description: market.description,
        liquidityB: market.liquidityB,
        nOutcomes: market.nOutcomes,
        isUnmade: market.isUnmade,
        unmadeAt: market.unmadeAt,
        probabilities: probs.map((value) => value.toString()),
        outcomes: outcomes.map((outcome: any, index: number) => ({
          id: outcome.id,
          index,
          name: outcome.name,
          qValue: outcome.qValue,
          probability: probs[index].toString(),
        })),
        createdAt: market.createdAt,
      };
    });
  }

  async getMarketById(marketId: string): Promise<any> {
    const { market, outcomes, positions } = await this.getMarketContext(this.prisma, marketId);
    const trades = await this.prisma.trade.findMany({
      where: { marketId },
      orderBy: { createdAt: 'desc' },
    });
    const maker = await this.prisma.user.findUnique({ where: { id: market.makerId } });
    const traderIds = [...new Set(trades.map((trade: any) => trade.takerId))];
    const traders = traderIds.length ? await this.prisma.user.findMany() : [];
    const traderMap = new Map<string, string>(
      traders
        .filter((user: any) => traderIds.includes(user.id))
        .map((user: any) => [user.id, user.username]),
    );
    const probs = probabilities(outcomes.map((outcome: any) => outcome.qValue), market.liquidityB);

    return {
      id: market.id,
      makerId: market.makerId,
      makerUsername: maker?.username ?? 'Unknown',
      title: market.title,
      description: market.description,
      liquidityB: market.liquidityB,
      nOutcomes: market.nOutcomes,
      isUnmade: market.isUnmade,
      createdAt: market.createdAt,
      unmadeAt: market.unmadeAt,
      probabilities: probs.map((value) => value.toString()),
      outcomes: outcomes.map((outcome: any, index: number) => ({
        id: outcome.id,
        index: outcome.index,
        name: outcome.name,
        qValue: outcome.qValue,
        probability: probs[index].toString(),
      })),
      positions: positions.map((position: any) => ({
        userId: position.userId,
        shares: parseStringArray(position.shares),
      })),
      trades: trades.map((trade: any) => ({
        id: trade.id,
        marketId: trade.marketId,
        takerId: trade.takerId,
        takerUsername: traderMap.get(trade.takerId) ?? 'Unknown',
        deltaQ: parseStringArray(trade.deltaQ),
        cost: trade.cost,
        createdAt: trade.createdAt,
      })),
    };
  }

  async trade(input: TradeInput): Promise<any> {
    return this.runSerializableTransaction(async (tx) => {
      const { market, outcomes } = await this.getMarketContext(tx, input.marketId);
      if (market.isUnmade) {
        throw new ApiError(400, 'Market has already been settled');
      }
      if (market.makerId === input.takerId) {
        throw new ApiError(400, 'Market maker cannot trade in their own market');
      }
      if (input.deltaQ.length !== market.nOutcomes) {
        throw new ApiError(400, 'Trade vector length must match number of outcomes');
      }

      const [balanceRecord, existingPosition] = await Promise.all([
        tx.balance.findUnique({ where: { userId: input.takerId } }),
        tx.position.findUnique({ where: { userId_marketId: { userId: input.takerId, marketId: input.marketId } } }),
      ]);

      if (!balanceRecord) {
        throw new ApiError(404, 'Trader balance not found');
      }

      const q = outcomes.map((outcome: any) => outcome.qValue);
      const currentShares = existingPosition ? parseStringArray(existingPosition.shares) : Array.from({ length: market.nOutcomes }, () => '0');
      const updatedShares = currentShares.map((value, index) => decimal(value).plus(decimal(input.deltaQ[index])));

      if (updatedShares.some((value) => value.lt(0))) {
        throw new ApiError(400, 'Cannot sell more shares than owned');
      }

      const deltaCost = tradeCost(q, input.deltaQ, market.liquidityB);
      const currentBalance = decimal(balanceRecord.balance);
      if (deltaCost.gt(0) && currentBalance.lt(deltaCost)) {
        throw new ApiError(400, 'Insufficient balance for trade');
      }

      for (const [index, outcome] of outcomes.entries()) {
        await tx.outcome.update({
          where: { id: outcome.id },
          data: {
            qValue: decimal(outcome.qValue).plus(decimal(input.deltaQ[index])).toString(),
          },
        });
      }

      await tx.balance.update({
        where: { userId: input.takerId },
        data: { balance: currentBalance.minus(deltaCost).toString() },
      });

      await tx.position.upsert({
        where: { userId_marketId: { userId: input.takerId, marketId: input.marketId } },
        update: { shares: updatedShares.map((value) => value.toString()) },
        create: {
          userId: input.takerId,
          marketId: input.marketId,
          shares: updatedShares.map((value) => value.toString()),
        },
      });

      const trade = await tx.trade.create({
        data: {
          marketId: input.marketId,
          takerId: input.takerId,
          deltaQ: input.deltaQ,
          cost: deltaCost.toString(),
        },
      });

      const updatedOutcomes = await tx.outcome.findMany({ where: { marketId: input.marketId }, orderBy: { index: 'asc' } });
      const probs = probabilities(updatedOutcomes.map((outcome: any) => outcome.qValue), market.liquidityB);

      return {
        id: trade.id,
        marketId: input.marketId,
        takerId: input.takerId,
        deltaQ: input.deltaQ,
        cost: deltaCost.toString(),
        balanceAfter: currentBalance.minus(deltaCost).toString(),
        positionAfter: updatedShares.map((value) => value.toString()),
        probabilities: probs.map((value) => value.toString()),
        createdAt: trade.createdAt,
      };
    });
  }

  async unmake(marketId: string, makerId: string): Promise<any> {
    return this.runSerializableTransaction(async (tx) => {
      const { market, outcomes, positions } = await this.getMarketContext(tx, marketId);
      if (market.isUnmade) {
        throw new ApiError(400, 'Market has already been settled');
      }
      if (market.makerId !== makerId) {
        throw new ApiError(403, 'Only the market maker can settle this market');
      }

      const q = outcomes.map((outcome: any) => outcome.qValue);
      const probs = probabilities(q, market.liquidityB);
      const settlements: Array<{ userId: string; payout: string }> = [];
      const takerInfluences: Decimal[] = [];

      for (const position of positions) {
        if (position.userId === makerId) {
          continue;
        }
        const influence = takerInfluence(probs, parseStringArray(position.shares));
        takerInfluences.push(influence);
        settlements.push({ userId: position.userId, payout: influence.toString() });
      }

      const makerPayout = makerInfluence(cost(q, market.liquidityB), takerInfluences);
      const balances = await tx.balance.findMany();
      const balanceMap = new Map<string, Decimal>(balances.map((entry: any) => [entry.userId, decimal(entry.balance)]));

      for (const settlement of settlements) {
        const updated = (balanceMap.get(settlement.userId) ?? new Decimal(0)).plus(decimal(settlement.payout));
        await tx.balance.update({ where: { userId: settlement.userId }, data: { balance: updated.toString() } });
      }

      const makerBalance = (balanceMap.get(makerId) ?? new Decimal(0)).plus(makerPayout);
      await tx.balance.update({ where: { userId: makerId }, data: { balance: makerBalance.toString() } });
      settlements.push({ userId: makerId, payout: makerPayout.toString() });

      await tx.market.update({
        where: { id: marketId },
        data: {
          isUnmade: true,
          unmadeAt: new Date(),
        },
      });

      return {
        marketId,
        makerId,
        probabilities: probs.map((value) => value.toString()),
        settlements,
      };
    });
  }
}
