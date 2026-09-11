import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { useWorkspace } from '../app/WorkspaceContext';
import { Panel, PanelHeader, KpiCard, LoadingState, ErrorState, EmptyState, RiskScore, EvidenceLink } from '../components/ui';
import RiskDistribution from '../components/analytics/RiskDistribution';
import StateConcentration from '../components/analytics/StateConcentration';
import AnomalyTable from '../components/anomalies/AnomalyTable';
import PageContainer from '../components/layout/PageContainer';
import { formatINR, formatCount, formatMonth, formatRatio } from '../utils/format';
import { riskColorVar } from '../utils/risk';

/**
 * Command centre (DESIGN.md §9).
 *
 * Answers, in order: how much is monitored, what is flagged, where risk is
 * concentrated, and what to investigate now. One clear visual priority --
 * the investigation queue is the largest element on the page.
 */
export default function Overview() {
  const { anomalies, filtered, stats, status, filters, setFilter, setSelectedId } = useWorkspace();
  const navigate = useNavigate();

  const derived = useMemo(() => {
    const scored = anomalies.filter((a) => !a.insufficientHistory);
    const critical = scored.filter((a) => a.band.key === 'critical');
    const high = scored.filter((a) => a.band.key === 'high');
    const flagged = [...critical, ...high];
    const totalSpend = anomalies.reduce((s, a) => s + (a.monthlyAmount ?? 0), 0);
    const flaggedSpend = flagged.reduce((s, a) => s + (a.monthlyAmount ?? 0), 0);
    const agencies = new Set(anomalies.map((a) => a.agencyId));
    const flaggedAgencies = new Set(flagged.map((a) => a.agencyId));

    return {
      scored, critical, high, flagged, totalSpend, flaggedSpend,
      agencyCount: agencies.size,
      flaggedAgencyCount: flaggedAgencies.size,
      flaggedSpendShare: totalSpend > 0 ? (flaggedSpend / totalSpend) * 100 : 0,
    };
  }, [anomalies]);

  const queue = useMemo(
    () => [...filtered].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0)).slice(0, 8),
    [filtered]
  );

  const topAgencies = useMemo(() => {
    const byAgency = new Map();
    for (const a of anomalies) {
      const cur = byAgency.get(a.agencyId);
      if (!cur || (a.riskScore ?? 0) > (cur.riskScore ?? 0)) byAgency.set(a.agencyId, a);
    }
    return [...byAgency.values()]
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
      .slice(0, 6);
  }, [anomalies]);

  if (status.loading) {
    return (
      <PageContainer>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <KpiCard key={i} loading />)}
        </div>
        <Panel><LoadingState label="Loading intelligence" rows={6} /></Panel>
      </PageContainer>
    );
  }

  if (status.error) {
    return (
      <PageContainer>
        <Panel>
          <ErrorState
            title="Unable to load spending intelligence"
            detail={`The data service did not respond (${status.error}). No cached snapshot is available in this build.`}
            onRetry={() => window.location.reload()}
          />
        </Panel>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Command centre"
      description="Where MPLADS money moved, what deviates from baseline, and what to examine next."
    >
      {/* KPI strip -- each answers a real analytical question */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Expenditure monitored"
          value={formatINR(derived.totalSpend)}
          context={`across ${formatCount(derived.agencyCount)} agencies`}
        />
        <KpiCard
          label="Requires review"
          value={formatCount(derived.flagged.length)}
          tone={derived.flagged.length ? 'high' : 'default'}
          context={`agency-months scoring 70+ · ${formatCount(derived.flaggedAgencyCount)} agencies`}
        />
        <KpiCard
          label="Critical deviations"
          value={formatCount(derived.critical.length)}
          tone={derived.critical.length ? 'critical' : 'default'}
          context="composite score 86 or above"
        />
        <KpiCard
          label="Expenditure under review"
          value={formatINR(derived.flaggedSpend)}
          tone="accent"
          context={`${derived.flaggedSpendShare.toFixed(1)}% of monitored spend`}
        />
      </div>

      {/* Honest provenance line -- replaces the old "1,926 anomalies" claim */}
      <p className="text-xs text-content-muted -mt-1">
        {formatCount(derived.scored.length)} agency-months scored against their own historical baseline
        {stats?.worksAnalysed ? ` from ${formatCount(stats.worksAnalysed)} sanctioned works` : ''}
        {stats?.statesCovered?.length ? ` across ${stats.statesCovered.length} states` : ''}.
        {' '}Records with fewer than three prior months are excluded from scoring.
      </p>

      {/* Investigation queue -- the primary purpose of this screen */}
      <Panel>
        <PanelHeader
          title="Investigation queue"
          description="Highest composite risk in the current filter set"
          actions={
            <Link to="/anomalies" className="btn-default btn-sm">
              All anomalies <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          }
        />
        {queue.length ? (
          <AnomalyTable
            anomalies={queue}
            onSelect={setSelectedId}
            density="default"
            showPagination={false}
            pageSize={8}
          />
        ) : (
          <EmptyState
            title="Nothing in the queue"
            description="No records match the active filters. Widen the filter set to see flagged activity."
            icon={AlertTriangle}
          />
        )}
      </Panel>

      {/* Secondary analysis row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Panel>
          <PanelHeader
            title="Risk distribution"
            description="Scored agency-months by band"
          />
          <RiskDistribution
            anomalies={anomalies}
            activeBand={filters.band}
            onSelectBand={(b) => setFilter('band', b)}
          />
        </Panel>

        <Panel>
          <PanelHeader
            title="Geographic concentration"
            description="Where flagged activity clusters"
          />
          <StateConcentration
            anomalies={anomalies}
            activeState={filters.state}
            onSelectState={(s) => setFilter('state', s)}
          />
        </Panel>
      </div>

      {/* Agencies needing attention */}
      <Panel>
        <PanelHeader
          title="Agencies by peak risk"
          description="Each agency’s single highest-scoring month"
          actions={
            <Link to="/agencies" className="btn-default btn-sm">
              Benchmark <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          }
        />
        <ul className="divide-y divide-line-subtle">
          {topAgencies.map((a) => (
            <li key={a.agencyId}>
              <button
                onClick={() => { setSelectedId(a.id); navigate(`/investigation/${encodeURIComponent(a.id)}`); }}
                className="w-full flex items-center gap-4 px-4 py-2.5 text-left hover:bg-bg-elevated/60 transition-colors"
              >
                <RiskScore score={a.riskScore} insufficientHistory={a.insufficientHistory} size="sm" showLabel={false} />
                <span className="min-w-0 flex-1">
                  <span className="block text-base text-content-primary font-medium truncate">
                    {a.agencyName}
                  </span>
                  <span className="block text-xs text-content-muted truncate">
                    {a.state} · peak {formatMonth(a.month)}
                    {a.primarySignal && ` · ${a.primarySignal.label.toLowerCase()}`}
                  </span>
                </span>
                <span className="hidden sm:block text-right shrink-0">
                  <span className="block mono text-base text-content-primary">{formatINR(a.monthlyAmount)}</span>
                  <span
                    className="block mono text-2xs"
                    style={{ color: (a.signals.velocity_ratio ?? 0) >= 3 ? riskColorVar('high') : 'var(--text-muted)' }}
                  >
                    {formatRatio(a.signals.velocity_ratio)} pace
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-content-muted shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="text-xs text-content-muted pb-2">
        Risk scores aggregate four statistical tests against each agency’s own history and its peer group.
        They indicate where to look — not that any wrongdoing occurred.{' '}
        <EvidenceLink href="#/data-quality">How the data is prepared</EvidenceLink>
      </p>
    </PageContainer>
  );
}
