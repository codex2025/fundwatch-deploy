import React, { useEffect, useMemo, useState } from 'react';
import { Search, Database } from 'lucide-react';
import { useWorkspace } from '../app/WorkspaceContext';
import { Panel, PanelHeader, KpiCard, LoadingState, ErrorState, EmptyState, SortableTh } from '../components/ui';
import PageContainer from '../components/layout/PageContainer';
import { fetchAliasAuditMap } from '../api/client';
import { formatCount, formatPercent } from '../utils/format';
import { riskColorVar } from '../utils/risk';

/**
 * Data quality (DESIGN.md §25).
 *
 * Government data is messy, and the reconciliation work is genuinely part of
 * the product. This screen explains the quality position rather than printing
 * a single unexplained percentage.
 */
export default function DataQuality() {
  const { anomalies, stats, status } = useWorkspace();
  const [aliases, setAliases] = useState({ data: [], loading: true, error: null });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'matchScore', asc: true });

  useEffect(() => {
    let cancelled = false;
    fetchAliasAuditMap().then((res) => {
      if (cancelled) return;
      setAliases({ data: res.data ?? [], loading: false, error: res.data ? null : res.error });
    });
    return () => { cancelled = true; };
  }, []);

  /** Completeness measured directly on the records we hold. */
  const coverage = useMemo(() => {
    const total = anomalies.length || 1;
    const field = (pick) => anomalies.filter(pick).length;
    return [
      { label: 'Agency name', present: field((a) => a.agencyName && a.agencyName !== 'Unnamed agency') },
      { label: 'State', present: field((a) => a.state) },
      { label: 'District', present: field((a) => a.district) },
      { label: 'Constituency', present: field((a) => a.constituency) },
      { label: 'Reporting month', present: field((a) => a.month) },
      { label: 'Monthly expenditure', present: field((a) => a.monthlyAmount != null) },
      { label: 'Historical baseline', present: field((a) => a.historicalMedian != null) },
      { label: 'Velocity signal', present: field((a) => a.signals.velocity_ratio != null) },
      { label: 'Peer signal', present: field((a) => a.signals.peer_ratio != null) },
      { label: 'Work-level evidence', present: field((a) => a.topWorks.length > 0) },
    ].map((f) => ({ ...f, share: (f.present / total) * 100, missing: total - f.present }));
  }, [anomalies]);

  const overall = useMemo(() => {
    if (!coverage.length) return 0;
    return coverage.reduce((s, f) => s + f.share, 0) / coverage.length;
  }, [coverage]);

  const aliasRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? aliases.data.filter((a) => `${a.rawName} ${a.canonicalName} ${a.canonicalId}`.toLowerCase().includes(q))
      : aliases.data;
    return [...list].sort((a, b) => {
      const va = a[sort.key] ?? '';
      const vb = b[sort.key] ?? '';
      if (va < vb) return sort.asc ? -1 : 1;
      if (va > vb) return sort.asc ? 1 : -1;
      return 0;
    });
  }, [aliases.data, query, sort]);

  const lowConfidence = aliases.data.filter((a) => (a.matchScore ?? 100) < 90).length;
  const handleSort = (key) => setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));

  return (
    <PageContainer
      title="Data quality"
      description="Field completeness and the agency-name reconciliation that makes cross-agency comparison possible."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Field completeness"
          value={formatPercent(overall, 0)}
          tone={overall > 90 ? 'accent' : 'high'}
          context={`averaged across ${coverage.length} fields`}
        />
        <KpiCard
          label="Agencies after merge"
          value={formatCount(stats?.agenciesMonitored ?? new Set(anomalies.map((a) => a.agencyId)).size)}
          context="canonical identities"
        />
        <KpiCard
          label="Name variants mapped"
          value={aliases.loading ? '…' : formatCount(aliases.data.length)}
          context="raw strings reconciled"
        />
        <KpiCard
          label="Low-confidence merges"
          value={aliases.loading ? '…' : formatCount(lowConfidence)}
          tone={lowConfidence ? 'high' : 'default'}
          context="match score below 90 — worth review"
        />
      </div>

      <Panel>
        <PanelHeader
          title="Field completeness"
          description={`Measured across ${formatCount(anomalies.length)} scored agency-months`}
        />
        {status.loading ? (
          <LoadingState rows={6} />
        ) : (
          <div className="p-4 space-y-2.5">
            {coverage.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="text-base text-content-secondary w-44 shrink-0 truncate">{f.label}</span>
                <span className="flex-1 h-1.5 rounded-sm bg-bg-inset overflow-hidden">
                  <span
                    className="block h-full rounded-sm"
                    style={{
                      width: `${f.share}%`,
                      background: f.share > 99 ? 'var(--risk-low)'
                        : f.share > 50 ? 'var(--risk-medium)'
                        : 'var(--risk-critical)',
                    }}
                  />
                </span>
                <span className="mono text-sm w-14 text-right tabular"
                      style={{ color: f.share > 99 ? 'var(--text-secondary)' : riskColorVar(f.share > 50 ? 'medium' : 'critical') }}>
                  {formatPercent(f.share, 0)}
                </span>
                <span className="mono text-2xs text-content-muted w-20 text-right tabular">
                  {f.missing ? `${formatCount(f.missing)} missing` : 'complete'}
                </span>
              </div>
            ))}
            <p className="text-xs text-content-muted pt-2 border-t border-line-subtle mt-3">
              District and constituency are dropped by the scoring pipeline before
              <span className="mono"> anomalies.json</span> is written, which is why their completeness reads zero.
              Every analytical field the risk engine depends on is present.
            </p>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Agency name reconciliation"
          description="Raw agency strings merged into canonical identities by fuzzy matching"
          actions={
            <div className="relative w-44 sm:w-64">
              <Search className="w-3.5 h-3.5 text-content-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                className="field pl-8"
                placeholder="Search agency names…"
                aria-label="Search reconciliation records"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          }
        />

        {aliases.loading ? (
          <LoadingState label="Loading reconciliation map" rows={6} />
        ) : aliases.error ? (
          <ErrorState
            title="Unable to load the reconciliation map"
            detail={`The data service did not respond (${aliases.error}). This view has no offline snapshot.`}
          />
        ) : aliasRows.length === 0 ? (
          <EmptyState
            title="No reconciliation records"
            description={query ? `Nothing matches “${query}”.` : 'No agency name variants were recorded.'}
            icon={Database}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table density-compact">
              <caption className="sr-only">Agency name reconciliation records</caption>
              <thead>
                <tr>
                  <SortableTh label="Raw name in source" sortKey="rawName" sort={sort} onSort={handleSort} />
                  <SortableTh label="Canonical agency" sortKey="canonicalName" sort={sort} onSort={handleSort} />
                  <SortableTh label="Confidence" sortKey="matchScore" sort={sort} onSort={handleSort} align="right" width={110} />
                  <th scope="col" style={{ width: 220 }}>Basis</th>
                </tr>
              </thead>
              <tbody>
                {aliasRows.map((a, i) => (
                  <tr key={`${a.rawName}-${i}`}>
                    <td className="text-content-secondary">{a.rawName || '—'}</td>
                    <td>
                      <div className="text-content-primary">{a.canonicalName || '—'}</div>
                      <div className="mono text-2xs text-content-muted">{a.canonicalId}</div>
                    </td>
                    <td className="text-right">
                      <span
                        className="mono font-medium"
                        style={{ color: (a.matchScore ?? 100) < 90 ? riskColorVar('medium') : 'var(--text-secondary)' }}
                      >
                        {a.matchScore != null ? a.matchScore.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="text-xs text-content-muted">{a.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PageContainer>
  );
}
