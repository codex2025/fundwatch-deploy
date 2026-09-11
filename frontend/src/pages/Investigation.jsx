import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Copy, Check, Building2, ExternalLink } from 'lucide-react';
import { useWorkspace } from '../app/WorkspaceContext';
import {
  Panel, PanelHeader, RiskScore, LoadingState, ErrorState, EmptyState, EvidenceLink, cx,
} from '../components/ui';
import WhyFlagged from '../components/anomalies/WhyFlagged';
import SpendVelocityChart from '../components/analytics/SpendVelocityChart';
import WorksTable from '../components/data/WorksTable';
import CopilotBrief from '../components/investigation/CopilotBrief';
import PageContainer from '../components/layout/PageContainer';
import { fetchAgencyDetail, fetchAgencyWorks } from '../api/client';
import { formatINR, formatMonth, formatLocation, formatCount } from '../utils/format';

/**
 * Investigation workspace (DESIGN.md §16, §17).
 *
 * Ordered: identity & risk → why flagged → spending trajectory → evidence
 * records → analytical brief. Every claim above has a path to the record
 * below it.
 */
export default function Investigation() {
  const { anomalyId } = useParams();
  const navigate = useNavigate();
  const { anomalies, status, selected, setSelectedId, filtered } = useWorkspace();

  const evidenceRef = useRef(null);
  const timelineRef = useRef(null);

  // URL is the source of truth; keep workspace selection in step with it.
  useEffect(() => {
    if (anomalyId) setSelectedId(decodeURIComponent(anomalyId));
  }, [anomalyId, setSelectedId]);

  const anomaly = useMemo(() => {
    const id = anomalyId ? decodeURIComponent(anomalyId) : null;
    return (id && anomalies.find((a) => a.id === id)) || selected;
  }, [anomalyId, anomalies, selected]);

  const [detail, setDetail] = useState({ data: null, loading: true, error: null });
  const [works, setWorks] = useState({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!anomaly) return;
    let cancelled = false;

    setDetail({ data: null, loading: true, error: null });
    fetchAgencyDetail(anomaly.agencyId).then((res) => {
      if (cancelled) return;
      setDetail({ data: res.data, loading: false, error: res.data ? null : res.error });
    });

    setWorks({ data: [], loading: true, error: null });
    fetchAgencyWorks(anomaly.agencyId, anomaly.month).then((res) => {
      if (cancelled) return;
      // Fall back to the evidence already embedded in the anomaly record.
      const rows = res.data?.length ? res.data : anomaly.topWorks;
      setWorks({ data: rows, loading: false, error: rows.length ? null : res.error });
    });

    return () => { cancelled = true; };
  }, [anomaly]);

  const peers = useMemo(() => {
    if (!anomaly) return [];
    return anomalies
      .filter((a) => a.id !== anomaly.id && a.state === anomaly.state)
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
      .slice(0, 5);
  }, [anomalies, anomaly]);

  const queuePosition = useMemo(() => {
    if (!anomaly) return null;
    const ranked = [...filtered].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    const idx = ranked.findIndex((a) => a.id === anomaly.id);
    return idx >= 0 ? { index: idx, total: ranked.length, ranked } : null;
  }, [filtered, anomaly]);

  function goRelative(step) {
    if (!queuePosition) return;
    const next = queuePosition.ranked[queuePosition.index + step];
    if (next) navigate(`/investigation/${encodeURIComponent(next.id)}`);
  }

  if (status.loading) {
    return <PageContainer><Panel><LoadingState label="Loading case" rows={8} /></Panel></PageContainer>;
  }

  if (!anomaly) {
    return (
      <PageContainer>
        <Panel>
          <EmptyState
            title="No anomaly selected"
            description="Choose a record from the anomaly queue to open its investigation workspace."
            icon={FileText}
            action={<Link to="/anomalies" className="btn-accent btn-sm">Open the queue</Link>}
          />
        </Panel>
      </PageContainer>
    );
  }

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <PageContainer wide>
      {/* Identity & risk ------------------------------------------------ */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={() => navigate(-1)} className="btn-ghost btn-icon mt-0.5 shrink-0" aria-label="Go back">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight truncate">{anomaly.agencyName}</h1>
              <RiskScore score={anomaly.riskScore} insufficientHistory={anomaly.insufficientHistory} />
            </div>
            <p className="text-sm text-content-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="mono">{anomaly.agencyId}</span>
              <span className="opacity-40">·</span>
              <span>{formatLocation(anomaly.district, anomaly.constituency, anomaly.state)}</span>
              <span className="opacity-40">·</span>
              <span>Period {formatMonth(anomaly.month)}</span>
              <span className="opacity-40">·</span>
              <span className="mono text-2xs">{anomaly.id}</span>
            </p>
          </div>
        </div>

        {/* Queue context preserved across navigation */}
        {queuePosition && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-content-muted mono">
              {queuePosition.index + 1} of {formatCount(queuePosition.total)} in queue
            </span>
            <button className="btn-default btn-sm" onClick={() => goRelative(-1)} disabled={queuePosition.index === 0}>
              Previous
            </button>
            <button
              className="btn-default btn-sm"
              onClick={() => goRelative(1)}
              disabled={queuePosition.index >= queuePosition.total - 1}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Main column ------------------------------------------------- */}
        <div className="xl:col-span-2 space-y-3 min-w-0">
          <Panel>
            <PanelHeader
              title="Why this was flagged"
              description="Measured deviations, with the baseline each was measured against"
            />
            <WhyFlagged anomaly={anomaly} onShowEvidence={() => scrollTo(evidenceRef)} />
          </Panel>

          <div ref={timelineRef}>
            <Panel>
              <PanelHeader
                title="Spending trajectory"
                description="Monthly disbursement against this agency’s own baseline"
                actions={
                  detail.data?.months?.length ? (
                    <span className="text-xs text-content-muted mono">
                      {formatCount(detail.data.months.length)} months
                    </span>
                  ) : null
                }
              />
              {detail.loading ? (
                <LoadingState label="Loading timeline" rows={4} />
              ) : detail.error ? (
                <ErrorState
                  title="Unable to load the spending timeline"
                  detail={`The agency service did not respond (${detail.error}).`}
                />
              ) : (
                <SpendVelocityChart
                  months={detail.data.months}
                  baseline={detail.data.historicalMedian ?? anomaly.historicalMedian}
                  upperFence={detail.data.iqrUpperFence}
                  focusMonth={anomaly.month}
                />
              )}
            </Panel>
          </div>

          <div ref={evidenceRef}>
            <Panel>
              <PanelHeader
                title="Source records"
                description={`Sanctioned works disbursed in ${formatMonth(anomaly.month)}`}
              />
              {works.loading ? (
                <LoadingState label="Loading works" rows={4} />
              ) : works.data.length ? (
                <WorksTable works={works.data} />
              ) : (
                <EmptyState
                  title="No itemised works available"
                  description="The dataset does not carry work-level records for this agency-month."
                />
              )}
            </Panel>
          </div>
        </div>

        {/* Context rail ------------------------------------------------- */}
        <aside className="space-y-3 min-w-0">
          <CopilotBrief anomaly={anomaly} onShowEvidence={() => scrollTo(evidenceRef)} onShowTimeline={() => scrollTo(timelineRef)} />

          <Panel>
            <PanelHeader title="Financial summary" />
            <dl className="divide-y divide-line-subtle">
              <SummaryRow label="Disbursed this month" value={formatINR(anomaly.monthlyAmount)} strong />
              <SummaryRow label="Historical median" value={formatINR(anomaly.historicalMedian)} />
              <SummaryRow
                label="Works recorded"
                value={works.data.length ? formatCount(works.data.length) : '—'}
              />
              <SummaryRow
                label="Top-3 concentration"
                value={anomaly.concentrationPct != null ? `${anomaly.concentrationPct.toFixed(0)}%` : '—'}
              />
            </dl>
          </Panel>

          <Panel>
            <PanelHeader
              title="Comparable records"
              description={`Other flagged months in ${anomaly.state || 'this state'}`}
            />
            {peers.length ? (
              <ul className="divide-y divide-line-subtle">
                {peers.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/investigation/${encodeURIComponent(p.id)}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-elevated/60 transition-colors"
                    >
                      <RiskScore score={p.riskScore} insufficientHistory={p.insufficientHistory} size="sm" showLabel={false} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-content-primary truncate">{p.agencyName}</span>
                        <span className="block text-2xs text-content-muted">
                          {formatMonth(p.month)} · {formatINR(p.monthlyAmount)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-sm text-content-muted text-center">
                No comparable records in this state.
              </p>
            )}
            <div className="px-4 py-2.5 border-t border-line-subtle">
              <Link to="/agencies" className="text-xs inline-flex items-center gap-1.5" style={{ color: 'var(--accent-primary)' }}>
                <Building2 className="w-3 h-3" aria-hidden="true" /> Compare against peer agencies
              </Link>
            </div>
          </Panel>
        </aside>
      </div>
    </PageContainer>
  );
}

function SummaryRow({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <dt className="text-sm text-content-muted">{label}</dt>
      <dd className={cx('mono text-base', strong ? 'font-semibold text-content-primary' : 'text-content-secondary')}>
        {value}
      </dd>
    </div>
  );
}
