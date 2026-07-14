import { createHash, randomBytes } from 'crypto';
import Decimal from 'decimal.js';
import { probabilities } from './marketMath';
import { ApiError, type GovernanceSampleInput } from '../types';

function deterministicUnitInterval(seed: string): number {
  const hash = createHash('sha256').update(seed).digest('hex');
  const slice = hash.slice(0, 13);
  const numerator = Number.parseInt(slice, 16);
  const denominator = 0x1fffffffffffff;
  return numerator / denominator;
}

export class GovernanceService {
  constructor(private readonly prisma: any) {}

  async sampleOutcome(input: GovernanceSampleInput): Promise<{
    marketId: string;
    outcome: number;
    probability: string;
    seed: string;
  }> {
    const market = await this.prisma.market.findUnique({ where: { id: input.marketId } });
    if (!market) {
      throw new ApiError(404, 'Market not found');
    }

    const outcomes = await this.prisma.outcome.findMany({ where: { marketId: market.id }, orderBy: { index: 'asc' } });
    const probs = probabilities(outcomes.map((outcome: any) => outcome.qValue), market.liquidityB);
    const seed = input.seed ?? randomBytes(16).toString('hex');
    const sample = deterministicUnitInterval(seed);

    let cumulative = new Decimal(0);
    let sampledIndex = probs.length - 1;

    for (const [index, probability] of probs.entries()) {
      cumulative = cumulative.plus(probability);
      if (new Decimal(sample).lte(cumulative)) {
        sampledIndex = index;
        break;
      }
    }

    await this.prisma.governanceLog.create({
      data: {
        marketId: market.id,
        sampledBy: input.sampledBy,
        outcome: sampledIndex,
        seed,
      },
    });

    return {
      marketId: market.id,
      outcome: sampledIndex,
      probability: probs[sampledIndex].toString(),
      seed,
    };
  }
}
