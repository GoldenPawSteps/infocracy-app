'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import { ActionPreview } from '@/components/markets/ActionPreview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LineChart } from '@/components/ui/LineChart';
import { useAuth } from '@/hooks/useAuth';
import { useMarkets } from '@/hooks/useMarkets';
import api from '@/lib/api';
import type { MarketAction, Outcome } from '@/lib/types';
import type { Market } from '@/lib/types';
import { computeLmsrLegitimacy, formatBalance, formatDate, formatDecimal, formatInfluence, formatPower, getApiErrorMessage, normalizeMarket } from '@/lib/utils';
import { useLeaderboardStore } from '@/store/leaderboardStore';

interface ProfileActionEntry {
  id: string;
  marketId: string;
  marketTitle: string;
  marketMakerId: string;
  outcomes: Outcome[];
  action: MarketAction;
}

interface ProfileSnapshot {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  balance: string;
  influence: string;
  power: string;
}

type MarketSortOption = 'legitimacy' | 'entropy' | 'newest' | 'oldest' | 'liquidity' | 'title';
type ChartRangeOption = '7d' | '30d' | 'all';

const POSITION_PAGE_SIZE = 10;

function computeEntropy(probabilities: number[]) {
  return probabilities.reduce((sum, probability) => {
    if (!Number.isFinite(probability) || probability <= 0) {
      return sum;
    }

    return sum - probability * Math.log(probability);
  }, 0);
}

function sortMarkets(markets: Market[], sortBy: MarketSortOption) {
  const sorted = [...markets];

  sorted.sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }

    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    if (sortBy === 'liquidity') {
      return Number(b.liquidityB) - Number(a.liquidityB);
    }

    if (sortBy === 'entropy') {
      return computeEntropy(b.probabilities) - computeEntropy(a.probabilities);
    }

    const legitimacyA = computeLmsrLegitimacy(
      a.outcomes.map((outcome) => outcome.qValue),
      a.liquidityB,
    );
    const legitimacyB = computeLmsrLegitimacy(
      b.outcomes.map((outcome) => outcome.qValue),
      b.liquidityB,
    );
    return legitimacyB - legitimacyA;
  });

  return sorted;
}

const PROFILE_ACTION_PAGE_SIZE = 10;
const extractMarket = (payload: Record<string, unknown> | unknown): Record<string, unknown> => {
  const source = (payload as Record<string, unknown>)?.data ?? (payload as Record<string, unknown>)?.market ?? payload;
  return (source as Record<string, unknown>) ?? {};
};

