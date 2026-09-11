import React, { useEffect, useState } from 'react';
import { Landmark, CheckCircle2, XCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchCases, submitMPVerification } from '../../api/liveClient';
import CaseStatusBadge from '../shared/CaseStatusBadge';

const VERIFY_OPTIONS = [
  { key: 'verified', label: 'Verified', Icon: CheckCircle2, classes: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30' },
  { key: 'not_verified', label: 'Not Verified', Icon: XCircle, classes: 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30' },
  { key: 'needs_clarification', label: 'Needs Clarification', Icon: HelpCircle, classes: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30' },
];

function WorkRow({ c, onVerified }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = c.mp_verification.status === 'pending';

  async function handleVerify(status) {
    setBusy(true);
    try {
      await submitMPVerification(c.case_id, status, notes);
      onVerified();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card-hover p-4">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between gap-3 text-left min-h-[36px]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-100">{c.agency_name}</span>
            <span className="text-[11px] font-mono text-slate-500">{c.case_id}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{c.state} &middot; Flagged for {c.trigger.baseline_violated.toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CaseStatusBadge status={c.status} outcome={c.resolution?.outcome} size="sm" />
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-surface-border space-y-3">
          {c.agency_response.submitted_at ? (
            <div className="text-xs text-slate-300 bg-surface-sunken border border-surface-border rounded-xl p-3">
              <span className="text-slate-500">Agency's explanation: </span>{c.agency_response.text}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">The agency has not yet submitted an explanation.</p>
          )}

          {pending ? (
            <>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes from your verification (e.g. site visit findings)..."
                rows={2}
                className="input-field"
              />
              <div className="flex flex-wrap gap-2">
                {VERIFY_OPTIONS.map(({ key, label, Icon, classes }) => (
                  <button
                    key={key}
                    disabled={busy}
                    onClick={() => handleVerify(key)}
                    className={`btn border ${classes}`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-300">
              <span className="text-slate-500">Your verification: </span>
              <span className="capitalize font-semibold">{c.mp_verification.status.replace('_', ' ')}</span>
              {c.mp_verification.notes && <span className="text-slate-400"> &mdash; {c.mp_verification.notes}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MPPortal() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchCases('ALL');
      setCases((data || []).filter((c) => c.status !== 'notice_drafted'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const needsVerification = cases.filter((c) => c.mp_verification.status === 'pending');
  const verified = cases.filter((c) => c.mp_verification.status !== 'pending');

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Landmark className="w-4 h-4" />
          </div>
          <h2 className="page-title text-lg sm:text-xl">MP Constituency Oversight</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          Verify whether flagged works were actually carried out. This confirms physical delivery &mdash; the Admin still cross-checks and resolves the case.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 font-mono">Loading...</div>
      ) : (
        <>
          <div>
            <h3 className="section-label mb-2">Awaiting Your Verification ({needsVerification.length})</h3>
            <div className="space-y-3">
              {needsVerification.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Nothing pending right now.</p>
              ) : needsVerification.map((c) => <WorkRow key={c.case_id} c={c} onVerified={load} />)}
            </div>
          </div>

          {verified.length > 0 && (
            <div>
              <h3 className="section-label mb-2 mt-6">Previously Reviewed ({verified.length})</h3>
              <div className="space-y-3">
                {verified.map((c) => <WorkRow key={c.case_id} c={c} onVerified={load} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
