import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, FileText, Pencil, Check, X, MessageSquare, Gavel,
  CheckCircle2, Flame, Eye, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { fetchCase, actOnNotice, resolveCase } from '../../api/liveClient';
import CaseStatusBadge from '../shared/CaseStatusBadge';
import AuditTimeline from '../shared/AuditTimeline';

function inr(n) {
  if (n === null || n === undefined) return '--';
  return `Rs ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function CaseDetail({ caseId, onBack }) {
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchCase(caseId);
      setC(data);
      setDraftText(data.notice.draft_text);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [caseId]);

  async function handleNoticeAction(action, text) {
    setBusy(true);
    try {
      const updated = await actOnNotice(caseId, action, text);
      setC(updated);
      setEditing(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(outcome) {
    if (!window.confirm(`Mark this case as "${outcome}"?`)) return;
    setBusy(true);
    try {
      const updated = await resolveCase(caseId, outcome, resolveNotes);
      setC(updated);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !c) {
    return <div className="p-8 text-center text-xs text-slate-500 font-mono">Loading case...</div>;
  }

  const canResolve = ['sent', 'response_received', 'mp_verified'].includes(c.status);
  const isTerminal = ['resolved', 'escalated', 'monitoring'].includes(c.status);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors duration-200">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to queue
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="page-title text-lg sm:text-xl">{c.agency_name}</h2>
            <span className="text-[11px] font-mono text-slate-500">{c.case_id}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{c.state} &middot; {c.agency_id}</p>
        </div>
        <CaseStatusBadge status={c.status} outcome={c.resolution?.outcome} overdue={c.is_overdue} />
      </div>

      {/* Trigger */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="section-label flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Why this case was created
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-500">Risk score</div>
            <div className="font-mono font-bold text-red-400 tabular-nums">
              {c.trigger.previous_risk_score.toFixed(0)} &rarr; {c.trigger.new_risk_score.toFixed(0)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Month flagged</div>
            <div className="font-mono text-slate-200">{c.trigger.year_month}</div>
          </div>
          <div className="col-span-2">
            <div className="text-slate-500">Baseline violated</div>
            <div className="text-slate-200">{c.trigger.baseline_violated}</div>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 pt-2 border-t border-surface-border">
          This reflects a statistical deviation from the agency's own history only &mdash; it is not a finding of wrongdoing.
        </p>
      </div>

      {/* Notice */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="section-label flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-sky-400" /> Explanation Request Notice
          </h3>
          {c.status === 'notice_drafted' && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors duration-200">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={12}
            className="input-field font-mono"
          />
        ) : (
          <pre className="whitespace-pre-wrap text-xs font-mono text-slate-300 bg-surface-sunken border border-surface-border rounded-xl p-3.5 max-h-96 overflow-y-auto">
            {c.notice.draft_text}
          </pre>
        )}

        {c.status === 'notice_drafted' ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {editing ? (
              <>
                <button
                  disabled={busy}
                  onClick={() => handleNoticeAction('edit', draftText)}
                  className="btn-secondary"
                >
                  <Check className="w-3.5 h-3.5" /> Save Edit
                </button>
                <button onClick={() => { setEditing(false); setDraftText(c.notice.draft_text); }} className="btn-ghost">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  disabled={busy}
                  onClick={() => handleNoticeAction('approve')}
                  className="btn-success"
                >
                  <Check className="w-3.5 h-3.5" /> Approve &amp; Send
                </button>
                <button
                  disabled={busy}
                  onClick={() => { if (window.confirm('Reject this draft and dismiss the case without contacting the agency?')) handleNoticeAction('reject'); }}
                  className="btn-danger"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            Sent {new Date(c.notice.sent_at).toLocaleString()}{c.notice.edited_by_admin ? ' (edited by admin before sending)' : ''}
          </p>
        )}
      </div>

      {/* Agency response */}
      <div className="glass-card p-5 space-y-2.5">
        <h3 className="section-label flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Agency Response
        </h3>
        {c.agency_response.submitted_at ? (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-300">{c.agency_response.text}</p>
            {c.agency_response.documents.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {c.agency_response.documents.map((d) => (
                  <span key={d} className="glass-pill px-2.5 py-1 text-[10px] text-slate-300 font-mono">{d}</span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-500">Submitted {new Date(c.agency_response.submitted_at).toLocaleString()}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">Awaiting response from the agency.</p>
        )}
      </div>

      {/* MP verification */}
      <div className="glass-card p-5 space-y-2">
        <h3 className="section-label flex items-center gap-1.5">
          <Gavel className="w-3.5 h-3.5 text-amber-400" /> MP Verification
        </h3>
        {c.mp_verification.status !== 'pending' ? (
          <div className="space-y-1">
            <p className="text-xs text-slate-300 capitalize">{c.mp_verification.status.replace('_', ' ')}</p>
            {c.mp_verification.notes && <p className="text-xs text-slate-400">{c.mp_verification.notes}</p>}
            <p className="text-[11px] text-slate-500">by {c.mp_verification.verified_by} &middot; {new Date(c.mp_verification.verified_at).toLocaleString()}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">Awaiting MP verification of the underlying work.</p>
        )}
      </div>

      {/* Resolution */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="section-label flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Admin Resolution
        </h3>
        {isTerminal ? (
          <div className="space-y-1">
            <CaseStatusBadge status={c.status} outcome={c.resolution?.outcome} />
            {c.resolution.notes && <p className="text-xs text-slate-300 mt-2">{c.resolution.notes}</p>}
            <p className="text-[11px] text-slate-500">by {c.resolution.resolved_by} &middot; {new Date(c.resolution.resolved_at).toLocaleString()}</p>
          </div>
        ) : canResolve ? (
          <div className="space-y-3">
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Notes on how this was cross-checked with the MP and agency..."
              rows={2}
              className="input-field"
            />
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => handleResolve('resolved')} className="btn-success">
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
              </button>
              <button disabled={busy} onClick={() => handleResolve('monitoring')} className="btn bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30">
                <Eye className="w-3.5 h-3.5" /> Keep Monitoring
              </button>
              <button disabled={busy} onClick={() => handleResolve('escalated')} className="btn-danger">
                <Flame className="w-3.5 h-3.5" /> Escalate
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">Approve and send the notice before a resolution can be recorded.</p>
        )}
      </div>

      {/* Audit trail */}
      <div className="glass-card p-5">
        <h3 className="section-label mb-3">Chain of Custody</h3>
        <AuditTimeline caseId={caseId} refreshKey={refreshKey} compact />
      </div>
    </div>
  );
}
