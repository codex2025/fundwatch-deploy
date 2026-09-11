import React, { useEffect, useState } from 'react';
import { FileText, Paperclip, Send, ShieldCheck, Check } from 'lucide-react';
import { fetchCases, submitAgencyResponse } from '../../api/liveClient';
import { useAuth } from '../auth/AuthContext';
import CaseStatusBadge from '../shared/CaseStatusBadge';
import { Panel, PanelHeader, LoadingState, ErrorState, EmptyState, cx } from '../../components/ui';
import { formatDate } from '../../utils/format';

/** Placeholder document names for the demo submission flow. */
const DOC_OPTIONS = [
  'bills.pdf',
  'completion_certificate.pdf',
  'geo_tagged_photos.zip',
  'measurement_book.pdf',
  'approval_letter.pdf',
];

export default function AgencyPortal() {
  const { agencyId } = useAuth();
  const [state, setState] = useState({ cases: [], loading: true, error: null });
  const [text, setText] = useState('');
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  async function load() {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchCases('ALL');
      setState({ cases: data || [], loading: false, error: null });
    } catch (err) {
      setState({ cases: [], loading: false, error: err.message });
    }
  }

  useEffect(() => { load(); }, []);

  // The API already scopes results to this agency; this is a display guard.
  const myCase = state.cases.find((c) => c.agency_id === agencyId) ?? state.cases[0];

  function toggleDoc(d) {
    setDocs((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) {
      setSubmitError('Please describe the spending pattern before submitting.');
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      await submitAgencyResponse(myCase.case_id, text, docs);
      setText('');
      setDocs([]);
      await load();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (state.loading) return <Panel><LoadingState label="Loading your cases" rows={4} /></Panel>;

  if (state.error) {
    return (
      <Panel>
        <ErrorState
          title="Unable to load your cases"
          detail={`The case service did not respond (${state.error}).`}
          onRetry={load}
        />
      </Panel>
    );
  }

  if (!myCase) {
    return (
      <Panel>
        <EmptyState
          icon={ShieldCheck}
          title="No active cases"
          description="This agency’s spending is within its expected baseline. Nothing requires a response."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {myCase.agency_name}
          <span className="mono text-xs text-content-muted ml-2">{myCase.case_id}</span>
        </h2>
        <CaseStatusBadge status={myCase.status} outcome={myCase.resolution?.outcome} overdue={myCase.is_overdue} />
      </div>

      {myCase.status === 'notice_drafted' ? (
        <Panel>
          <EmptyState
            title="Nothing has been sent to you yet"
            description="A risk event was detected, but the notice is still awaiting administrator approval. No response is required at this stage."
          />
        </Panel>
      ) : (
        <>
          <Panel>
            <PanelHeader
              title="Notice received"
              description={
                myCase.notice.deadline
                  ? `Response due ${formatDate(myCase.notice.deadline)}`
                  : undefined
              }
            />
            <div className="p-4 space-y-3">
              <pre className="whitespace-pre-wrap mono text-xs text-content-secondary well p-3 max-h-72 scroll-y leading-relaxed">
                {myCase.notice.draft_text}
              </pre>
              {myCase.is_overdue && (
                <p className="text-sm font-medium" style={{ color: 'var(--risk-critical)' }} role="alert">
                  This response is overdue. Please submit an explanation as soon as possible.
                </p>
              )}
            </div>
          </Panel>

          {myCase.agency_response.submitted_at ? (
            <Panel>
              <PanelHeader title="Your submitted response" />
              <div className="p-4 space-y-2.5">
                <p className="text-base text-content-secondary leading-relaxed">{myCase.agency_response.text}</p>
                {myCase.agency_response.documents?.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {myCase.agency_response.documents.map((d) => (
                      <li key={d} className="chip mono text-2xs">{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>
          ) : (
            <Panel>
              <PanelHeader
                title="Submit your explanation"
                description="Describe what drove the flagged expenditure and attach supporting records."
              />
              <form onSubmit={handleSubmit} className="p-4 space-y-3">
                <div>
                  <label htmlFor="agency-response" className="label-meta block mb-1.5">Explanation</label>
                  <textarea
                    id="agency-response"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    placeholder="For example: three works reached financial completion in the same reporting month…"
                    className="field h-auto py-2"
                  />
                </div>

                <fieldset>
                  <legend className="label-meta flex items-center gap-1.5 mb-1.5">
                    <Paperclip className="w-3 h-3" aria-hidden="true" /> Supporting documents
                  </legend>
                  <div className="flex flex-wrap gap-1.5">
                    {DOC_OPTIONS.map((d) => {
                      const on = docs.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleDoc(d)}
                          className={cx('chip mono text-2xs transition-colors', on && 'font-semibold')}
                          style={on ? {
                            color: 'var(--accent-primary)',
                            background: 'var(--accent-surface)',
                            borderColor: 'var(--accent-border)',
                          } : undefined}
                        >
                          {on && <Check className="w-2.5 h-2.5" aria-hidden="true" />}
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {submitError && (
                  <p
                    role="alert"
                    className="text-sm rounded border px-3 py-2"
                    style={{ color: 'var(--risk-critical)', background: 'var(--risk-critical-surface)', borderColor: 'rgba(242,85,90,0.3)' }}
                  >
                    {submitError}
                  </p>
                )}

                <button type="submit" disabled={busy} className="btn-accent btn-sm">
                  <Send className="w-3.5 h-3.5" aria-hidden="true" /> {busy ? 'Submitting…' : 'Submit response'}
                </button>
              </form>
            </Panel>
          )}

          {myCase.mp_verification.status !== 'pending' && (
            <Panel>
              <PanelHeader title="MP verification" />
              <div className="p-4">
                <p className="text-base text-content-primary capitalize">
                  {myCase.mp_verification.status.replace(/_/g, ' ')}
                </p>
                {myCase.mp_verification.notes && (
                  <p className="text-sm text-content-secondary mt-1">{myCase.mp_verification.notes}</p>
                )}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
