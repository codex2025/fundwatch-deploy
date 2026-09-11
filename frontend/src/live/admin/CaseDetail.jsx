import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, FileText, Pencil, Check, X, MessageSquare, Gavel,
  CheckCircle2, Flame, Eye, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { fetchCase, actOnNotice, resolveCase } from '../../api/liveClient';
import CaseStatusBadge from '../shared/CaseStatusBadge';
import AuditTimeline from '../shared/AuditTimeline';
import { Panel, PanelHeader, LoadingState, ErrorState, RiskScore } from '../../components/ui';
import { formatDateTime, formatMonth, formatScore } from '../../utils/format';

/**
 * Case workspace. The workflow -- draft → approve/edit/reject → agency
 * response → MP verification → admin resolution -- and every authorisation
 * boundary are unchanged. Restyled onto the token system.
 */
export default function CaseDetail({ caseId, onBack }) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function load() {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchCase(caseId);
      setState({ data, loading: false, error: null });
      setDraftText(data.notice.draft_text);
    } catch (err) {
      setState({ data: null, loading: false, error: err.message });
    }
  }

  useEffect(() => { load(); }, [caseId]);

  async function handleNoticeAction(action, text) {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await actOnNotice(caseId, action, text);
      setState({ data: updated, loading: false, error: null });
      setEditing(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(outcome) {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await resolveCase(caseId, outcome, resolveNotes);
      setState({ data: updated, loading: false, error: null });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (state.loading) {
    return <Panel><LoadingState label="Loading case" rows={6} /></Panel>;
  }

  if (state.error || !state.data) {
    return (
      <Panel>
        <ErrorState
          title="Unable to load this case"
          detail={`The case service did not respond (${state.error}).`}
          onRetry={load}
        />
      </Panel>
    );
  }

  const c = state.data;
  const canResolve = ['sent', 'response_received', 'mp_verified'].includes(c.status);
  const isTerminal = ['resolved', 'escalated', 'monitoring'].includes(c.status);

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="btn-ghost btn-sm -ml-2">
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to queue
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight truncate">{c.agency_name}</h1>
            <span className="mono text-xs text-content-muted">{c.case_id}</span>
          </div>
          <p className="text-sm text-content-muted mt-1">
            {c.state}
            <span className="mx-1.5 opacity-40">·</span>
            <span className="mono">{c.agency_id}</span>
          </p>
        </div>
        <CaseStatusBadge status={c.status} outcome={c.resolution?.outcome} overdue={c.is_overdue} />
      </div>

      {actionError && (
        <p
          role="alert"
          className="text-sm rounded border px-3 py-2"
          style={{ color: 'var(--risk-critical)', background: 'var(--risk-critical-surface)', borderColor: 'rgba(242,85,90,0.3)' }}
        >
          {actionError}
        </p>
      )}

      {/* Trigger ------------------------------------------------------- */}
      <Panel>
        <PanelHeader title="Why this case was created" />
        <div className="p-4 space-y-3">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <dt className="label-meta">Risk movement</dt>
              <dd className="flex items-center gap-1.5 mt-1">
                <span className="mono text-sm text-content-muted">{formatScore(c.trigger.previous_risk_score)}</span>
                <span className="text-content-muted" aria-hidden="true">→</span>
                <RiskScore score={c.trigger.new_risk_score} size="sm" showLabel={false} />
              </dd>
            </div>
            <div>
              <dt className="label-meta">Month flagged</dt>
              <dd className="mono text-base text-content-primary mt-1">{formatMonth(c.trigger.year_month)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="label-meta">Baseline violated</dt>
              <dd className="text-base text-content-secondary mt-1">{c.trigger.baseline_violated}</dd>
            </div>
          </dl>
          <p className="text-xs text-content-muted pt-3 border-t border-line-subtle flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" style={{ color: 'var(--risk-medium)' }} aria-hidden="true" />
            This reflects a statistical deviation from the agency’s own history. It is not a finding of wrongdoing.
          </p>
        </div>
      </Panel>

      {/* Notice --------------------------------------------------------- */}
      <Panel>
        <PanelHeader
          title="Explanation request"
          description={
            c.status === 'notice_drafted'
              ? 'Draft — not yet sent to the agency'
              : `Sent ${formatDateTime(c.notice.sent_at)}${c.notice.edited_by_admin ? ' (edited before sending)' : ''}`
          }
          actions={
            c.status === 'notice_drafted' && !editing && (
              <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
                <Pencil className="w-3 h-3" aria-hidden="true" /> Edit
              </button>
            )
          }
        />
        <div className="p-4 space-y-3">
          {editing ? (
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={14}
              aria-label="Notice draft text"
              className="field h-auto py-2 font-mono text-xs leading-relaxed"
            />
          ) : (
            <pre className="whitespace-pre-wrap mono text-xs text-content-secondary well p-3 max-h-96 scroll-y leading-relaxed">
              {c.notice.draft_text}
            </pre>
          )}

          {c.status === 'notice_drafted' && (
            <div className="flex flex-wrap gap-2">
              {editing ? (
                <>
                  <button disabled={busy} onClick={() => handleNoticeAction('edit', draftText)} className="btn-accent btn-sm">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Save edit
                  </button>
                  <button onClick={() => { setEditing(false); setDraftText(c.notice.draft_text); }} className="btn-ghost btn-sm">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button disabled={busy} onClick={() => handleNoticeAction('approve')} className="btn-accent btn-sm">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Approve and send
                  </button>
                  <button disabled={busy} onClick={() => handleNoticeAction('reject')} className="btn-danger btn-sm">
                    <X className="w-3.5 h-3.5" aria-hidden="true" /> Reject draft
                  </button>
                  <span className="text-xs text-content-muted self-center">
                    Rejecting dismisses the case without contacting the agency.
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* Agency response ------------------------------------------------ */}
      <Panel>
        <PanelHeader title="Agency response" />
        <div className="p-4">
          {c.agency_response.submitted_at ? (
            <div className="space-y-2.5">
              <p className="text-base text-content-secondary leading-relaxed">{c.agency_response.text}</p>
              {c.agency_response.documents?.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {c.agency_response.documents.map((d) => (
                    <li key={d} className="chip mono text-2xs">{d}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-content-muted">Submitted {formatDateTime(c.agency_response.submitted_at)}</p>
            </div>
          ) : (
            <p className="text-sm text-content-muted">Awaiting a response from the agency.</p>
          )}
        </div>
      </Panel>

      {/* MP verification ------------------------------------------------ */}
      <Panel>
        <PanelHeader title="MP verification" />
        <div className="p-4">
          {c.mp_verification.status !== 'pending' ? (
            <div className="space-y-1">
              <p className="text-base text-content-primary capitalize">
                {c.mp_verification.status.replace(/_/g, ' ')}
              </p>
              {c.mp_verification.notes && (
                <p className="text-sm text-content-secondary">{c.mp_verification.notes}</p>
              )}
              <p className="text-xs text-content-muted">
                {c.mp_verification.verified_by}
                <span className="mx-1.5 opacity-40">·</span>
                {formatDateTime(c.mp_verification.verified_at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-content-muted">Awaiting MP verification of the underlying work.</p>
          )}
        </div>
      </Panel>

      {/* Resolution ----------------------------------------------------- */}
      <Panel>
        <PanelHeader title="Resolution" description="Administrator decision, written to the audit trail" />
        <div className="p-4">
          {isTerminal ? (
            <div className="space-y-2">
              <CaseStatusBadge status={c.status} outcome={c.resolution?.outcome} />
              {c.resolution?.notes && <p className="text-base text-content-secondary">{c.resolution.notes}</p>}
              <p className="text-xs text-content-muted">
                {c.resolution?.resolved_by}
                <span className="mx-1.5 opacity-40">·</span>
                {formatDateTime(c.resolution?.resolved_at)}
              </p>
            </div>
          ) : canResolve ? (
            <div className="space-y-3">
              <label htmlFor="resolve-notes" className="label-meta block">Resolution notes</label>
              <textarea
                id="resolve-notes"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="How this was cross-checked with the MP and the agency…"
                rows={3}
                className="field h-auto py-2"
              />
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => handleResolve('resolved')} className="btn-accent btn-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Resolve
                </button>
                <button disabled={busy} onClick={() => handleResolve('monitoring')} className="btn-default btn-sm">
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Keep monitoring
                </button>
                <button disabled={busy} onClick={() => handleResolve('escalated')} className="btn-danger btn-sm">
                  <Flame className="w-3.5 h-3.5" aria-hidden="true" /> Escalate
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-content-muted">
              The notice must be approved and sent before a resolution can be recorded.
            </p>
          )}
        </div>
      </Panel>

      {/* Chain of custody ----------------------------------------------- */}
      <Panel>
        <PanelHeader title="Chain of custody" description="Every action recorded against this case" />
        <AuditTimeline caseId={caseId} refreshKey={refreshKey} compact />
      </Panel>
    </div>
  );
}
