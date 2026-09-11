import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchCases, submitMPVerification } from '../../api/liveClient';
import CaseStatusBadge from '../shared/CaseStatusBadge';
import { Panel, PanelHeader, LoadingState, ErrorState, EmptyState, cx } from '../../components/ui';

const VERIFY_OPTIONS = [
  { key: 'verified', label: 'Verified', Icon: CheckCircle2, color: 'var(--risk-low)' },
  { key: 'not_verified', label: 'Not verified', Icon: XCircle, color: 'var(--risk-critical)' },
  { key: 'needs_clarification', label: 'Needs clarification', Icon: HelpCircle, color: 'var(--risk-medium)' },
];

function CaseRow({ c, onVerified }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const pending = c.mp_verification.status === 'pending';

  async function handleVerify(status) {
    setBusy(true);
    setError(null);
    try {
      await submitMPVerification(c.case_id, status, notes);
      onVerified();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border-b border-line-subtle last:border-0">
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-elevated/60 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-medium text-content-primary truncate">{c.agency_name}</span>
            <span className="mono text-xs text-content-muted">{c.case_id}</span>
          </div>
          <p className="text-xs text-content-muted mt-0.5 truncate">
            {c.state}
            <span className="mx-1.5 opacity-40">·</span>
            {c.trigger.baseline_violated}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CaseStatusBadge status={c.status} outcome={c.resolution?.outcome} size="sm" />
          {expanded
            ? <ChevronUp className="w-4 h-4 text-content-muted" aria-hidden="true" />
            : <ChevronDown className="w-4 h-4 text-content-muted" aria-hidden="true" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {c.agency_response.submitted_at ? (
            <div className="well p-3">
              <div className="label-meta mb-1">Agency explanation</div>
              <p className="text-sm text-content-secondary leading-relaxed">{c.agency_response.text}</p>
            </div>
          ) : (
            <p className="text-sm text-content-muted">The agency has not yet submitted an explanation.</p>
          )}

          {pending ? (
            <>
              <div>
                <label htmlFor={`notes-${c.case_id}`} className="label-meta block mb-1.5">
                  Verification notes
                </label>
                <textarea
                  id={`notes-${c.case_id}`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Site visit findings, physical confirmation of the work…"
                  rows={3}
                  className="field h-auto py-2"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-sm rounded border px-3 py-2"
                  style={{ color: 'var(--risk-critical)', background: 'var(--risk-critical-surface)', borderColor: 'rgba(242,85,90,0.3)' }}
                >
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {VERIFY_OPTIONS.map(({ key, label, Icon, color }) => (
                  <button
                    key={key}
                    disabled={busy}
                    onClick={() => handleVerify(key)}
                    className="btn btn-sm border"
                    style={{ color, borderColor: `${color}55`, background: `${color}14` }}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-content-secondary">
              <span className="text-content-muted">Your verification: </span>
              <span className="capitalize font-medium text-content-primary">
                {c.mp_verification.status.replace(/_/g, ' ')}
              </span>
              {c.mp_verification.notes && <span className="text-content-muted"> — {c.mp_verification.notes}</span>}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function MPPortal() {
  const [state, setState] = useState({ cases: [], loading: true, error: null });

  async function load() {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchCases('ALL');
      // Drafts have not been approved for sending, so they are not visible here.
      setState({ cases: (data || []).filter((c) => c.status !== 'notice_drafted'), loading: false, error: null });
    } catch (err) {
      setState({ cases: [], loading: false, error: err.message });
    }
  }

  useEffect(() => { load(); }, []);

  if (state.loading) return <Panel><LoadingState label="Loading cases" rows={4} /></Panel>;

  if (state.error) {
    return (
      <Panel>
        <ErrorState
          title="Unable to load cases"
          detail={`The case service did not respond (${state.error}).`}
          onRetry={load}
        />
      </Panel>
    );
  }

  const pending = state.cases.filter((c) => c.mp_verification.status === 'pending');
  const reviewed = state.cases.filter((c) => c.mp_verification.status !== 'pending');

  return (
    <div className="space-y-3">
      <Panel>
        <PanelHeader
          title={`Awaiting your verification (${pending.length})`}
          description="Confirm whether the flagged work was physically carried out. The administrator still cross-checks and closes the case."
        />
        {pending.length === 0 ? (
          <EmptyState title="Nothing pending" description="No cases currently need your verification." />
        ) : (
          <ul>{pending.map((c) => <CaseRow key={c.case_id} c={c} onVerified={load} />)}</ul>
        )}
      </Panel>

      {reviewed.length > 0 && (
        <Panel>
          <PanelHeader title={`Previously reviewed (${reviewed.length})`} />
          <ul>{reviewed.map((c) => <CaseRow key={c.case_id} c={c} onVerified={load} />)}</ul>
        </Panel>
      )}
    </div>
  );
}
