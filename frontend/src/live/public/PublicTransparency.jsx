import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { fetchPublicSummary } from '../../api/liveClient';
import { Panel, PanelHeader, KpiCard, LoadingState, ErrorState, EmptyState } from '../../components/ui';
import { formatINR, formatCount } from '../../utils/format';

const STATUS_TONE = {
  'Under Review': 'var(--risk-medium)',
  'Under Further Investigation': 'var(--risk-high)',
  'Reviewed — No Further Action': 'var(--risk-low)',
};

/**
 * Citizen-facing view. Deliberately plain language, and explicit that a flag
 * is a statistical review status rather than a finding.
 */
export default function PublicTransparency() {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    fetchPublicSummary()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => setState({ data: null, loading: false, error: err.message }));
  }, []);

  if (state.loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => <KpiCard key={i} loading />)}
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <Panel>
        <ErrorState
          title="Unable to load the transparency summary"
          detail={`The public data service did not respond (${state.error}).`}
        />
      </Panel>
    );
  }

  const d = state.data;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Funds tracked" value={formatINR(d.total_disbursed_inr)} context="total MPLADS disbursement monitored" />
        <KpiCard label="Works sanctioned" value={formatCount(d.total_works)} />
        <KpiCard label="Agencies monitored" value={formatCount(d.total_agencies)} />
      </div>

      <Panel>
        <PanelHeader
          title="Agencies with spending under review"
          description="Published status only — no case details are disclosed"
        />
        {d.flagged_agencies?.length === 0 ? (
          <EmptyState
            title="No agencies currently under review"
            description="No agency’s spending pattern is presently outside its expected range."
          />
        ) : (
          <ul className="divide-y divide-line-subtle">
            {d.flagged_agencies.map((a, idx) => {
              const tone = STATUS_TONE[a.status] || 'var(--text-secondary)';
              return (
                <li key={`${a.agency_name}-${idx}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-base text-content-primary truncate">{a.agency_name}</div>
                    <div className="text-xs text-content-muted">{a.state}</div>
                  </div>
                  <span
                    className="inline-flex items-center h-6 px-2 rounded-sm border text-xs font-medium whitespace-nowrap shrink-0"
                    style={{ color: tone, borderColor: `${tone}44`, background: `${tone}14` }}
                  >
                    {a.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div
        className="flex items-start gap-2.5 rounded border p-3"
        style={{ background: 'var(--risk-info-surface)', borderColor: 'rgba(77,157,255,0.25)' }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--risk-info)' }} aria-hidden="true" />
        <p className="text-sm text-content-secondary leading-relaxed">
          “Under review” means an agency’s spending pattern differs statistically from its own past
          activity, and an administrator and the local MP are checking it. It is{' '}
          <strong className="text-content-primary font-medium">not</strong> a finding of fraud,
          corruption, or any wrongdoing.
        </p>
      </div>
    </div>
  );
}
