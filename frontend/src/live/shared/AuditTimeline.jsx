import React, { useEffect, useState } from 'react';
import { ShieldCheck, Landmark, Building2, Cpu } from 'lucide-react';
import { fetchAudit } from '../../api/liveClient';

const ROLE_META = {
  system: { Icon: Cpu, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30', label: 'System' },
  admin: { Icon: ShieldCheck, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30', label: 'Admin' },
  mp: { Icon: Landmark, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'MP' },
  agency: { Icon: Building2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Agency' },
};

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return ts;
  }
}

export default function AuditTimeline({ caseId, refreshKey, compact = false }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAudit(caseId)
      .then((data) => { if (!cancelled) setEntries(data || []); })
      .catch(() => { if (!cancelled) setEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseId, refreshKey]);

  if (loading) {
    return <p className="text-xs text-slate-500 font-mono">Loading audit trail...</p>;
  }
  if (entries.length === 0) {
    return <p className="text-xs text-slate-500 font-mono">No audit entries yet.</p>;
  }

  const ordered = [...entries].reverse();

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {ordered.map((e, idx) => {
        const meta = ROLE_META[e.actor_role] || ROLE_META.admin;
        const { Icon } = meta;
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${meta.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              {idx < ordered.length - 1 && <div className="w-px flex-1 bg-surface-border mt-1" />}
            </div>
            <div className="pb-4 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-200">{meta.label}</span>
                <span className="text-slate-500 font-mono">{e.actor_id}</span>
                <span className="text-slate-700">&middot;</span>
                <span className="text-slate-500 font-mono text-[11px] tabular-nums">{formatTime(e.timestamp)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 break-words">{e.detail}</p>
              {!compact && e.case_id && (
                <span className="inline-block mt-1 text-[10px] font-mono text-slate-600">{e.case_id}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
