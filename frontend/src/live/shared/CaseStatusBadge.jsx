import React from 'react';
import { Clock, Send, MessageSquare, Gavel, CheckCircle2, Flame, Eye, XCircle, AlertTriangle } from 'lucide-react';

/**
 * Case workflow status. Restyled onto design tokens; the status vocabulary and
 * the state machine it reflects are unchanged.
 */
const CONFIG = {
  notice_drafted:    { label: 'Awaiting approval', color: 'var(--risk-medium)',  surface: 'var(--risk-medium-surface)',  Icon: Clock },
  sent:              { label: 'Notice sent',       color: 'var(--risk-info)',    surface: 'var(--risk-info-surface)',    Icon: Send },
  response_received: { label: 'Response received', color: 'var(--risk-info)',    surface: 'var(--risk-info-surface)',    Icon: MessageSquare },
  mp_verified:       { label: 'MP verified',       color: 'var(--accent-primary)', surface: 'var(--accent-surface)',     Icon: Gavel },
  resolved:          { label: 'Resolved',          color: 'var(--risk-low)',     surface: 'var(--risk-low-surface)',     Icon: CheckCircle2 },
  escalated:         { label: 'Escalated',         color: 'var(--risk-critical)', surface: 'var(--risk-critical-surface)', Icon: Flame },
  monitoring:        { label: 'Monitoring',        color: 'var(--risk-cold)',    surface: 'var(--risk-cold-surface)',    Icon: Eye },
};

const FALLBACK = { color: 'var(--text-secondary)', surface: 'var(--bg-elevated)', Icon: Clock };

export default function CaseStatusBadge({ status, outcome, overdue, size = 'md' }) {
  let cfg = CONFIG[status] || { ...FALLBACK, label: status };
  if (status === 'resolved' && outcome === 'dismissed') {
    cfg = { label: 'Dismissed', color: 'var(--text-muted)', surface: 'var(--bg-elevated)', Icon: XCircle };
  }

  const sizeClasses = size === 'sm' ? 'h-5 px-1.5 text-2xs gap-1' : 'h-6 px-2 text-xs gap-1.5';
  const { Icon } = cfg;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-sm border font-medium ${sizeClasses}`}
        style={{ color: cfg.color, background: cfg.surface, borderColor: `${cfg.color}44` }}
      >
        <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
        {cfg.label}
      </span>
      {overdue && (
        <span
          className={`inline-flex items-center rounded-sm border font-medium ${sizeClasses}`}
          style={{
            color: 'var(--risk-critical)',
            background: 'var(--risk-critical-surface)',
            borderColor: 'rgba(242,85,90,0.35)',
          }}
        >
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
          Overdue
        </span>
      )}
    </span>
  );
}
