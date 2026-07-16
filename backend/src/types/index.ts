import type { RequestHandler } from 'express';

export type DecimalString = string;

export interface AuthTokenPayload {
  sub: string;
  username: string;
  email: string;
}

export interface SocketEventBus {
  emit: (event: string, payload: unknown) => Promise<void>;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  balance: string;
  influence: string;
  power: string;
  rank: number;
}

export interface UserSnapshot {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  balance: string;
  influence: string;
  power: string;
}

export interface CreateMarketInput {
  makerId: string;
  title: string;
  description: string;
  outcomes: string[];
  liquidityB: string;
  initialQ?: string[];
}

export interface TradeInput {
  marketId: string;
  takerId: string;
  deltaQ: string[];
}

export interface GovernanceSampleInput {
  marketId: string;
  sampledBy?: string;
  seed?: string;
}

export interface AppServices {
  marketService: {
    createMarket: (input: CreateMarketInput) => Promise<any>;
    listMarkets: (userId?: string) => Promise<any[]>;
    getMarketById: (marketId: string) => Promise<any>;
    trade: (input: TradeInput) => Promise<any>;
    unmake: (marketId: string, makerId: string) => Promise<any>;
  };
  leaderboardService: {
    getLeaderboard: (limit?: number) => Promise<LeaderboardEntry[]>;
    getUserSnapshot: (userId: string) => Promise<UserSnapshot>;
  };
  governanceService: {
    sampleOutcome: (input: GovernanceSampleInput) => Promise<any>;
  };
  eventBus: SocketEventBus;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export type ExpressHandler = RequestHandler;

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthTokenPayload;
    }
  }
}