function getChartCutoff(range: ChartRangeOption) {
  if (range === 'all') {
    return null;
  }

  const days = range === '7d' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export default function ProfilePage() {
  const { user, balance, influence, power } = useAuth();
  const { markets, fetchMarkets } = useMarkets();
  const searchParams = useSearchParams();
  const profileUserId = searchParams.get('user') ?? user?.id;
  const entries = useLeaderboardStore((state) => state.entries);
  const fetchLeaderboard = useLeaderboardStore((state) => state.fetchLeaderboard);
  const [isActionHistoryLoading, setIsActionHistoryLoading] = useState(false);
  const [profileActions, setProfileActions] = useState<ProfileActionEntry[]>([]);
  const [detailedMarkets, setDetailedMarkets] = useState<Market[]>([]);
  const [detailedPositionMarkets, setDetailedPositionMarkets] = useState<Market[]>([]);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileSnapshot | null>(null);
  const [selectedActionAgents, setSelectedActionAgents] = useState<Record<string, string>>({});
  const [selectedPositionAgents, setSelectedPositionAgents] = useState<Record<string, string>>({});
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [positionStatusFilter, setPositionStatusFilter] = useState<'all' | 'active' | 'unmade'>('all');
  const [positionRoleFilter, setPositionRoleFilter] = useState<'all' | 'maker' | 'taker'>('all');
  const [positionSort, setPositionSort] = useState<MarketSortOption>('legitimacy');
  const [visibleProfileActionCount, setVisibleProfileActionCount] = useState<number>(PROFILE_ACTION_PAGE_SIZE);
  const [visiblePositionCount, setVisiblePositionCount] = useState<number>(POSITION_PAGE_SIZE);
  const [actionSearch, setActionSearch] = useState<string>('');
  const [positionSearch, setPositionSearch] = useState<string>('');
  const [agentChartRange, setAgentChartRange] = useState<ChartRangeOption>('30d');

  const isCurrentUserProfile = profileUserId === user?.id;
  const defaultCurrentUserSnapshot = useMemo<ProfileSnapshot | null>(() => {
    if (!user?.id) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      balance: balance ?? '0',
      influence: influence ?? '0',
      power: power ?? '0',
    };
  }, [user?.id, user?.username, user?.email, user?.createdAt, balance, influence, power]);

  const profileUser = useMemo(() => {
    if (profileSnapshot) {
      return profileSnapshot;
    }

    if (isCurrentUserProfile) {
      return defaultCurrentUserSnapshot;
    }

    const leaderboardEntry = entries.find((entry) => entry.userId === profileUserId);
    if (!leaderboardEntry) {
      return null;
    }

    return {
      id: leaderboardEntry.userId,
      username: leaderboardEntry.username,
      email: '',
      createdAt: '',
      balance: leaderboardEntry.balance,
      influence: leaderboardEntry.influence,
      power: leaderboardEntry.power,
    };
  }, [profileSnapshot, isCurrentUserProfile, defaultCurrentUserSnapshot, entries, profileUserId]);

  useEffect(() => {
    let isCancelled = false;

    const loadProfileSnapshot = async () => {
      if (!profileUserId) {
        if (!isCancelled) {
          setProfileSnapshot(null);
        }
        return;
      }

      if (isCurrentUserProfile && defaultCurrentUserSnapshot) {
        if (!isCancelled) {
          setProfileSnapshot(defaultCurrentUserSnapshot);
        }
        return;
      }

      try {
        const response = await api.get(`/auth/users/${profileUserId}`);
        const payload = (response.data as Record<string, unknown>)?.data ?? response.data;
        const source = ((payload as Record<string, unknown>)?.user ?? payload) as Record<string, unknown>;

        if (!isCancelled) {
          setProfileSnapshot({
            id: String(source.id ?? profileUserId),
            username: String(source.username ?? 'Infocracy Member'),
            email: String(source.email ?? ''),
            createdAt: String(source.createdAt ?? source.created_at ?? ''),
            balance: String(source.balance ?? 0),
            influence: String(source.influence ?? 0),
            power: String(source.power ?? 0),
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setProfileSnapshot(null);
          toast.error(getApiErrorMessage(error, 'Unable to load profile details.'));
        }
      }
    };

    void loadProfileSnapshot();

    return () => {
      isCancelled = true;
    };
  }, [profileUserId, isCurrentUserProfile, defaultCurrentUserSnapshot]);

  useEffect(() => {
    if (!markets.length) {
      void fetchMarkets();
    }
  }, [fetchMarkets, markets.length]);

  useEffect(() => {
    if (!entries.length) {
      void fetchLeaderboard();
    }
  }, [entries.length, fetchLeaderboard]);

  useEffect(() => {
    let isCancelled = false;

    const loadProfileDetails = async () => {
      if (!profileUserId || markets.length === 0) {
        if (!isCancelled) {
          setDetailedMarkets([]);
          setDetailedPositionMarkets([]);
          setProfileActions([]);
        }
        return;
      }

      setIsActionHistoryLoading(true);
      try {
        const detailedMarkets = await Promise.all(
          markets.map(async (market) => {
            const response = await api.get(`/markets/${market.id}`);
            return normalizeMarket(extractMarket(response.data));
          }),
        );

        const positionMarkets = detailedMarkets.filter((market) => {
          const profilePosition = market.positions?.find((position) => position.userId === profileUserId);
          return (profilePosition?.shares ?? []).some((position) => Math.abs(Number(position || 0)) > 0.0001);
        });

        const nextActions = detailedMarkets
          .flatMap((market) =>
            (market.actions ?? [])
              .filter((action) => action.participantChanges.some((participant) => participant.agentId === profileUserId))
              .map((action) => ({
                id: `${market.id}:${action.id}`,
                marketId: market.id,
                marketTitle: market.title,
                marketMakerId: market.makerId,
                outcomes: market.outcomes,
                action,
              })),
          )
          .sort((left, right) => new Date(right.action.createdAt).getTime() - new Date(left.action.createdAt).getTime());

        if (!isCancelled) {
          setDetailedMarkets(detailedMarkets);
          setDetailedPositionMarkets(positionMarkets);
          setProfileActions(nextActions);
        }
      } catch (error) {
        if (!isCancelled) {
          setDetailedMarkets([]);
          setDetailedPositionMarkets([]);
          setProfileActions([]);
          toast.error(getApiErrorMessage(error, 'Unable to load profile data.'));
        }
      } finally {
        if (!isCancelled) {
          setIsActionHistoryLoading(false);
        }
      }
    };

    void loadProfileDetails();

    return () => {
      isCancelled = true;
    };
  }, [markets, profileUserId]);

  useEffect(() => {
    setSelectedActionAgents({});
    setSelectedPositionAgents({});
    setMarketFilter('all');
    setPositionStatusFilter('all');
    setPositionRoleFilter('all');
    setPositionSort('legitimacy');
    setVisibleProfileActionCount(PROFILE_ACTION_PAGE_SIZE);
    setAgentChartRange('30d');
  }, [profileUserId]);

  useEffect(() => {
    setVisibleProfileActionCount(PROFILE_ACTION_PAGE_SIZE);
  }, [marketFilter, actionSearch]);

  useEffect(() => {
    setVisiblePositionCount(POSITION_PAGE_SIZE);
  }, [positionStatusFilter, positionRoleFilter, positionSort, positionSearch]);

  const createdMarkets = useMemo(() => markets.filter((market) => market.makerId === profileUserId), [markets, profileUserId]);
  const activePositions = useMemo(() => detailedPositionMarkets.filter((market) => !market.isUnmade), [detailedPositionMarkets]);

  const marketFilterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    profileActions.forEach((entry) => {
      if (!seen.has(entry.marketId)) {
        seen.set(entry.marketId, entry.marketTitle);
      }
    });

    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [profileActions]);

  const filteredProfileActions = useMemo(
    () =>
      profileActions.filter((entry) => {
        if (marketFilter !== 'all' && entry.marketId !== marketFilter) return false;
        if (actionSearch && !entry.marketTitle.toLowerCase().includes(actionSearch.toLowerCase())) return false;
        return true;
      }),
    [marketFilter, profileActions, actionSearch],
  );
  const visibleFilteredProfileActions = useMemo(
    () => filteredProfileActions.slice(0, visibleProfileActionCount),
    [filteredProfileActions, visibleProfileActionCount],
  );

  const filteredPositionMarkets = useMemo(
    () =>
      detailedPositionMarkets.filter((market) => {
        if (positionStatusFilter === 'active' && market.isUnmade) return false;
        if (positionStatusFilter === 'unmade' && !market.isUnmade) return false;
        if (positionRoleFilter === 'maker' && market.makerId !== profileUserId) return false;
        if (positionRoleFilter === 'taker' && market.makerId === profileUserId) return false;
        if (positionSearch && !market.title.toLowerCase().includes(positionSearch.toLowerCase())) return false;
        return true;
      }),
    [detailedPositionMarkets, positionStatusFilter, positionRoleFilter, positionSearch, profileUserId],
  );

  const sortedPositionMarkets = useMemo(() => sortMarkets(filteredPositionMarkets, positionSort), [filteredPositionMarkets, positionSort]);

  const paginatedPositionMarkets = useMemo(
    () => sortedPositionMarkets.slice(0, visiblePositionCount),
    [sortedPositionMarkets, visiblePositionCount],
  );

  const agentChartCutoff = useMemo(() => getChartCutoff(agentChartRange), [agentChartRange]);

  const agentChartData = useMemo(() => {
    const events = detailedMarkets
      .flatMap((market) => (market.actions ?? []).map((action) => ({ market, action })))
      .map(({ action }) => {
        const participant = action.participantChanges.find((change) => change.agentId === profileUserId);
        if (!participant) {
          return null;
        }

        const timestamp = new Date(action.createdAt).getTime();
        if (!Number.isFinite(timestamp)) {
          return null;
        }

        return {
          timestamp,
          label: new Date(action.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          balanceDelta: Number(participant.balanceChange ?? 0),
          influenceDelta: Number(participant.influenceChange ?? 0),
          powerDelta: Number(participant.powerChange ?? 0),
        };
      })
      .filter((event): event is { timestamp: number; label: string; balanceDelta: number; influenceDelta: number; powerDelta: number } =>
        event !== null,
      )
      .filter((event) => {
        if (agentChartCutoff === null) {
          return true;
        }

        return event.timestamp >= agentChartCutoff;
      })
      .sort((left, right) => left.timestamp - right.timestamp);

    const currentBalance = Number(profileUser?.balance ?? 0);
    const currentInfluence = Number(profileUser?.influence ?? 0);
    const currentPower = Number(profileUser?.power ?? 0);

    const totalBalanceDelta = events.reduce((sum, event) => sum + event.balanceDelta, 0);
    const totalInfluenceDelta = events.reduce((sum, event) => sum + event.influenceDelta, 0);
    const totalPowerDelta = events.reduce((sum, event) => sum + event.powerDelta, 0);

    let cumulativeBalance = currentBalance - totalBalanceDelta;
    let cumulativeInfluence = currentInfluence - totalInfluenceDelta;
    let cumulativePower = currentPower - totalPowerDelta;

    const points = events.map((event) => {
      cumulativeBalance += event.balanceDelta;
      cumulativeInfluence += event.influenceDelta;
      cumulativePower += event.powerDelta;

      return {
        label: event.label,
        balance: cumulativeBalance,
        influence: cumulativeInfluence,
        power: cumulativePower,
      };
    });

    return {
      labels: points.map((point) => point.label),
      balanceSeries: points.map((point) => point.balance),
      influenceSeries: points.map((point) => point.influence),
      powerSeries: points.map((point) => point.power),
    };
  }, [detailedMarkets, profileUserId, agentChartCutoff, profileUser?.balance, profileUser?.influence, profileUser?.power]);

  return (
    <div className="space-y-6 stagger-enter">
      <Card className="p-6 md:p-8" glow>
        <p className="text-sm uppercase tracking-[0.24em] text-gold-light">Profile</p>
        <h1 className="mt-3 text-3xl font-semibold text-text-primary">{profileUser?.username ?? 'Infocracy Member'}</h1>
        <p className="mt-3 text-base leading-7 text-text-secondary">
          Track the capital, power, and market footprint behind your governance activity.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary">Account details</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Email</p>
                <p className="mt-2 text-text-primary">{profileUser?.email || (isCurrentUserProfile ? '—' : 'Private')}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Joined</p>
                <p className="mt-2 text-text-primary">{formatDate(profileUser?.createdAt)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary">Market footprint</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Markets created</p>
                <p className="mt-2 text-3xl font-semibold text-text-primary">{createdMarkets.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Active positions</p>
                <p className="mt-2 text-3xl font-semibold text-text-primary">{activePositions.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text-primary">Agent metrics chart</h2>
                <p className="mt-2 text-sm text-text-secondary">Balance, influence, and power on the same chart from action history.</p>
              </div>
              <div className="flex items-center gap-2">
                {(['7d', '30d', 'all'] as ChartRangeOption[]).map((range) => (
                  <Button
                    key={`agent-chart-${range}`}
                    type="button"
                    size="sm"
                    variant={agentChartRange === range ? 'secondary' : 'ghost'}
                    onClick={() => setAgentChartRange(range)}
                  >
                    {range.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {agentChartData.labels.length ? (
                <LineChart
                  labels={agentChartData.labels}
                  series={[
                    {
                      id: '💰',
                      colorClassName: 'stroke-amber-300',
                      legendColorClassName: 'bg-amber-300',
                      values: agentChartData.balanceSeries,
                    },
                    {
                      id: '🧭',
                      colorClassName: 'stroke-cyan-300',
                      legendColorClassName: 'bg-cyan-300',
                      values: agentChartData.influenceSeries,
                    },
                    {
                      id: '⚡',
                      colorClassName: 'stroke-rose-300',
                      legendColorClassName: 'bg-rose-300',
                      values: agentChartData.powerSeries,
                    },
                  ]}
                  valueFormatter={(value) => formatDecimal(value, 4)}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-text-secondary">
                  No agent metrics data available for the selected range.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary">Created markets</h2>
            <div className="mt-5 space-y-3">
              {createdMarkets.length ? (
                createdMarkets.map((market) => (
                  <div key={market.id} className="rounded-2xl border border-border bg-[#141414] p-4">
                    <p className="font-medium text-text-primary">{market.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">{market.description}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-text-secondary">
                  {isCurrentUserProfile ? 'You have not created any markets yet.' : 'This user has not created any markets yet.'}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary">Account metrics</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">balance</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{formatBalance(profileUser?.balance ?? '0')}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">influence</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{formatInfluence(profileUser?.influence ?? '0')}</p>
              </div>
              <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">power</p>
                <p className="mt-2 text-2xl font-semibold text-gold-light">{formatPower(profileUser?.power ?? '0')}</p>
              </div>
            </div>
          </Card>

          <Card className="min-w-0 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-text-primary">
                {isCurrentUserProfile ? 'Your action history' : `${profileUser?.username ?? 'User'} action history`}
              </h2>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <input
                  type="text"
                  placeholder="Search actions..."
                  value={actionSearch}
                  onChange={(e) => setActionSearch(e.target.value)}
                  className="rounded-xl border border-border bg-background-secondary px-3 py-2 text-base md:text-sm text-text-primary placeholder-text-muted outline-none transition focus:border-gold/50 focus:outline-none"
                />
                <select
                  id="profile-action-market-filter"
                  className="w-full min-w-0 rounded-xl border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none sm:w-auto"
                  value={marketFilter}
                  onChange={(event) => setMarketFilter(event.target.value)}
                >
                  <option value="all">All markets</option>
                  {marketFilterOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!isActionHistoryLoading && filteredProfileActions.length > 0 ? (
              <p className="mt-3 text-sm text-text-secondary">
                Showing {Math.min(visibleFilteredProfileActions.length, filteredProfileActions.length)} of {filteredProfileActions.length} actions
              </p>
            ) : null}

            <div className="mt-5 space-y-4">
              {isActionHistoryLoading ? (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-text-secondary">
                  {isCurrentUserProfile ? 'Loading your action history...' : 'Loading action history...'}
                </div>
              ) : filteredProfileActions.length ? (
                visibleFilteredProfileActions.map((entry) => {
                  const action = entry.action;
                  const actionKey = entry.id;
                  const selectedAgentId = selectedActionAgents[actionKey];
                  const selectedParticipant =
                    action.participantChanges.find((participant) => participant.agentId === selectedAgentId) ??
                    action.participantChanges.find((participant) => participant.agentId === action.agentId) ??
                    action.participantChanges[0];
                  const displayedShares = action.type === 'unmake' ? entry.outcomes.map((outcome) => outcome.qValue) : action.shares;

                  return (
                    <div key={actionKey} className="min-w-0 rounded-2xl border border-border bg-[#141414] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.22em] text-text-muted">{action.type}</p>
                          <p className="mt-2 break-words font-medium text-text-primary">{entry.marketTitle}</p>
                          <p className="mt-1 text-sm text-text-secondary">{action.agentUsername}</p>
                        </div>
                        <p className="shrink-0 text-sm text-text-secondary">{formatDate(action.createdAt)}</p>
                      </div>

                      {action.participantChanges.length > 1 ? (
                        <div className="mt-4 grid gap-2">
                          <label htmlFor={`profile-action-agent-${actionKey}`} className="text-xs uppercase tracking-[0.16em] text-text-muted">
                            View deltas for
                          </label>
                          <select
                            id={`profile-action-agent-${actionKey}`}
                            className="w-full min-w-0 rounded-xl border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                            value={selectedParticipant?.agentId ?? ''}
                            onChange={(event) =>
                              setSelectedActionAgents((current) => ({
                                ...current,
                                [actionKey]: event.target.value,
                              }))
                            }
                          >
                            {action.participantChanges.map((participant) => (
                              <option key={`${actionKey}-${participant.agentId}`} value={participant.agentId}>
                                {participant.agentUsername} ({participant.agentId === entry.marketMakerId ? 'maker' : 'taker'})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-2 text-sm text-text-secondary">
                        {displayedShares.map((share, index) => (
                          <div key={`${actionKey}-${index}`} className="flex items-center justify-between gap-3">
                            <span className="min-w-0 break-words">{entry.outcomes[index]?.name ?? `Outcome ${index + 1}`}</span>
                            <span className="shrink-0 text-text-primary">{formatDecimal(share, 4)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <ActionPreview
                          title={action.type === 'take' ? 'Take preview' : action.type === 'make' ? 'Make preview' : 'Unmake preview'}
                          contextLabel={`${selectedParticipant?.agentUsername ?? action.agentUsername} (${(selectedParticipant?.agentId ?? action.agentId) === entry.marketMakerId ? 'maker' : 'taker'})`}
                          legitimacy={parseFloat(action.legitimacy)}
                          probabilities={entry.outcomes.map((outcome, index) => ({
                            label: outcome.name,
                            value: action.probabilities[index] ?? 0,
                          }))}
                          balanceChange={parseFloat(selectedParticipant?.balanceChange ?? action.balanceChange)}
                          influenceChange={parseFloat(selectedParticipant?.influenceChange ?? action.influenceChange)}
                          powerChange={parseFloat(selectedParticipant?.powerChange ?? action.powerChange)}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-text-secondary">
                  No actions found for the selected market.
                </div>
              )}
              {!isActionHistoryLoading && filteredProfileActions.length > visibleProfileActionCount ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setVisibleProfileActionCount((count) => count + PROFILE_ACTION_PAGE_SIZE)}
                >
                  Show more actions
                </Button>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-text-primary">Position summary</h2>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <input
                  type="text"
                  placeholder="Search positions..."
                  value={positionSearch}
                  onChange={(e) => setPositionSearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background-secondary px-3 py-2 text-base md:text-sm text-text-primary placeholder-text-muted outline-none transition focus:border-gold/50 focus:outline-none sm:w-auto"
                />
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <label htmlFor="position-status-filter" className="text-xs text-text-muted">
                    Status
                  </label>
                  <select
                    id="position-status-filter"
                    className="max-w-full rounded-xl border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                    value={positionStatusFilter}
                    onChange={(event) => setPositionStatusFilter(event.target.value as 'all' | 'active' | 'unmade')}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="unmade">Unmade</option>
                  </select>
                  <label htmlFor="position-role-filter" className="text-xs text-text-muted">
                    Role
                  </label>
                  <select
                    id="position-role-filter"
                    className="max-w-full rounded-xl border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                    value={positionRoleFilter}
                    onChange={(event) => setPositionRoleFilter(event.target.value as 'all' | 'maker' | 'taker')}
                  >
                    <option value="all">All</option>
                    <option value="maker">Maker</option>
                    <option value="taker">Taker</option>
                  </select>
                  <label htmlFor="position-sort" className="text-xs text-text-muted">
                    Sort by
                  </label>
                  <select
                    id="position-sort"
                    className="max-w-full rounded-xl border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                    value={positionSort}
                    onChange={(event) => setPositionSort(event.target.value as MarketSortOption)}
                  >
                    <option value="legitimacy">Legitimacy</option>
                    <option value="entropy">Entropy</option>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="liquidity">Liquidity</option>
                    <option value="title">Title</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {sortedPositionMarkets.length ? (
                paginatedPositionMarkets.map((market) => {
                  const legitimacy = computeLmsrLegitimacy(
                    market.outcomes.map((outcome) => outcome.qValue),
                    market.liquidityB,
                  );

                  // Get all agents who participated in this market
                  const agentIds = new Set<string>();
                  const agentNames = new Map<string, string>();
                  (market.actions ?? []).forEach((action) => {
                    (action.participantChanges ?? []).forEach((participant) => {
                      agentIds.add(participant.agentId);
                      agentNames.set(participant.agentId, participant.agentUsername);
                    });
                  });

                  const positionKey = market.id;
                  const defaultAgentId = profileUserId && agentIds.has(profileUserId) ? profileUserId : Array.from(agentIds)[0] ?? '';
                  const selectedAgentId = selectedPositionAgents[positionKey] ?? defaultAgentId;

                  // Compute deltas for selected agent
                  let deltaB = '0';
                  let deltaI = '0';
                  let deltaP = '0';

                  // Find if selected agent is maker or taker
                  const makeAction = (market.actions ?? []).find((action) => action.type === 'make');
                  const isMaker = selectedAgentId === market.makerId;

                  if (makeAction) {
                    // Initial q values from make action
                    const initialQ = makeAction.shares.map((s) => Number(s || 0));
                    const currentQ = market.outcomes.map((o) => Number(o.qValue || 0));
                    
                    // Get selected agent's current position
                    const agentPosition = market.positions?.find((pos) => pos.userId === selectedAgentId);
                    const currentPos = agentPosition?.shares.map((p) => Number(p || 0)) ?? [];

                    // Compute initial cost C(q^0)
                    const initialCost = computeLmsrLegitimacy(
                      initialQ.map((v) => v.toString()),
                      market.liquidityB,
                    );

                    // Current legitimacy is already computed
                    const currentCost = legitimacy;

                    // Compute derivative * position: dC(q).q = sum(probability_i * q_i)
                    const derivativeDotProduct = market.probabilities.reduce((sum, prob, idx) => sum + prob * (currentPos[idx] ?? 0), 0);

                    if (isMaker) {
                      if (!market.isUnmade) {
                        // Not unmade:
                        // deltaB = -C(q^0)
                        deltaB = String(-initialCost);
                        // deltaI = C(q) - dC(q).(q - q^0)
                        const qDiff = currentQ.reduce((sum, q, idx) => sum + market.probabilities[idx] * (q - initialQ[idx]), 0);
                        deltaI = String(currentCost - qDiff);
                      } else {
                        // Unmade:
                        // deltaB = -C(q^0) + C(q) - dC(q).(q - q^0)
                        const qDiff = currentQ.reduce((sum, q, idx) => sum + market.probabilities[idx] * (q - initialQ[idx]), 0);
                        deltaB = String(-initialCost + currentCost - qDiff);
                        deltaI = '0';
                      }
                    } else {
                      // Taker: sum of take costs and current position
                      const takerActions = (market.actions ?? []).filter(
                        (action) =>
                          action.type === 'take' &&
                          action.participantChanges.some((p) => p.agentId === selectedAgentId),
                      );

                      const sumTakeCosts = takerActions.reduce((sum, action) => {
                        const participant = action.participantChanges.find((p) => p.agentId === selectedAgentId);
                        return sum + (participant ? Number(participant.balanceChange) : 0);
                      }, 0);

                      if (!market.isUnmade) {
                        // Not unmade:
                        // deltaB = -sum(deltaC for takes)
                        // balanceChange is already negative, so just use it directly
                        deltaB = String(sumTakeCosts);
                        // deltaI = dC(q).q^t
                        deltaI = String(derivativeDotProduct);
                      } else {
                        // Unmade:
                        // deltaB = -sum(deltaC for takes) + dC(q).q^t
                        deltaB = String(sumTakeCosts + derivativeDotProduct);
                        deltaI = '0';
                      }
                    }
                  }

                  // deltaP = deltaB + deltaI
                  deltaP = String(Number(deltaB) + Number(deltaI));

                  return (
                    <div key={market.id} className="min-w-0 rounded-2xl border border-border bg-[#141414] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Position</p>
                          <p className="mt-2 break-words font-medium text-text-primary">{market.title}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {!market.isUnmade ? (
                            <span className="inline-block rounded-lg bg-green-950/50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-green-300">
                              Active
                            </span>
                          ) : null}
                          {market.isUnmade ? (
                            <span className="inline-block rounded-lg bg-red-950/50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-red-300">
                              Unmade
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {agentIds.size > 1 ? (
                        <div className="mt-4 grid gap-2">
                          <label htmlFor={`position-agent-${positionKey}`} className="text-xs uppercase tracking-[0.16em] text-text-muted">
                            View deltas for
                          </label>
                          <select
                            id={`position-agent-${positionKey}`}
                            className="w-full min-w-0 rounded-xl border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                            value={selectedAgentId}
                            onChange={(event) =>
                              setSelectedPositionAgents((current) => ({
                                ...current,
                                [positionKey]: event.target.value,
                              }))
                            }
                          >
                            {Array.from(agentIds).map((agentId) => (
                              <option key={agentId} value={agentId}>
                                {agentNames.get(agentId) ?? agentId} ({agentId === market.makerId ? 'maker' : 'taker'})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-2 text-sm text-text-secondary">
                        {market.outcomes.map((outcome, index) => {
                          // Get selected agent's position from positions array
                          const agentPosition = market.positions?.find((pos) => pos.userId === selectedAgentId);
                          const positionShares = agentPosition?.shares ?? [];
                          const position = Number(positionShares[index] ?? 0);

                          return (
                            <div key={`${market.id}-${outcome.id}`} className="flex items-center justify-between gap-3">
                              <span className="min-w-0 break-words">{outcome.name}</span>
                              <span className="shrink-0 text-text-primary">{formatDecimal(position, 4)} shares</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4">
                        <ActionPreview
                          title="Current state"
                          contextLabel={`${agentNames.get(selectedAgentId) ?? selectedAgentId} (${selectedAgentId === market.makerId ? 'maker' : 'taker'})`}
                          legitimacy={legitimacy}
                          probabilities={market.outcomes.map((outcome, index) => ({
                            label: outcome.name,
                            value: market.probabilities[index] ?? 0,
                          }))}
                          balanceChange={parseFloat(deltaB)}
                          influenceChange={parseFloat(deltaI)}
                          powerChange={parseFloat(deltaP)}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-text-secondary">
                  {isCurrentUserProfile
                    ? 'You do not currently hold any disclosed market positions.'
                    : 'This user does not currently hold any disclosed market positions.'}
                </div>
              )}
              {sortedPositionMarkets.length > visiblePositionCount ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setVisiblePositionCount((count) => count + POSITION_PAGE_SIZE)}
                >
                  Show more positions
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
