import React, { useEffect, useState } from 'react';
import { RefreshCcw, ChevronRight, AlertTriangle } from 'lucide-react';
import { fetchCases, generateCases } from '../../api/liveClient';
import CaseStatusBadge from '../shared/CaseStatusBadge';
import { Panel, PanelHeader, LoadingState, EmptyState, ErrorState, SegmentedControl, RiskScore } from '../../components/ui';
import { formatScore } from '../../utils/format';

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'notice_drafted', label: 'Awaiting approval' },
  { value: 'sent', label: 'Sent' },
  { value: 'response_received', label: 'Responded' },
  { value: 'mp_verified', label: 'Verified' },
  { value: 'resolved', label: 'Resolved' },
];

export default function ClarificationQueue({ onSelectCase }) {
  const [state, setState] = useState({ cases: [], loading: true, error: null });
  const [filter, setFilter] = useState('ALL');
  const [scan, setScan] = useState({ running: false, message: null });

  async function load(status) {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchCases(status);
      setState({ cases: data || [], loading: false, error: null });
    } catch (err) {
      setState({ cases: [], loading: false, error: err.message });
    }
  }

  useEffect(() => { load(filter); }, [filter]);

  async function handleScan() {
    setScan({ running: true, message: null });
    try {
      const result = await generateCases();
      setScan({
        running: false,
        message: result.created > 0
          ? `${result.created} new case${result.created === 1 ? '' : 's'} detected.`
          : 'No agency crossed the detection threshold.',
      });
      load(filter);
    } catch (err) {
      setScan({ running: false, message: `Scan failed: ${err.message}` });
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Clarification queue"
        description="Auto-detected from risk-threshold breaches. Nothing reaches an agency until approved."
        actions={
          <button onClick={handleScan} disabled={scan.running} className="btn-default btn-sm">
            <RefreshCcw className={`w-3.5 h-3.5 ${scan.running ? 'animate-spin' : ''}`} aria-hidden="true" />
            {scan.running ? 'Scanning…' : 'Scan for new events'}
          </button>
        }
      />

      {scan.message && (
        <p className="text-sm text-content-secondary px-4 py-2.5 border-b border-line-subtle bg-bg-sunken" role="status">
          {scan.message}
        </p>
      )}

      <div className="px-4 py-2.5 border-b border-line-subtle overflow-x-auto">
        <SegmentedControl label="Case status filter" value={filter} onChange={setFilter} options={FILTERS} />
      </div>

      {state.loading ? (
        <LoadingState label="Loading cases" rows={4} />
      ) : state.error ? (
        <ErrorState
          title="Unable to load the case queue"
          detail={`The case service did not respond (${state.error}).`}
          onRetry={() => load(filter)}
        />
      ) : state.cases.length === 0 ? (
        <EmptyState
          title="No cases in this view"
          description={
            filter === 'ALL'
              ? 'No clarification cases have been raised yet. Run a scan to check for new risk events.'
              : 'No cases currently hold this status.'
          }
        />
      ) : (
        <ul className="divide-y divide-line-subtle">
          {state.cases.map((c) => (
            <li key={c.case_id}>
              <button
                onClick={() => onSelectCase(c.case_id)}
                className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-bg-elevated/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-medium text-content-primary truncate">{c.agency_name}</span>
                    <span className="mono text-xs text-content-muted">{c.case_id}</span>
                    {c.is_overdue && (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--risk-critical)' }} aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-xs text-content-muted mt-0.5 truncate">
                    {c.state}
                    <span className="mx-1.5 opacity-40">·</span>
                    {c.trigger.baseline_violated}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <RiskScore score={c.trigger.new_risk_score} size="sm" showLabel={false} />
                    <div className="mono text-2xs text-content-muted mt-0.5">
                      {formatScore(c.trigger.previous_risk_score)} → {formatScore(c.trigger.new_risk_score)}
                    </div>
                  </div>
                  <CaseStatusBadge status={c.status} outcome={c.resolution?.outcome} overdue={c.is_overdue} size="sm" />
                  <ChevronRight className="w-4 h-4 text-content-muted" aria-hidden="true" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
