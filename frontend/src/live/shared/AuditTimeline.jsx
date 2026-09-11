import React, { useEffect, useState } from 'react';
import { ShieldCheck, Landmark, Building2, Cpu } from 'lucide-react';
import { fetchAudit } from '../../api/liveClient';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui';
import { formatDateTime } from '../../utils/format';

const ROLE_META = {
  system: { Icon: Cpu, color: 'var(--risk-info)', label: 'System' },
  admin: { Icon: ShieldCheck, color: 'var(--accent-primary)', label: 'Administrator' },
  mp: { Icon: Landmark, color: 'var(--risk-medium)', label: 'MP' },
  agency: { Icon: Building2, color: 'var(--risk-low)', label: 'Agency' },
};

export default function AuditTimeline({ caseId, refreshKey, compact = false }) {
  const [state, setState] = useState({ entries: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchAudit(caseId)
      .then((data) => { if (!cancelled) setState({ entries: data || [], loading: false, error: null }); })
      .catch((err) => { if (!cancelled) setState({ entries: [], loading: false, error: err.message }); })
      .finally(() => {});
    return () => { cancelled = true; };
  }, [caseId, refreshKey]);

  if (state.loading) return <LoadingState label="Loading audit trail" rows={3} />;

  if (state.error) {
    return (
      <ErrorState
        title="Unable to load the audit trail"
        detail={`The audit service did not respond (${state.error}). This view requires an administrator session.`}
      />
    );
  }

  if (!state.entries.length) {
    return <EmptyState title="No audit entries" description="No actions have been recorded against this case yet." />;
  }

  const ordered = [...state.entries].reverse();

  return (
    <ol className={compact ? 'p-3 space-y-3' : 'p-4 space-y-4'}>
      {ordered.map((e, idx) => {
        const meta = ROLE_META[e.actor_role] || ROLE_META.admin;
        const { Icon } = meta;
        return (
          <li key={`${e.timestamp}-${idx}`} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <span
                className="w-6 h-6 rounded-sm border flex items-center justify-center"
                style={{ color: meta.color, borderColor: `${meta.color}44`, background: 'var(--bg-elevated)' }}
              >
                <Icon className="w-3 h-3" aria-hidden="true" />
              </span>
              {idx < ordered.length - 1 && <span className="w-px flex-1 bg-line-subtle mt-1" aria-hidden="true" />}
            </div>
            <div className="pb-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium text-content-primary">{meta.label}</span>
                <span className="mono text-xs text-content-muted">{e.actor_id}</span>
                <span className="mono text-2xs text-content-muted ml-auto">{formatDateTime(e.timestamp)}</span>
              </div>
              <p className="text-sm text-content-secondary mt-1 break-words">{e.detail}</p>
              {!compact && e.case_id && (
                <span className="mono text-2xs text-content-muted">{e.case_id}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
