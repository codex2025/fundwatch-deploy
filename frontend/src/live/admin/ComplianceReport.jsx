import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { fetchCompliance } from '../../api/liveClient';
import { Panel, PanelHeader, KpiCard, LoadingState, ErrorState, EmptyState } from '../../components/ui';
import { formatCount, formatPercent } from '../../utils/format';

function ScoreBar({ score }) {
  const color = score >= 80 ? 'var(--risk-low)' : score >= 50 ? 'var(--risk-medium)' : 'var(--risk-critical)';
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 h-1.5 rounded-sm bg-bg-inset overflow-hidden shrink-0">
        <span className="block h-full rounded-sm" style={{ width: `${Math.max(score, 3)}%`, background: color }} />
      </span>
      <span className="mono text-sm font-medium tabular" style={{ color }}>{score}%</span>
    </div>
  );
}

function Tri({ value, label }) {
  if (value === null || value === undefined) {
    return <><HelpCircle className="w-3.5 h-3.5 text-content-muted inline" aria-hidden="true" /><span className="sr-only">{label}: not applicable</span></>;
  }
  return value
    ? <><CheckCircle2 className="w-3.5 h-3.5 inline" style={{ color: 'var(--risk-low)' }} aria-hidden="true" /><span className="sr-only">{label}: yes</span></>
    : <><XCircle className="w-3.5 h-3.5 inline" style={{ color: 'var(--risk-critical)' }} aria-hidden="true" /><span className="sr-only">{label}: no</span></>;
}

export default function ComplianceReport() {
  const [state, setState] = useState({ rows: [], loading: true, error: null });

  useEffect(() => {
    fetchCompliance()
      .then((rows) => setState({ rows: rows || [], loading: false, error: null }))
      .catch((err) => setState({ rows: [], loading: false, error: err.message }));
  }, []);

  const { rows } = state;
  const withOpen = rows.filter((r) => r.open_cases > 0);
  const avgScore = rows.length ? Math.round(rows.reduce((s, r) => s + r.compliance_score, 0) / rows.length) : 0;
  const overdueCount = rows.filter((r) => r.overdue).length;
  const display = withOpen.length ? withOpen : rows.slice(0, 15);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Agencies tracked" value={formatCount(rows.length)} loading={state.loading} />
        <KpiCard label="Average compliance" value={formatPercent(avgScore, 0)} loading={state.loading} />
        <KpiCard
          label="Overdue responses"
          value={formatCount(overdueCount)}
          tone={overdueCount ? 'critical' : 'default'}
          loading={state.loading}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Process compliance"
          description="Whether each agency followed the required process — on-time response, documentation, MP verification. Independent of risk score."
        />

        {state.loading ? (
          <LoadingState label="Loading compliance" rows={5} />
        ) : state.error ? (
          <ErrorState
            title="Unable to load the compliance report"
            detail={`The compliance service did not respond (${state.error}). This report requires an administrator session.`}
          />
        ) : display.length === 0 ? (
          <EmptyState title="No compliance records" description="No agencies have been through the clarification process yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table density-default">
              <caption className="sr-only">Agency process compliance</caption>
              <thead>
                <tr>
                  <th scope="col">Agency</th>
                  <th scope="col" style={{ width: 160 }}>Compliance</th>
                  <th scope="col" className="text-right" style={{ width: 100 }}>Open cases</th>
                  <th scope="col" className="text-center" style={{ width: 110 }}>MP verified</th>
                  <th scope="col" className="text-center" style={{ width: 110 }}>Documents</th>
                  <th scope="col" className="text-center" style={{ width: 90 }}>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {display.map((r) => (
                  <tr key={r.agency_id}>
                    <td>
                      <div className="text-content-primary font-medium truncate max-w-[20rem]">{r.agency_name}</div>
                      <div className="text-xs text-content-muted">{r.state}</div>
                    </td>
                    <td><ScoreBar score={r.compliance_score} /></td>
                    <td className="text-right mono">{formatCount(r.open_cases)}</td>
                    <td className="text-center"><Tri value={r.mp_verified} label="MP verified" /></td>
                    <td className="text-center"><Tri value={r.documents_submitted} label="Documents submitted" /></td>
                    <td className="text-center">
                      {r.overdue
                        ? <span className="text-sm font-medium" style={{ color: 'var(--risk-critical)' }}>Yes</span>
                        : <span className="text-sm text-content-muted">No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
