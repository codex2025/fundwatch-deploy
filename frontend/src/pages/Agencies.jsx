import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../app/WorkspaceContext';
import { Panel, PanelHeader, RiskScore, SortableTh, LoadingState, EmptyState, SegmentedControl } from '../components/ui';
import PageContainer from '../components/layout/PageContainer';
import { formatINR, formatRatio, formatCount, formatMonth, formatDeviation } from '../utils/format';
import { riskColorVar } from '../utils/risk';

/**
 * Cross-agency benchmarking (DESIGN.md §14).
 *
 * Comparison is scoped explicitly. The default compares agencies within one
 * state, because comparing a Kerala municipal council against an Odisha
 * panchayat on raw cost is not an apples-to-apples population -- and the UI
 * says so rather than quietly doing it.
 */
export default function Agencies() {
  const { anomalies, status, filters, setFilter, facets, setSelectedId } = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'peakScore', asc: false });
  const [scope, setScope] = useState('state');

  const rows = useMemo(() => {
    const scoped = filters.state !== 'ALL'
      ? anomalies.filter((a) => a.state === filters.state)
      : anomalies;

    const byAgency = new Map();
    for (const a of scoped) {
      const cur = byAgency.get(a.agencyId) ?? {
        agencyId: a.agencyId,
        agencyName: a.agencyName,
        state: a.state,
        district: a.district,
        months: 0,
        totalSpend: 0,
        peakScore: 0,
        peakRecord: null,
        flagged: 0,
        velocities: [],
        peerRatios: [],
        deviations: [],
      };
      cur.months += 1;
      cur.totalSpend += a.monthlyAmount ?? 0;
      if ((a.riskScore ?? 0) > cur.peakScore) {
        cur.peakScore = a.riskScore ?? 0;
        cur.peakRecord = a;
      }
      if ((a.riskScore ?? 0) >= 70) cur.flagged += 1;
      if (a.signals.velocity_ratio != null) cur.velocities.push(a.signals.velocity_ratio);
      if (a.signals.peer_ratio != null) cur.peerRatios.push(a.signals.peer_ratio);
      if (a.signals.modified_z_score != null) cur.deviations.push(a.signals.modified_z_score);
      byAgency.set(a.agencyId, cur);
    }

    const median = (arr) => {
      if (!arr.length) return null;
      const s = [...arr].sort((x, y) => x - y);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };

    const list = [...byAgency.values()].map((r) => ({
      ...r,
      medianSpend: r.months ? r.totalSpend / r.months : 0,
      peakVelocity: r.velocities.length ? Math.max(...r.velocities) : null,
      medianPeerRatio: median(r.peerRatios),
      peakDeviation: r.deviations.length ? Math.max(...r.deviations) : null,
      flaggedShare: r.months ? (r.flagged / r.months) * 100 : 0,
    }));

    const q = query.trim().toLowerCase();
    const filteredList = q
      ? list.filter((r) => `${r.agencyName} ${r.agencyId}`.toLowerCase().includes(q))
      : list;

    return filteredList.sort((a, b) => {
      const va = a[sort.key] ?? -1;
      const vb = b[sort.key] ?? -1;
      if (va < vb) return sort.asc ? -1 : 1;
      if (va > vb) return sort.asc ? 1 : -1;
      return 0;
    });
  }, [anomalies, filters.state, query, sort]);

  const handleSort = (key) => setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: false }));

  return (
    <PageContainer
      title="Agency benchmarking"
      description="Compare implementing agencies on spend, deviation and flag frequency."
    >
      <Panel>
        <PanelHeader
          title="Peer comparison"
          description={
            filters.state !== 'ALL'
              ? `Scoped to ${filters.state} — ${formatCount(rows.length)} agencies`
              : `All states — ${formatCount(rows.length)} agencies`
          }
          actions={
            <div className="flex items-center gap-2">
              <select
                className="field w-auto"
                value={filters.state}
                onChange={(e) => setFilter('state', e.target.value)}
                aria-label="Comparison scope"
              >
                <option value="ALL">All states</option>
                {facets.states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="relative w-40 sm:w-56">
                <Search className="w-3.5 h-3.5 text-content-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  className="field pl-8"
                  placeholder="Find an agency…"
                  aria-label="Search agencies"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          }
        />

        {/* Scope disclosure -- never compare incompatible populations silently */}
        {filters.state === 'ALL' && (
          <p
            className="text-xs px-4 py-2 border-b border-line-subtle"
            style={{ background: 'var(--risk-medium-surface)', color: 'var(--risk-medium)' }}
          >
            Comparing agencies across all states. Cost levels differ by state and agency type —
            select a single state for a like-for-like comparison.
          </p>
        )}

        {status.loading ? (
          <LoadingState label="Loading agencies" rows={8} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No agencies match"
            description="Adjust the state scope or clear the search to see agencies."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table density-default">
              <caption className="sr-only">Agency benchmark comparison</caption>
              <thead>
                <tr>
                  <SortableTh label="Agency" sortKey="agencyName" sort={sort} onSort={handleSort} />
                  <SortableTh label="Peak risk" sortKey="peakScore" sort={sort} onSort={handleSort} width={110} />
                  <SortableTh label="Median monthly" sortKey="medianSpend" sort={sort} onSort={handleSort} align="right" width={130} />
                  <SortableTh label="Peak velocity" sortKey="peakVelocity" sort={sort} onSort={handleSort} align="right" width={110} />
                  <SortableTh label="Peer ratio" sortKey="medianPeerRatio" sort={sort} onSort={handleSort} align="right" width={100} />
                  <SortableTh label="Peak deviation" sortKey="peakDeviation" sort={sort} onSort={handleSort} align="right" width={120} />
                  <SortableTh label="Flagged" sortKey="flagged" sort={sort} onSort={handleSort} align="right" width={110} />
                  <th scope="col" style={{ width: 44 }}><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.agencyId}
                    tabIndex={0}
                    className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset"
                    onClick={() => {
                      if (!r.peakRecord) return;
                      setSelectedId(r.peakRecord.id);
                      navigate(`/investigation/${encodeURIComponent(r.peakRecord.id)}`);
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && r.peakRecord) {
                        e.preventDefault();
                        setSelectedId(r.peakRecord.id);
                        navigate(`/investigation/${encodeURIComponent(r.peakRecord.id)}`);
                      }
                    }}
                  >
                    <td>
                      <div className="text-content-primary font-medium truncate max-w-[20rem]">{r.agencyName}</div>
                      <div className="text-xs text-content-muted truncate">
                        {r.state}
                        <span className="mx-1.5 opacity-40">·</span>
                        <span className="mono">{r.agencyId}</span>
                        {r.peakRecord && (
                          <>
                            <span className="mx-1.5 opacity-40">·</span>
                            peak {formatMonth(r.peakRecord.month)}
                          </>
                        )}
                      </div>
                    </td>
                    <td><RiskScore score={r.peakScore} size="sm" /></td>
                    <td className="text-right mono">{formatINR(r.medianSpend)}</td>
                    <td className="text-right mono"
                        style={{ color: (r.peakVelocity ?? 0) >= 3 ? riskColorVar('high') : 'var(--text-secondary)' }}>
                      {formatRatio(r.peakVelocity)}
                    </td>
                    <td className="text-right mono"
                        style={{ color: (r.medianPeerRatio ?? 0) >= 1.25 ? riskColorVar('medium') : 'var(--text-secondary)' }}>
                      {formatRatio(r.medianPeerRatio)}
                    </td>
                    <td className="text-right mono">{formatDeviation(r.peakDeviation)}</td>
                    <td className="text-right">
                      <span className="mono font-medium"
                            style={{ color: r.flagged ? riskColorVar('high') : 'var(--text-muted)' }}>
                        {formatCount(r.flagged)}
                      </span>
                      <span className="mono text-2xs text-content-muted"> / {formatCount(r.months)}</span>
                    </td>
                    <td className="text-center">
                      <ArrowRight className="w-3.5 h-3.5 text-content-muted inline" aria-hidden="true" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="text-xs text-content-muted">
        Peer ratio compares an agency’s cost against the median of similar-sized agencies in the same
        state. Peak deviation is the largest modified z-score observed, in median-absolute-deviation units.
      </p>
    </PageContainer>
  );
}
