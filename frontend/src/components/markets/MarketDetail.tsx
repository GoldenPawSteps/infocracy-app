'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { ProbabilityBar } from '@/components/markets/ProbabilityBar';
import { TradeModal } from '@/components/markets/TradeModal';
import { UnmakeMarketModal } from '@/components/markets/UnmakeMarketModal';
import { Button } from '@/components/ui/Button';
import { LineChart } from '@/components/ui/LineChart';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import type { Market } from '@/lib/types';
import { ActionPreview } from '@/components/markets/ActionPreview';
import { computeLmsrLegitimacy, formatDate, formatDecimal, getApiErrorMessage } from '@/lib/utils';
import { useMarketStore } from '@/store/marketStore';

const ACTION_HISTORY_PAGE_SIZE = 10;
type ChartRangeOption = '7d' | '30d' | 'all';

function getOutcomeSeriesColor(index: number, total: number) {
  const hue = total <= 1 ? 42 : (index * 137.508) % 360;
  return `hsl(${hue} 78% 62%)`;
}

function getChartCutoff(range: ChartRangeOption) {
  if (range === 'all') {
    return null;
  }

  const days = range === '7d' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

interface MarketDetailProps {
  market: Market;
  currentUserId?: string;
}

export function MarketDetail({ market, currentUserId }: MarketDetailProps) {
  const executeTrade = useMarketStore((state) => state.executeTrade);
  const unmakeMarket = useMarketStore((state) => state.unmakeMarket);
  const isLoading = useMarketStore((state) => state.isLoading);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [unmakeOpen, setUnmakeOpen] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [isSampling, setIsSampling] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [selectedActionAgents, setSelectedActionAgents] = useState<Record<string, string>>({});
  const [actionAgentFilter, setActionAgentFilter] = useState<string>('all');
  const [actionSearch, setActionSearch] = useState<string>('');
  const [visibleActionCount, setVisibleActionCount] = useState<number>(ACTION_HISTORY_PAGE_SIZE);
  const [marketChartRange, setMarketChartRange] = useState<ChartRangeOption>('30d');
  const [sampleResult, setSampleResult] = useState<{
    outcomeIndex: number;
    outcomeName: string;
    probability: string;
    seed: string;
  } | null>(null);

  const isMaker = currentUserId === market.makerId;
  const isAuthenticated = Boolean(currentUserId);
  const canTrade = isAuthenticated && !market.isUnmade && !isMaker;
  const legitimacy = useMemo(
    () => computeLmsrLegitimacy(market.outcomes.map((outcome) => outcome.qValue), market.liquidityB),
    [market.liquidityB, market.outcomes],
  );

  const marketChartCutoff = useMemo(() => getChartCutoff(marketChartRange), [marketChartRange]);

  const marketTimelineChart = useMemo(() => {
    const sortedActions = [...(market.actions ?? [])].sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
    const actions = sortedActions.filter((action) => {
      if (marketChartCutoff === null) {
        return true;
      }

      return new Date(action.createdAt).getTime() >= marketChartCutoff;
    });

    const includeSnapshot = marketChartCutoff === null || new Date(market.createdAt).getTime() >= marketChartCutoff;

    const labels = actions.length
      ? actions.map((action) =>
          new Date(action.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        )
      : includeSnapshot
        ? [
            new Date(market.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
          ]
        : [];

    const rawLegitimacySeries = actions.length ? actions.map((action) => Number(action.legitimacy || 0)) : includeSnapshot ? [legitimacy] : [];

    const legitimacyMin = Math.min(...rawLegitimacySeries);
    const legitimacyMax = Math.max(...rawLegitimacySeries);
    const legitimacyRange = legitimacyMax - legitimacyMin;
    // Normalize legitimacy to the probability scale so all lines are comparable in one chart.
    const legitimacySeries = rawLegitimacySeries.map((value) => {
      if (!Number.isFinite(value)) {
        return 0;
      }

      if (legitimacyRange <= 0.0000001) {
        return 0.5;
      }

      return (value - legitimacyMin) / legitimacyRange;
    });

    const probabilitySeries = market.outcomes.map((outcome, index) => {
      const seriesColor = getOutcomeSeriesColor(index, market.outcomes.length);
      return {
        id: `P(${outcome.name})`,
        colorClassName: 'stroke-current',
        legendColorClassName: 'bg-current',
        strokeColor: seriesColor,
        legendColor: seriesColor,
        values: actions.length ? actions.map((action) => action.probabilities[index] ?? 0) : includeSnapshot ? [market.probabilities[index] ?? 0] : [],
        legendValueFormatter: (value: number) => `${(value * 100).toFixed(1)}%`,
      };
    });

    return {
      labels,
      legitimacySeries,
      rawLegitimacySeries,
      probabilitySeries,
    };
  }, [market.actions, market.createdAt, market.outcomes, market.probabilities, legitimacy, marketChartCutoff]);

  useEffect(() => {
    setShowDecision(false);
    setSampleResult(null);
    setSampleError(null);
    setSelectedActionAgents({});
    setActionAgentFilter('all');
    setMarketChartRange('30d');
    setVisibleActionCount(ACTION_HISTORY_PAGE_SIZE);
  }, [market.id]);

  useEffect(() => {
    setVisibleActionCount(ACTION_HISTORY_PAGE_SIZE);
  }, [actionAgentFilter, actionSearch]);

  const actionAgentOptions = useMemo(() => {
    const byId = new Map<string, string>();
    (market.actions ?? []).forEach((action) => {
      if (!byId.has(action.agentId)) {
        byId.set(action.agentId, action.agentUsername);
      }
    });

    return Array.from(byId.entries()).map(([id, username]) => ({ id, username }));
  }, [market.actions]);

  const filteredActions = useMemo(
    () =>
      (market.actions ?? []).filter((action) => {
        const normalizedSearch = actionSearch.trim().toLowerCase();
        if (actionAgentFilter !== 'all' && action.agentId !== actionAgentFilter) return false;
        if (normalizedSearch && !action.agentUsername.toLowerCase().includes(normalizedSearch)) return false;
        return true;
      }),
    [actionAgentFilter, actionSearch, market.actions],
  );
  const visibleFilteredActions = useMemo(() => filteredActions.slice(0, visibleActionCount), [filteredActions, visibleActionCount]);
  const hasActionFilters = actionAgentFilter !== 'all' || actionSearch.trim().length > 0;

  const decisionDraft = useMemo(() => {
    const tieEpsilon = 0.000001;
    const ordered = market.outcomes
      .map((outcome, index) => ({
        outcome: outcome.name,
        probability: market.probabilities[index] ?? 0,
      }))
      .sort((left, right) => right.probability - left.probability);

    const leader = ordered[0];
    const topProbability = leader?.probability ?? 0;
    const tiedLeaders = ordered.filter((entry) => Math.abs(entry.probability - topProbability) <= tieEpsilon);
    const runnerUp = ordered.find((entry) => entry.probability < topProbability - tieEpsilon);
    const leaderNames = tiedLeaders.map((entry) => `"${entry.outcome}"`);
    const formattedLeaderNames =
      leaderNames.length <= 1
        ? (leaderNames[0] ?? 'No leading outcome')
        : `${leaderNames.slice(0, -1).join(', ')} and ${leaderNames[leaderNames.length - 1]}`;
    const leadPercent = ((topProbability ?? 0) * 100).toFixed(1);
    const leadSummary =
      tiedLeaders.length > 1
        ? `The market currently assigns ${leadPercent}% probability each to ${formattedLeaderNames}`
        : `The market currently assigns ${leadPercent}% probability to ${formattedLeaderNames}`;

    return {
      headline:
        tiedLeaders.length > 1
          ? `Current signal is tied between ${formattedLeaderNames}.`
          : `Current signal favors “${leader?.outcome ?? 'No leading outcome'}”.`,
      summary: `${leadSummary}${
        runnerUp ? `, with ${runnerUp.outcome} next at ${(runnerUp.probability * 100).toFixed(1)}%.` : '.'
      }`,
      guidance:
        'Use this as an illustrative governance note, not an authoritative decision. Pair the market signal with deliberation, legal constraints, and implementation review before acting.',
    };
  }, [market.outcomes, market.probabilities]);

  const handleSampleDecision = async () => {
    setShowDecision(true);
    setSampleError(null);
    setSampleResult(null);

    setIsSampling(true);
    try {
      await api.get('/csrf');
      const response = await api.post(`/governance/${market.id}/sample`, {});
      const sample = (response.data as { sample?: { outcome?: number; probability?: string | number; seed?: string } })?.sample;

      if (typeof sample?.outcome !== 'number') {
        throw new Error('Unexpected governance sample response');
      }

      setSampleResult({
        outcomeIndex: sample.outcome,
        outcomeName: market.outcomes[sample.outcome]?.name ?? `Outcome ${sample.outcome + 1}`,
        probability: String(sample.probability ?? 0),
        seed: String(sample.seed ?? ''),
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to sample governance decision.');
      setSampleError(message);
      toast.error(message);
    } finally {
      setIsSampling(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-6 md:p-8" glow>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-gold-light">
                    Market
                  </span>
                  {market.isUnmade ? (
                    <span className="rounded-full border border-danger/40 bg-danger/10 px-3 py-1 text-xs font-medium text-danger">Unmade</span>
                  ) : (
                    <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">Active</span>
                  )}
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-text-primary">{market.title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">{market.description}</p>
              </div>

              <div className="grid w-full shrink-0 gap-3 sm:w-auto sm:grid-cols-2 xl:grid-cols-1">
                <Button type="button" className="w-full sm:min-w-[11rem]" onClick={() => setTradeOpen(true)} disabled={!canTrade}>
                  Trade
                </Button>
                {isMaker && !market.isUnmade ? (
                  <Button
                    type="button"
                    variant="danger"
                    className="w-full sm:min-w-[11rem]"
                    onClick={() => setUnmakeOpen(true)}
                    loading={isLoading}
                  >
                    Unmake
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:min-w-[11rem]"
                  onClick={() => void handleSampleDecision()}
                  disabled={!isAuthenticated}
                  loading={isSampling}
                >
                  Sample Governance Decision
                </Button>
              </div>
            </div>

            {showDecision ? (
              <Card className="border-gold/20 bg-gold/5 p-5">
                {isSampling ? (
                  <>
                    <h3 className="text-lg font-semibold text-gold-light">Sampling governance decision…</h3>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">Drawing an outcome from the current market distribution.</p>
                  </>
                ) : sampleResult ? (
                  <>
                    <h3 className="break-words text-lg font-semibold text-gold-light">Sampled governance decision: &ldquo;{sampleResult.outcomeName}&rdquo;.</h3>
                    <p className="mt-3 text-sm leading-6 text-text-primary">
                      This sample draw selected {sampleResult.outcomeName} from the current market distribution.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-text-secondary">
                      <span className="whitespace-nowrap">Sampled probability: {(Number(sampleResult.probability) * 100).toFixed(1)}%</span>
                      <span className="text-text-muted">|</span>
                      <span className="whitespace-nowrap">Outcome index: {sampleResult.outcomeIndex}</span>
                    </div>
                    <p className="mt-2 break-all text-sm leading-6 text-text-secondary">Seed: {sampleResult.seed}</p>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">{decisionDraft.guidance}</p>
                  </>
                ) : (
                  <>
                    {sampleError ? (
                      <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                        {sampleError}
                      </div>
                    ) : null}
                    <h3 className="text-lg font-semibold text-gold-light">{decisionDraft.headline}</h3>
                    <p className="mt-3 text-sm leading-6 text-text-primary">{decisionDraft.summary}</p>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">{decisionDraft.guidance}</p>
                  </>
                )}
              </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Maker</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{market.makerUsername}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Liquidity (b)</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{formatDecimal(market.liquidityB, 2)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Created</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{formatDate(market.createdAt)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-[#141414] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Legitimacy</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{formatDecimal(legitimacy, 4)}</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-text-primary">Market chart</h2>
                <div className="flex items-center gap-2">
                  {(['7d', '30d', 'all'] as ChartRangeOption[]).map((range) => (
                    <Button
                      key={`market-chart-${range}`}
                      type="button"
                      size="sm"
                      variant={marketChartRange === range ? 'secondary' : 'ghost'}
                      onClick={() => setMarketChartRange(range)}
                    >
                      {range.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <LineChart
                labels={marketTimelineChart.labels}
                series={[
                  {
                    id: 'Legitimacy',
                    colorClassName: 'stroke-gold-light',
                    legendColorClassName: 'bg-gold-light',
                    values: marketTimelineChart.legitimacySeries,
                    displayValues: marketTimelineChart.rawLegitimacySeries,
                    legendValueFormatter: (value: number) => formatDecimal(value, 4),
                  },
                  ...marketTimelineChart.probabilitySeries,
                ]}
                valueFormatter={(value) => formatDecimal(value, 4)}
              />
            </div>

            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-text-primary">Current probabilities</h2>
              {market.outcomes.map((outcome, index) => (
                <div key={outcome.id} className="rounded-2xl border border-border bg-[#141414] p-4">
                  <ProbabilityBar label={outcome.name} value={market.probabilities[index] ?? 0} />
                  {market.myPosition?.[index] ? (
                    <p className="mt-3 text-sm text-text-secondary">
                      Your position: <span className="text-text-primary">{formatDecimal(market.myPosition[index], 4)} shares</span>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

          </div>
        </Card>

        <Card className="min-w-0 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-text-primary">Action history</h2>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center" role="search" aria-label="Action history filters">
              <label htmlFor="action-history-search" className="sr-only">
                Search action history by agent
              </label>
              <input
                id="action-history-search"
                type="text"
                placeholder="Search actions by agent"
                value={actionSearch}
                onChange={(event) => setActionSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && actionSearch) {
                    event.preventDefault();
                    setActionSearch('');
                  }
                }}
                aria-describedby="action-history-results-count"
                className="focus-ring rounded-xl border border-border bg-background-secondary px-3 py-2 text-base md:text-sm text-text-primary placeholder-text-muted transition focus:border-gold/50"
              />
              <label htmlFor="action-history-agent-filter" className="sr-only">
                Filter actions by agent
              </label>
              <select
                id="action-history-agent-filter"
                className="focus-ring w-full min-w-0 rounded-xl border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-gold/50 sm:w-auto"
                value={actionAgentFilter}
                onChange={(event) => setActionAgentFilter(event.target.value)}
              >
                <option value="all">All agents</option>
                {actionAgentOptions.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.username}
                  </option>
                ))}
              </select>
              {hasActionFilters ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setActionSearch('');
                    setActionAgentFilter('all');
                  }}
                  aria-label="Clear action history filters"
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          </div>
          {filteredActions.length > 0 ? (
            <p id="action-history-results-count" className="mt-3 text-sm text-text-secondary" role="status" aria-live="polite">
              Showing {Math.min(visibleFilteredActions.length, filteredActions.length)} of {filteredActions.length} actions
            </p>
          ) : null}
          <div className="mt-5 space-y-4">
            {visibleFilteredActions.map((action) => (
              <div key={action.id} className="min-w-0 rounded-2xl border border-border bg-[#141414] p-4">
                {(() => {
                  const selectedAgentId = selectedActionAgents[action.id];
                  const selectedParticipant =
                    action.participantChanges.find((participant) => participant.agentId === selectedAgentId) ??
                    action.participantChanges.find((participant) => participant.agentId === action.agentId) ??
                    action.participantChanges[0];
                  const displayedShares = action.type === 'unmake' ? market.outcomes.map((outcome) => outcome.qValue) : action.shares;

                  return (
                    <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.22em] text-text-muted">{action.type}</p>
                    <p className="mt-2 break-words font-medium text-text-primary">{action.agentUsername}</p>
                  </div>
                  <p className="shrink-0 text-sm text-text-secondary">{formatDate(action.createdAt)}</p>
                </div>

                {action.participantChanges.length > 1 ? (
                  <div className="mt-4 grid gap-2">
                    <label htmlFor={`action-agent-${action.id}`} className="text-xs uppercase tracking-[0.16em] text-text-muted">
                      View deltas for
                    </label>
                    <select
                      id={`action-agent-${action.id}`}
                      className="focus-ring w-full min-w-0 rounded-xl border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary focus:border-gold/50"
                      value={selectedParticipant?.agentId ?? ''}
                      onChange={(event) =>
                        setSelectedActionAgents((current) => ({
                          ...current,
                          [action.id]: event.target.value,
                        }))
                      }
                    >
                      {action.participantChanges.map((participant) => (
                        <option key={`${action.id}-${participant.agentId}`} value={participant.agentId}>
                          {participant.agentUsername} ({participant.agentId === market.makerId ? 'maker' : 'taker'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2 text-sm text-text-secondary">
                  {displayedShares.map((share, index) => (
                    <div key={`${action.id}-${index}`} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 break-words">{market.outcomes[index]?.name ?? `Outcome ${index + 1}`}</span>
                      <span className="shrink-0 text-text-primary">{formatDecimal(share, 4)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <ActionPreview
                    title={action.type === 'take' ? 'Take preview' : action.type === 'make' ? 'Make preview' : 'Unmake preview'}
                    contextLabel={`${selectedParticipant?.agentUsername ?? action.agentUsername} (${(selectedParticipant?.agentId ?? action.agentId) === market.makerId ? 'maker' : 'taker'})`}
                    legitimacy={parseFloat(action.legitimacy)}
                    probabilities={market.outcomes.map((outcome, index) => ({
                      label: outcome.name,
                      value: action.probabilities[index] ?? 0,
                    }))}
                    balanceChange={parseFloat(selectedParticipant?.balanceChange ?? action.balanceChange)}
                    influenceChange={parseFloat(selectedParticipant?.influenceChange ?? action.influenceChange)}
                    powerChange={parseFloat(selectedParticipant?.powerChange ?? action.powerChange)}
                  />
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
            {filteredActions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-[#141414] p-4 text-sm text-text-secondary">
                No actions found for the selected agent.
              </div>
            ) : null}
            {filteredActions.length > visibleActionCount ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setVisibleActionCount((count) => count + ACTION_HISTORY_PAGE_SIZE)}
              >
                Show more actions
              </Button>
            ) : null}
          </div>
        </Card>
      </div>

      <TradeModal
        market={market}
        currentUserId={currentUserId}
        open={tradeOpen}
        onClose={() => setTradeOpen(false)}
        onSubmit={(deltaQ) => executeTrade(market.id, deltaQ)}
      />
      <UnmakeMarketModal
        market={market}
        currentUserId={currentUserId}
        open={unmakeOpen}
        onClose={() => setUnmakeOpen(false)}
        onSubmit={() => unmakeMarket(market.id)}
      />
    </>
  );
}
