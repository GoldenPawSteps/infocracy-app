export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface Balance {
  balance: string;
}

export interface Outcome {
  id: string;
  index: number;
  name: string;
  qValue: string;
}

export interface MarketPosition {
  userId: string;
  shares: string[];
}

export interface Trade {
  id: string;
  marketId: string;
  takerId: string;
  deltaQ: string[];
  cost: string;
  createdAt: string;
  takerUsername?: string;
}

export interface MarketAction {
  id: string;
  type: 'make' | 'take' | 'unmake';
  agentId: string;
  agentUsername: string;
  createdAt: string;
  shares: string[];
  legitimacy: string;
  probabilities: number[];
  balanceChange: string;
  influenceChange: string;
  powerChange: string;
}

export interface Market {
  id: string;
  title: string;
  description: string;
  makerId: string;
  makerUsername: string;
  nOutcomes: number;
  liquidityB: string;
  isUnmade: boolean;
  createdAt: string;
  unmadeAt?: string;
  outcomes: Outcome[];
  probabilities: number[];
  positions?: MarketPosition[];
  myPosition?: string[];
  actions?: MarketAction[];
  trades?: Trade[];
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  balance: string;
  influence: string;
  power: string;
  rank: number;
}

export interface CreateMarketDto {
  title: string;
  description: string;
  outcomes: string[];
  liquidityB: string;
  initialQ?: string[];
}
