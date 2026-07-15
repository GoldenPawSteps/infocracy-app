'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { ActionPreview } from '@/components/markets/ActionPreview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useMarkets } from '@/hooks/useMarkets';
import api from '@/lib/api';
import type { MarketAction, Outcome } from '@/lib/types';
import { formatBalance, formatDate, formatDecimal, formatInfluence, formatPower, getApiErrorMessage, normalizeMarket } from '@/lib/utils';

interface ProfileActionEntry {
  id: string;
  marketId: string;
  marketTitle: string;
  marketMakerId: string;
  outcomes: Outcome[];
  action: MarketAction;
}

const PROFILE_ACTION_PAGE_SIZE = 10;

const extractMarket = (payload: Record<string, unknown> | unknown): Record<string, unknown> => {
  const source = (payload as Record<string, unknown>)?.data ?? (payload as Record<string, unknown>)?.market ?? payload;
  return (source as Record<string, unknown>) ?? {};
};

export default function ProfilePage() {
  const { user, balance, influence, power } = useAuth();
  const { markets, fetchMarkets } = useMarkets();
  const [isActionHistoryLoading, setIsActionHistoryLoading] = useState(false);
  const [profileActions, setProfileActions] = useState<ProfileActionEntry[]>([]);
  const [selectedActionAgents, setSelectedActionAgents] = useState<Record<string, string>>({});
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [visibleProfileActionCount, setVisibleProfileActionCount] = useState<number>(PROFILE_ACTION_PAGE_SIZE);

  useEffect(() => {
    if (!markets.length) {
      void fetchMarkets();
    }
  }, [fetchMarkets, markets.length]);

  useEffect(() => {
    let isCancelled = false;

    const loadProfileActions = async () => {
      if (!user?.id || markets.length === 0) {
        if (!isCancelled) {
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

        const nextActions = detailedMarkets
          .flatMap((market) =>
            (market.actions ?? [])
              .filter((action) => action.agentId === user.id)
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
          setProfileActions(nextActions);
        }
      } catch (error) {
        if (!isCancelled) {
          toast.error(getApiErrorMessage(error, 'Unable to load profile action history.'));
        }
      } finally {
        if (!isCancelled) {
          setIsActionHistoryLoading(false);
        }
      }
    };

    void loadProfileActions();

    return () => {
      isCancelled = true;
    };
  }, [markets, user?.id]);

  useEffect(() => {
    setSelectedActionAgents({});
    setMarketFilter('all');
    setVisibleProfileActionCount(PROFILE_ACTION_PAGE_SIZE);
  }, [user?.id]);

  useEffect(() => {
    setVisibleProfileActionCount(PROFILE_ACTION_PAGE_SIZE);
  }, [marketFilter]);

  const createdMarkets = useMemo(() => markets.filter((market) => market.makerId === user?.id), [markets, user?.id]);
  const activePositions = useMemo(
    () =>
      markets.filter((market) =>
        market.myPosition?.some((position) => Math.abs(Number(position || 0)) > 0.0001),
      ),
    [markets],
  );

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
    () => profileActions.filter((entry) => marketFilter === 'all' || entry.marketId === marketFilter),
    [marketFilter, profileActions],
  );
  const visibleFilteredProfileActions = useMemo(
    () => filteredProfileActions.slice(0, visibleProfileActionCount),
    [filteredProfileActions, visibleProfileActionCount],
  );

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8" glow>
        <p className="text-sm uppercase tracking-[0.24em] text-gold-light">Profile</p>
        <h1 className="mt-3 text-3xl font-semibold text-text-primary">{user?.username ?? 'Infocracy Member'}</h1>
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
                <p className="mt-2 text-text-primary">{user?.email ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Joined</p>
                <p className="mt-2 text-text-primary">{formatDate(user?.createdAt)}</p>
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
                  You have not created any markets yet.
                </div>
              )}
            </div>
          </Card>

          <Card className="min-w-0 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-text-primary">Your action history</h2>
              <div className="flex min-w-0 items-center gap-2">
                <label htmlFor="profile-action-market-filter" className="text-xs uppercase tracking-[0.16em] text-text-muted">
                  Market
                </label>
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
                  Loading your action history...
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

                  return (
                    <div key={actionKey} className="min-w-0 rounded-2xl border border-border bg-[#141414] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.22em] text-text-muted">{action.type}</p>
                          <p className="mt-2 break-words font-medium text-text-primary">{entry.marketTitle}</p>
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
                        {action.shares.map((share, index) => (
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
                          legitimacy={action.legitimacy}
                          probabilities={entry.outcomes.map((outcome, index) => ({
                            label: outcome.name,
                            value: action.probabilities[index] ?? 0,
                          }))}
                          balanceChange={selectedParticipant?.balanceChange ?? action.balanceChange}
                          influenceChange={selectedParticipant?.influenceChange ?? action.influenceChange}
                          powerChange={selectedParticipant?.powerChange ?? action.powerChange}
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
            <h2 className="text-xl font-semibold text-text-primary">Account metrics</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">balance</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{formatBalance(balance)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">influence</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{formatInfluence(influence)}</p>
              </div>
              <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">power</p>
                <p className="mt-2 text-2xl font-semibold text-gold-light">{formatPower(power)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-text-primary">Position summary</h2>
            <div className="mt-5 space-y-3">
              {activePositions.length ? (
                activePositions.map((market) => (
                  <div key={market.id} className="rounded-2xl border border-border bg-[#141414] p-4">
                    <p className="font-medium text-text-primary">{market.title}</p>
                    <div className="mt-3 space-y-2 text-sm text-text-secondary">
                      {market.outcomes.map((outcome, index) => {
                        const position = Number(market.myPosition?.[index] ?? 0);
                        if (!position) {
                          return null;
                        }

                        return (
                          <div key={`${market.id}-${outcome.id}`} className="flex items-center justify-between gap-3">
                            <span>{outcome.name}</span>
                            <span className="text-text-primary">{position.toFixed(4)} shares</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-text-secondary">
                  You do not currently hold any disclosed market positions.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
