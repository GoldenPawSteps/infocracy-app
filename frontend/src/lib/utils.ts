import { AxiosError } from 'axios';

import type { LeaderboardEntry, Market, Outcome, Trade, User } from '@/lib/types';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function formatDecimal(value: number | string | undefined | null, digits = 4) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : (0).toFixed(digits);
}

export function formatBalance(value: number | string | undefined | null) {
  return `💰 ${formatDecimal(value, 4)}`;
}

export function formatInfluence(value: number | string | undefined | null) {
  return `🧭 ${formatDecimal(value, 4)}`;
}

export function formatPower(value: number | string | undefined | null) {
  return `⚡ ${formatDecimal(value, 4)}`;
}

export function formatPercent(value: number | string | undefined | null, digits = 1) {
  const numeric = Number(value ?? 0);
  return `${(numeric * 100).toFixed(digits)}%`;
}

export function formatDate(value: string | undefined) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (error instanceof AxiosError) {
    const message =
      (error.response?.data as { message?: string; error?: string } | undefined)?.message ||
      (error.response?.data as { message?: string; error?: string } | undefined)?.error ||
      error.message;

    return message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function computeProbabilities(outcomes: Outcome[], liquidityB: string | number) {
  const b = Math.max(Number(liquidityB) || 1, 0.0001);
  const values = outcomes.map((outcome) => Number(outcome.qValue || 0));
  const maxValue = Math.max(...values.map((value) => value / b), 0);
  const exps = values.map((value) => Math.exp(value / b - maxValue));
  const total = exps.reduce((sum, value) => sum + value, 0) || 1;

  return exps.map((value) => value / total);
}

export function computeLmsrCost(qValues: string[], deltaQ: string[], liquidityB: string | number) {
  const b = Math.max(Number(liquidityB) || 1, 0.0001);
  const current = qValues.map((value) => Number(value || 0));
  const delta = deltaQ.map((value) => Number(value || 0));

  const logSumExp = (values: number[]) => {
    const scaled = values.map((value) => value / b);
    const maxValue = Math.max(...scaled, 0);
    const sum = scaled.reduce((accumulator, value) => accumulator + Math.exp(value - maxValue), 0);
    return maxValue + Math.log(sum || 1);
  };

  const before = logSumExp(current);
  const after = logSumExp(current.map((value, index) => value + (delta[index] || 0)));
  return b * (after - before);
}

export function computeLmsrLegitimacy(qValues: string[], liquidityB: string | number) {
  const b = Math.max(Number(liquidityB) || 1, 0.0001);
  const scaled = qValues.map((value) => Number(value || 0) / b);
  const maxValue = Math.max(...scaled, 0);
  const sum = scaled.reduce((accumulator, value) => accumulator + Math.exp(value - maxValue), 0);
  return b * (maxValue + Math.log(sum || 1));
}

function toArray<T>(value: unknown, fallback: T[] = []) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function normalizeUser(raw: Record<string, unknown> | null | undefined): User | null {
  if (!raw) {
    return null;
  }

  return {
    id: String(raw.id ?? ''),
    username: String(raw.username ?? raw.name ?? 'anonymous'),
    email: String(raw.email ?? ''),
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
  };
}

export function normalizeOutcome(raw: Record<string, unknown>, index: number): Outcome {
  return {
    id: String(raw.id ?? raw.index ?? index),
    index: Number(raw.index ?? index),
    name: String(raw.name ?? `Outcome ${index + 1}`),
    qValue: String(raw.qValue ?? raw.q_value ?? raw.q ?? 0),
  };
}

export function normalizeTrade(raw: Record<string, unknown>): Trade {
  return {
    id: String(raw.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
    marketId: String(raw.marketId ?? raw.market_id ?? ''),
    takerId: String(raw.takerId ?? raw.taker_id ?? ''),
    deltaQ: toArray<string | number>(raw.deltaQ ?? raw.delta_q ?? [], []).map((value) => String(value ?? 0)),
    cost: String(raw.cost ?? 0),
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    takerUsername: raw.takerUsername ? String(raw.takerUsername) : raw.username ? String(raw.username) : undefined,
  };
}

export function normalizeMarket(raw: Record<string, unknown>): Market {
  const outcomes = toArray<Record<string, unknown>>(raw.outcomes ?? raw.marketOutcomes ?? [], []).map(normalizeOutcome);
  const liquidityB = String(raw.liquidityB ?? raw.b ?? raw.liquidity ?? 100);
  const maker =
    raw.maker && typeof raw.maker === 'object' ? (raw.maker as Record<string, unknown>) : undefined;
  const probabilities = toArray<number | string>(raw.probabilities, []).length
    ? toArray<number | string>(raw.probabilities, []).map((value) => Number(value ?? 0))
    : computeProbabilities(outcomes, liquidityB);

  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? 'Untitled market'),
    description: String(raw.description ?? ''),
    makerId: String(raw.makerId ?? raw.maker_id ?? maker?.id ?? ''),
    makerUsername: String(raw.makerUsername ?? raw.maker_username ?? maker?.username ?? 'Unknown'),
    nOutcomes: Number(raw.nOutcomes ?? raw.n_outcomes ?? outcomes.length),
    liquidityB,
    isUnmade: Boolean(raw.isUnmade ?? raw.is_unmade ?? raw.unmadeAt ?? raw.unmade_at),
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    unmadeAt: raw.unmadeAt ? String(raw.unmadeAt) : raw.unmade_at ? String(raw.unmade_at) : undefined,
    outcomes,
    probabilities,
    myPosition: toArray<string | number>(raw.myPosition ?? raw.my_position ?? raw.position ?? [], []).map((value) => String(value ?? 0)),
    trades: toArray<Record<string, unknown>>(raw.trades ?? raw.tradeHistory ?? [], []).map(normalizeTrade),
  };
}

export function normalizeLeaderboardEntry(raw: Record<string, unknown>, index: number): LeaderboardEntry {
  return {
    userId: String(raw.userId ?? raw.user_id ?? raw.id ?? ''),
    username: String(raw.username ?? 'anonymous'),
    balance: String(raw.balance ?? 0),
    influence: String(raw.influence ?? 0),
    power: String(raw.power ?? 0),
    rank: Number(raw.rank ?? index + 1),
  };
}

export function excerpt(text: string, limit = 140) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 1)}…`;
}
