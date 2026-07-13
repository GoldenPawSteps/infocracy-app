import Decimal from 'decimal.js';

Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

function ensurePositiveB(b: string): Decimal {
  const decimalB = new Decimal(b);
  if (decimalB.lte(0)) {
    throw new Error('Liquidity parameter b must be positive');
  }
  return decimalB;
}

function ensureVector(values: string[], name: string): Decimal[] {
  if (values.length === 0) {
    throw new Error(`${name} must contain at least one element`);
  }
  return values.map((value) => new Decimal(value));
}

function scaledExponentials(q: Decimal[], b: Decimal): { maxScaled: Decimal; exponentials: Decimal[]; denominator: Decimal } {
  const scaled = q.map((value) => value.div(b));
  const maxScaled = scaled.reduce((max, value) => (value.gt(max) ? value : max), scaled[0]);
  const exponentials = scaled.map((value) => value.minus(maxScaled).exp());
  const denominator = exponentials.reduce((sum, value) => sum.plus(value), new Decimal(0));
  return { maxScaled, exponentials, denominator };
}

export function cost(q: string[], b: string): Decimal {
  const quantities = ensureVector(q, 'q');
  const decimalB = ensurePositiveB(b);
  const { maxScaled, denominator } = scaledExponentials(quantities, decimalB);
  return decimalB.mul(maxScaled.plus(denominator.ln()));
}

export function probabilities(q: string[], b: string): Decimal[] {
  const quantities = ensureVector(q, 'q');
  const decimalB = ensurePositiveB(b);
  const { exponentials, denominator } = scaledExponentials(quantities, decimalB);
  return exponentials.map((value) => value.div(denominator));
}

export function tradeCost(q: string[], deltaQ: string[], b: string): Decimal {
  if (q.length !== deltaQ.length) {
    throw new Error('q and deltaQ must have the same length');
  }

  const updated = q.map((value, index) => new Decimal(value).plus(new Decimal(deltaQ[index])).toString());
  return cost(updated, b).minus(cost(q, b));
}

export function takerInfluence(probs: Decimal[], takerShares: string[]): Decimal {
  if (probs.length !== takerShares.length) {
    throw new Error('Probability and share vectors must have the same length');
  }

  return probs.reduce(
    (sum, probability, index) => sum.plus(probability.mul(new Decimal(takerShares[index]))),
    new Decimal(0),
  );
}

export function makerInfluence(marketCost: Decimal, takerInfluences: Decimal[]): Decimal {
  const totalTakerInfluence = takerInfluences.reduce((sum, value) => sum.plus(value), new Decimal(0));
  return marketCost.minus(totalTakerInfluence);
}
