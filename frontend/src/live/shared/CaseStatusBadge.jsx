import React from 'react';
import { Clock, Send, MessageSquare, Gavel, CheckCircle2, Flame, Eye, XCircle, AlertTriangle } from 'lucide-react';

const CONFIG = {
  notice_drafted: { label: 'Needs Approval', classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30', Icon: Clock },
  sent: { label: 'Notice Sent', classes: 'bg-sky-500/15 text-sky-300 border-sky-500/30', Icon: Send },
  response_received: { label: 'Response Received', classes: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', Icon: MessageSquare },
  mp_verified: { label: 'MP Verified', classes: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', Icon: Gavel },
  resolved: { label: 'Resolved', classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: CheckCircle2 },
  escalated: { label: 'Escalated', classes: 'bg-red-500/15 text-red-400 border-red-500/30', Icon: Flame },
  monitoring: { label: 'Monitoring', classes: 'bg-purple-500/15 text-purple-300 border-purple-500/30', Icon: Eye },
};

export default function CaseStatusBadge({ status, outcome, overdue, size = 'md' }) {
  let cfg = CONFIG[status] || { label: status, classes: 'bg-slate-800 text-slate-300 border-slate-700', Icon: Clock };
  if (status === 'resolved' && outcome === 'dismissed') {
    cfg = { label: 'Dismissed', classes: 'bg-slate-800 text-slate-400 border-slate-700', Icon: XCircle };
  }
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';
  const { Icon } = cfg;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center rounded-full border font-semibold tracking-wide backdrop-blur-sm shadow-sm transition-colors duration-200 ${cfg.classes} ${sizeClasses}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        {cfg.label}
      </span>
      {overdue && (
        <span className={`inline-flex items-center rounded-full border font-semibold tracking-wide bg-red-500/15 text-red-400 border-red-500/30 animate-pulse-subtle ${sizeClasses}`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Overdue
        </span>
      )}
    </span>
  );
}
