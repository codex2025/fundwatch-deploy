import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../app/WorkspaceContext';
import { Panel, PanelHeader, KpiCard, LoadingState, EmptyState, RiskScore } from '../components/ui';
import StateConcentration from '../components/analytics/StateConcentration';
import PageContainer from '../components/layout/PageContainer';
import { formatINR, formatCount, formatMonth } from '../utils/format';
import { riskColorVar } from '../utils/risk';

/**
 * Geographic intelligence (DESIGN.md §15).
 *
 * Scoped honestly: `district` and `constituency` are absent from the scored
 * anomaly output (REDESIGN_AUDIT §2.12, open decision D4), so this view works
 * at state level rather than rendering a district map keyed on empty strings.
 */
export default function Geography() {
  const { anomalies, status, filters, setFilter, setSelectedId } = useWorkspace();
  const navigate = useNavigate();

  const hasDistrictData = useMemo(
    () => anomalies.some((a) => a.district),
    [anomalies]
  );

  const inState = useMemo(
    () => (filters.state === 'ALL' ? [] : anomalies.filter((a) => a.state === filters.state)),
    [anomalies, filters.state]
  );

  const stateSummary = useMemo(() => {
    if (!inState.length) return null;
    const agencies = new Set(inState.map((a) => a.agencyId));
    const flagged = inState.filter((a) => (a.riskScore ?? 0) >= 70);
    return {
      agencies: agencies.size,
      records: inState.length,
      flagged: flagged.length,
      spend: inState.reduce((s, a) => s + (a.monthlyAmount ?? 0), 0),
      top: [...inState].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0)).slice(0, 8),
    };
  }, [inState]);

  if (status.loading) {
    return <PageContainer><Panel><LoadingState label="Loading geography" rows={8} /></Panel></PageContainer>;
  }

  return (
    <PageContainer
      title="Geographic intelligence"
      description="Where flagged spending concentrates across the monitored states."
    >
      {!hasDistrictData && (
        <div
          className="flex items-start gap-2.5 rounded border p-3"
          style={{ background: 'var(--risk-info-surface)', borderColor: 'rgba(77,157,255,0.25)' }}
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--risk-info)' }} aria-hidden="true" />
          <p className="text-sm text-content-secondary">
            District and constituency fields are not present in the scored dataset, so analysis is
            reported at state level. Once the detector carries those columns through, this view
            will drill to district and constituency without further change.
          </p>
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Risk by state"
          description="Select a state to scope the entire workspace"
        />
        <StateConcentration
          anomalies={anomalies}
          activeState={filters.state}
          onSelectState={(s) => setFilter('state', s)}
        />
      </Panel>

      {stateSummary ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard label="Agencies" value={formatCount(stateSummary.agencies)} context={filters.state} />
            <KpiCard label="Scored months" value={formatCount(stateSummary.records)} />
            <KpiCard label="Requires review" value={formatCount(stateSummary.flagged)} tone="high" context="score 70 or above" />
            <KpiCard label="Disbursed" value={formatINR(stateSummary.spend)} />
          </div>

          <Panel>
            <PanelHeader
              title={`Highest risk in ${filters.state}`}
              description="Ranked by composite score"
            />
            <ul className="divide-y divide-line-subtle">
              {stateSummary.top.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => { setSelectedId(a.id); navigate(`/investigation/${encodeURIComponent(a.id)}`); }}
                    className="w-full flex items-center gap-4 px-4 py-2.5 text-left hover:bg-bg-elevated/60 transition-colors"
                  >
                    <RiskScore score={a.riskScore} insufficientHistory={a.insufficientHistory} size="sm" showLabel={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base text-content-primary truncate">{a.agencyName}</span>
                      <span className="block text-xs text-content-muted">
                        {formatMonth(a.month)} · {formatINR(a.monthlyAmount)}
                        {a.primarySignal && ` · ${a.primarySignal.label.toLowerCase()}`}
                      </span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-content-muted shrink-0" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : (
        <Panel>
          <EmptyState
            title="Select a state"
            description="Choose a state above to see its agencies, flagged months and highest-risk records."
          />
        </Panel>
      )}
    </PageContainer>
  );
}
