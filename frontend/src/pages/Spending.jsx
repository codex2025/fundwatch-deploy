import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { useWorkspace } from '../app/WorkspaceContext';
import { Panel, PanelHeader, KpiCard, LoadingState, EmptyState, RiskScore, ErrorState } from '../components/ui';
import SpendVelocityChart from '../components/analytics/SpendVelocityChart';
import PageContainer from '../components/layout/PageContainer';
import { fetchAgencyDetail } from '../api/client';
import { formatINR, formatAxisINR, formatMonth, formatRatio, formatCount } from '../utils/format';
import { riskColorVar } from '../utils/risk';

/**
 * Spending intelligence (DESIGN.md §13).
 *
 * Two questions: when did money move unusually across the portfolio, and for a
 * chosen agency, when did its own behaviour change?
 */
export default function Spending() {
  const { anomalies, filtered, status, setSelectedId } = useWorkspace();
  const navigate = useNavigate();
  const [agencyId, setAgencyId] = useState('');
  const [detail, setDetail] = useState({ data: null, loading: false, error: null });

  // Highest-risk agency makes the most useful default subject.
  const agencyOptions = useMemo(() => {
    const byAgency = new Map();
    for (const a of anomalies) {
      const cur = byAgency.get(a.agencyId);
      if (!cur || (a.riskScore ?? 0) > (cur.riskScore ?? 0)) byAgency.set(a.agencyId, a);
    }
    return [...byAgency.values()].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
  }, [anomalies]);

  useEffect(() => {
    if (!agencyId && agencyOptions.length) setAgencyId(agencyOptions[0].agencyId);
  }, [agencyOptions, agencyId]);

  useEffect(() => {
    if (!agencyId) return;
    let cancelled = false;
    setDetail({ data: null, loading: true, error: null });
    fetchAgencyDetail(agencyId).then((res) => {
      if (cancelled) return;
      setDetail({ data: res.data, loading: false, error: res.data ? null : res.error });
    });
    return () => { cancelled = true; };
  }, [agencyId]);

  const focus = useMemo(
    () => agencyOptions.find((a) => a.agencyId === agencyId) ?? null,
    [agencyOptions, agencyId]
  );

  /** Portfolio-wide monthly totals, to spot system-level timing patterns. */
  const monthly = useMemo(() => {
    const byMonth = new Map();
    for (const a of anomalies) {
      if (!a.month) continue;
      const cur = byMonth.get(a.month) ?? { month: a.month, spend: 0, records: 0, flagged: 0 };
      cur.spend += a.monthlyAmount ?? 0;
      cur.records += 1;
      if ((a.riskScore ?? 0) >= 70) cur.flagged += 1;
      byMonth.set(a.month, cur);
    }
    return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [anomalies]);

  const fiscalYearEnd = useMemo(() => {
    // March is the Indian fiscal year end; compare it against other months.
    const march = monthly.filter((m) => m.month.endsWith('-03'));
    const others = monthly.filter((m) => !m.month.endsWith('-03'));
    const avg = (arr) => (arr.length ? arr.reduce((s, m) => s + m.spend, 0) / arr.length : 0);
    const marchAvg = avg(march);
    const otherAvg = avg(others);
    return {
      marchAvg,
      otherAvg,
      ratio: otherAvg > 0 ? marchAvg / otherAvg : null,
      monthCount: march.length,
    };
  }, [monthly]);

  const highVelocity = useMemo(
    () => filtered.filter((a) => (a.signals.velocity_ratio ?? 0) >= 3)
      .sort((a, b) => (b.signals.velocity_ratio ?? 0) - (a.signals.velocity_ratio ?? 0))
      .slice(0, 8),
    [filtered]
  );

  const totalSpend = monthly.reduce((s, m) => s + m.spend, 0);
  const peak = monthly.reduce((best, m) => (m.spend > (best?.spend ?? 0) ? m : best), null);

  if (status.loading) {
    return <PageContainer><Panel><LoadingState label="Loading spending data" rows={8} /></Panel></PageContainer>;
  }

  return (
    <PageContainer
      title="Spending intelligence"
      description="Disbursement trajectory across the portfolio and against each agency’s own baseline."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Total disbursed" value={formatINR(totalSpend)} context={`${formatCount(monthly.length)} reporting months`} />
        <KpiCard
          label="Peak month"
          value={peak ? formatINR(peak.spend) : '—'}
          context={peak ? formatMonth(peak.month) : undefined}
        />
        <KpiCard
          label="Fiscal year-end ratio"
          value={fiscalYearEnd.ratio ? formatRatio(fiscalYearEnd.ratio) : '—'}
          tone={fiscalYearEnd.ratio >= 2 ? 'high' : 'default'}
          context={`March average vs other months (${fiscalYearEnd.monthCount} Marches)`}
        />
        <KpiCard
          label="Records above 3× pace"
          value={formatCount(anomalies.filter((a) => (a.signals.velocity_ratio ?? 0) >= 3).length)}
          tone="high"
          context="velocity threshold for review"
        />
      </div>

      {/* Portfolio timing */}
      <Panel>
        <PanelHeader
          title="Portfolio disbursement by month"
          description="Total across all monitored agencies. March bars are highlighted — fiscal year-end concentration is a known pattern in public spending."
        />
        {monthly.length ? (
          <div className="p-4 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="month" tickFormatter={formatMonth} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} minTickGap={28} />
                <YAxis tickFormatter={formatAxisINR} axisLine={false} tickLine={false} width={62} />
                <Tooltip
                  cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-bg-elevated border border-line rounded shadow-overlay p-3 text-sm">
                        <div className="font-semibold text-content-primary mb-1.5">{formatMonth(d.month)}</div>
                        <div className="mono">{formatINR(d.spend)}</div>
                        <div className="text-xs text-content-muted mt-1">
                          {formatCount(d.records)} records · {formatCount(d.flagged)} flagged
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="spend" radius={[2, 2, 0, 0]}>
                  {monthly.map((m) => (
                    <Cell
                      key={m.month}
                      fill={m.month.endsWith('-03') ? riskColorVar('medium') : 'var(--border-strong)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 px-2 text-xs text-content-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 rounded-sm" style={{ background: 'var(--border-strong)' }} aria-hidden="true" />
                Regular month
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 rounded-sm" style={{ background: riskColorVar('medium') }} aria-hidden="true" />
                March (fiscal year end)
              </span>
            </div>
          </div>
        ) : (
          <EmptyState title="No monthly data" description="No reporting months in the current dataset." />
        )}
      </Panel>

      {/* Single-agency trajectory */}
      <Panel>
        <PanelHeader
          title="Agency trajectory"
          description={focus ? `${focus.agencyName} — cumulative spend against its own baseline` : 'Select an agency'}
          actions={
            <select
              className="field w-auto max-w-[18rem]"
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              aria-label="Select agency"
            >
              {agencyOptions.map((a) => (
                <option key={a.agencyId} value={a.agencyId}>
                  {a.agencyName} ({a.riskScore?.toFixed(0) ?? '—'})
                </option>
              ))}
            </select>
          }
        />
        {detail.loading ? (
          <LoadingState label="Loading trajectory" rows={5} />
        ) : detail.error ? (
          <ErrorState title="Unable to load this agency’s timeline" detail={`The agency service did not respond (${detail.error}).`} />
        ) : detail.data ? (
          <SpendVelocityChart
            months={detail.data.months}
            baseline={detail.data.historicalMedian ?? focus?.historicalMedian}
            upperFence={detail.data.iqrUpperFence}
            focusMonth={focus?.month}
            height={300}
          />
        ) : (
          <EmptyState title="No agency selected" />
        )}
      </Panel>

      {/* Velocity leaderboard */}
      <Panel>
        <PanelHeader
          title="Fastest-moving records"
          description="Where disbursement most exceeded the agency’s own typical pace"
        />
        {highVelocity.length ? (
          <ul className="divide-y divide-line-subtle">
            {highVelocity.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => { setSelectedId(a.id); navigate(`/investigation/${encodeURIComponent(a.id)}`); }}
                  className="w-full flex items-center gap-4 px-4 py-2.5 text-left hover:bg-bg-elevated/60 transition-colors"
                >
                  <span className="mono text-lg font-semibold w-16 shrink-0" style={{ color: riskColorVar('high') }}>
                    {formatRatio(a.signals.velocity_ratio)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base text-content-primary truncate">{a.agencyName}</span>
                    <span className="block text-xs text-content-muted">
                      {formatMonth(a.month)} · {formatINR(a.monthlyAmount)} vs baseline {formatINR(a.historicalMedian)}
                    </span>
                  </span>
                  <RiskScore score={a.riskScore} insufficientHistory={a.insufficientHistory} size="sm" showLabel={false} />
                  <ArrowRight className="w-3.5 h-3.5 text-content-muted shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No records above 3× pace" description="No agency-month in the current filter set exceeded three times its baseline." />
        )}
      </Panel>
    </PageContainer>
  );
}
