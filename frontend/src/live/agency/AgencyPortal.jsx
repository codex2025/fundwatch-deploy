import React, { useEffect, useState } from 'react';
import { Building2, FileText, Paperclip, Send, ShieldCheck, Gavel, X } from 'lucide-react';
import { fetchCases, submitAgencyResponse } from '../../api/liveClient';
import { useAuth } from '../auth/AuthContext';
import CaseStatusBadge from '../shared/CaseStatusBadge';

const MOCK_DOC_OPTIONS = ['bills.pdf', 'completion_certificate.pdf', 'geo_tagged_photos.zip', 'measurement_book.pdf', 'approval_letter.pdf'];

export default function AgencyPortal() {
  const { agencyId } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchCases('ALL');
      setCases(data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const myCase = cases.find((c) => c.agency_id === agencyId);

  function toggleDoc(d) {
    setDocs((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleSubmit() {
    if (!text.trim()) { alert('Please describe what happened before submitting.'); return; }
    setBusy(true);
    try {
      await submitAgencyResponse(myCase.case_id, text, docs);
      setText('');
      setDocs([]);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Building2 className="w-4 h-4" />
          </div>
          <h2 className="page-title text-lg sm:text-xl">Agency Portal</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">Submit works, respond to clarification requests, and track your own risk and compliance status.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 font-mono">Loading...</div>
      ) : !myCase ? (
        <div className="glass-card p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm text-slate-200 font-semibold">No active cases</p>
          <p className="text-xs text-slate-500 mt-1">This agency's spending is within its expected baseline.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-100 font-display">{myCase.case_id} &middot; {myCase.agency_name}</h3>
            <CaseStatusBadge status={myCase.status} outcome={myCase.resolution?.outcome} overdue={myCase.is_overdue} />
          </div>

          {myCase.status === 'notice_drafted' ? (
            <div className="glass-card p-4 text-xs text-slate-400 italic">
              A risk event was detected but the notice is still awaiting Admin approval &mdash; nothing has been sent to you yet.
            </div>
          ) : (
            <>
              <div className="glass-card p-4 space-y-2">
                <h4 className="section-label flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" /> Notice Received
                </h4>
                <pre className="whitespace-pre-wrap text-xs font-mono text-slate-300 bg-surface-sunken border border-surface-border rounded-xl p-3 max-h-72 overflow-y-auto">
                  {myCase.notice.draft_text}
                </pre>
                {myCase.is_overdue && (
                  <p className="text-xs text-red-400 font-semibold">This response is overdue &mdash; please submit an explanation as soon as possible.</p>
                )}
              </div>

              {myCase.agency_response.submitted_at ? (
                <div className="glass-card p-4 space-y-2">
                  <h4 className="section-label flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-400" /> Your Submitted Response
                  </h4>
                  <p className="text-xs text-slate-300">{myCase.agency_response.text}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {myCase.agency_response.documents.map((d) => (
                      <span key={d} className="px-2 py-0.5 rounded-full bg-surface-raised border border-surface-border text-[10px] text-slate-300 font-mono">{d}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="glass-card p-4 space-y-3">
                  <h4 className="section-label">Submit Your Explanation</h4>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    placeholder="Explain the spending pattern flagged above..."
                    className="input-field"
                  />
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attach supporting documents (mock)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MOCK_DOC_OPTIONS.map((d) => (
                        <button
                          key={d}
                          onClick={() => toggleDoc(d)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono border transition-colors duration-200 min-h-[32px] ${
                            docs.includes(d) ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-surface-raised text-slate-400 border-surface-border hover:text-slate-200 hover:border-surface-borderHover'
                          }`}
                        >
                          {docs.includes(d) ? <X className="w-2.5 h-2.5 inline mr-1" /> : null}{d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button disabled={busy} onClick={handleSubmit} className="btn-primary">
                    <Send className="w-3.5 h-3.5" /> Submit Response
                  </button>
                </div>
              )}

              {myCase.mp_verification.status !== 'pending' && (
                <div className="glass-card p-4 space-y-1">
                  <h4 className="section-label flex items-center gap-1.5">
                    <Gavel className="w-3.5 h-3.5 text-amber-400" /> MP Verification
                  </h4>
                  <p className="text-xs text-slate-300 capitalize">{myCase.mp_verification.status.replace('_', ' ')}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
