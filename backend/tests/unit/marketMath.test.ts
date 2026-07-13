import Decimal from 'decimal.js';
import { cost, makerInfluence, probabilities, takerInfluence, tradeCost } from '../../src/services/marketMath';

describe('marketMath', () => {
  it('computes LMSR cost for a zero vector', () => {
    const result = cost(['0', '0'], '1');
    expect(result.toNumber()).toBeCloseTo(Math.log(2), 10);
  });

  it('computes stable probabilities that sum to one', () => {
    const probs = probabilities(['1.5', '-0.5', '0.25'], '0.75');
    const sum = probs.reduce((total, value) => total.plus(value), new Decimal(0));

    expect(sum.toNumber()).toBeCloseTo(1, 12);
    expect(probs[0].gt(probs[2])).toBe(true);
    expect(probs[2].gt(probs[1])).toBe(true);
  });

  it('computes trade cost as a cost delta', () => {
    const result = tradeCost(['0', '0'], ['1', '0'], '1');
    const expected = Math.log(Math.E + 1) - Math.log(2);
    expect(result.toNumber()).toBeCloseTo(expected, 10);
  });

  it('allows negative trade cost when selling shares', () => {
    const result = tradeCost(['2', '0'], ['-1', '0'], '1');
    expect(result.lt(0)).toBe(true);
  });

  it('computes taker and maker influence consistently', () => {
    const probs = [new Decimal('0.25'), new Decimal('0.75')];
    const alice = takerInfluence(probs, ['2', '1']);
    const bob = takerInfluence(probs, ['1', '0']);
    const market = new Decimal('4');
    const maker = makerInfluence(market, [alice, bob]);

    expect(alice.toString()).toBe('1.25');
    expect(bob.toString()).toBe('0.25');
    expect(maker.toString()).toBe('2.5');
  });

  it('keeps probabilities symmetric for symmetric states', () => {
    const probs = probabilities(['3', '3', '3'], '0.2');
    for (const probability of probs) {
      expect(probability.toNumber()).toBeCloseTo(1 / 3, 12);
    }
  });
});
