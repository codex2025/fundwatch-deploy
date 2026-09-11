/**
 * Shared UI primitives. Purely visual -- no business logic, no data fetching.
 * Everything here consumes design tokens; nothing hardcodes a colour.
 */
import React from 'react';
import { AlertCircle, Inbox, RefreshCw, X, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { riskBand, riskColorVar, riskSurfaceVar } from '../../utils/risk';
import { formatScore } from '../../utils/format';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ---------------------------------------------------------------- Panel */

export function Panel({ children, className = '', ...rest }) {
  return (
    <section className={cx('panel', className)} {...rest}>
      {children}
    </section>
  );
}

export function PanelHeader({ title, description, actions, id }) {
  return (
    <header className="panel-header">
      <div className="min-w-0 flex-1">
        <h2 id={id} className="panel-title truncate">{title}</h2>
        {description && (
          <p className="text-xs text-content-muted truncate mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 min-w-0 shrink">{actions}</div>}
    </header>
  );
}

/* ----------------------------------------------------------- Risk score */

/**
 * Risk is never communicated by colour alone: the numeric score and the band
 * label are always present in the accessible name.
 */
export function RiskScore({ score, insufficientHistory = false, size = 'md', showLabel = true }) {
  const band = riskBand(score, insufficientHistory);
  const isCold = band.key === 'cold';

  const sizes = {
    sm: { box: 'h-6 min-w-[2.25rem] text-xs', label: 'text-2xs' },
    md: { box: 'h-7 min-w-[2.75rem] text-base', label: 'text-2xs' },
    lg: { box: 'h-12 min-w-[4rem] text-2xl', label: 'text-xs' },
  }[size];

  return (
    <span
      className="inline-flex items-center gap-2"
      title={`${band.label} — ${band.description}`}
    >
      <span
        className={cx(
          'inline-flex items-center justify-center px-2 rounded-sm font-semibold tabular border',
          sizes.box
        )}
        style={{
          color: riskColorVar(band.key),
          background: riskSurfaceVar(band.key),
          borderColor: isCold ? 'var(--border-default)' : riskColorVar(band.key) + '55',
        }}
      >
        {isCold ? '—' : formatScore(score)}
      </span>
      {showLabel && (
        <span className={cx('font-medium uppercase tracking-[0.06em]', sizes.label)}
              style={{ color: riskColorVar(band.key) }}>
          {band.short}
        </span>
      )}
      <span className="sr-only">
        {isCold ? band.label : `Risk score ${formatScore(score)} of 100, ${band.label}`}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------- Signal bar */

/**
 * Magnitude bar for a single detector signal.
 *
 * The bar length is the signal's 0-100 SUB-SCORE from the engine, not its raw
 * ratio. Raw ratios are unbounded and differently scaled per signal, so a bar
 * drawn from them sat at ~90% for every signal and conveyed nothing. The
 * sub-score is the commensurable quantity and is what actually feeds the
 * composite, so the bar now shows how much this dimension really contributed.
 */
export function SignalBar({ label, value, unit, subScore = 0, description }) {
  const pct = Math.max(0, Math.min(100, subScore));
  const active = pct > 0;

  return (
    <div className="space-y-1.5" title={description}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-content-secondary">{label}</span>
        <span className="flex items-baseline gap-2">
          <span
            className="mono text-base font-semibold"
            style={{ color: active ? 'var(--risk-high)' : 'var(--text-primary)' }}
          >
            {Number(value).toFixed(1)}
            <span className="text-content-muted font-normal text-xs ml-0.5">{unit}</span>
          </span>
          <span className="mono text-2xs text-content-muted w-14 text-right tabular">
            {pct.toFixed(0)}/100
          </span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-sm bg-bg-inset overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-200"
          style={{
            width: `${Math.max(pct, active ? 2 : 0)}%`,
            background: active ? 'var(--risk-high)' : 'var(--accent-dim)',
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ KPI */

export function KpiCard({ label, value, unit, context, trend, tone = 'default', loading }) {
  if (loading) {
    return (
      <div className="panel p-4 space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }

  const toneColor = {
    default: 'var(--text-primary)',
    accent: 'var(--accent-primary)',
    critical: 'var(--risk-critical)',
    high: 'var(--risk-high)',
  }[tone];

  return (
    <div className="panel p-4">
      <div className="label-meta">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="metric-value" style={{ color: toneColor }}>{value}</span>
        {unit && <span className="text-md text-content-muted font-medium">{unit}</span>}
      </div>
      {(context || trend) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className="mono font-medium"
              style={{ color: trend.direction === 'up' ? 'var(--risk-high)' : 'var(--risk-low)' }}
            >
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {context && <span className="text-content-muted">{context}</span>}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- States */

export function LoadingState({ label = 'Loading', rows = 4 }) {
  return (
    <div className="p-4 space-y-2.5" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-9" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-3">
      <Icon className="w-6 h-6 text-content-muted" aria-hidden="true" />
      <div className="space-y-1 max-w-sm">
        <p className="text-md font-medium text-content-primary">{title}</p>
        {description && <p className="text-sm text-content-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Unable to load this view', detail, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-3">
      <AlertCircle className="w-6 h-6" style={{ color: 'var(--risk-critical)' }} aria-hidden="true" />
      <div className="space-y-1 max-w-md">
        <p className="text-md font-medium text-content-primary">{title}</p>
        {detail && <p className="text-sm text-content-muted">{detail}</p>}
      </div>
      {onRetry && (
        <button className="btn-default btn-sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Chips */

export function Chip({ children, onRemove, tone }) {
  return (
    <span
      className={cx('chip', onRemove && 'chip-removable')}
      style={tone ? { color: riskColorVar(tone), borderColor: riskColorVar(tone) + '55', background: riskSurfaceVar(tone) } : undefined}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 w-4 h-4 inline-flex items-center justify-center rounded-sm hover:bg-bg-inset"
          aria-label={`Remove filter ${typeof children === 'string' ? children : ''}`}
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

/* ------------------------------------------------------- Sortable header */

export function SortableTh({ label, sortKey, sort, onSort, align = 'left', width }) {
  const active = sort.key === sortKey;
  const direction = active ? (sort.asc ? 'ascending' : 'descending') : 'none';
  const Icon = active ? (sort.asc ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <th
      scope="col"
      aria-sort={direction}
      className="th-sortable"
      style={{ width, textAlign: align }}
    >
      {/* A real button so sorting is keyboard-operable -- the old markup used
          th onClick, which no keyboard user could reach. */}
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cx(
          'inline-flex items-center gap-1 w-full uppercase tracking-[0.06em] font-semibold',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center'
        )}
      >
        <span>{label}</span>
        <Icon className={cx('w-3 h-3 shrink-0', active ? 'opacity-100' : 'opacity-40')} aria-hidden="true" />
      </button>
    </th>
  );
}

/* ------------------------------------------------------------- Segmented */

export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex items-center p-0.5 rounded bg-bg-sunken border border-line-subtle"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cx(
              'px-2.5 h-6 rounded-sm text-xs font-medium transition-colors',
              active
                ? 'bg-bg-elevated text-content-primary'
                : 'text-content-muted hover:text-content-secondary'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- Evidence link */

/**
 * The affordance that turns a claim into evidence. Used everywhere an AI or
 * statistical conclusion is stated, per DESIGN.md §21.
 */
export function EvidenceLink({ children, onClick, href }) {
  const className =
    'inline-flex items-center gap-1 text-xs font-medium underline decoration-dotted underline-offset-2 transition-colors';
  const style = { color: 'var(--accent-primary)' };
  if (href) {
    return <a href={href} className={className} style={style}>{children}</a>;
  }
  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {children}
    </button>
  );
}
