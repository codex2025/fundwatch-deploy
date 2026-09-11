import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { RISK_BANDS } from '../../utils/risk';
import { formatMonth, formatCount } from '../../utils/format';

/**
 * Global filters. Every control states the resulting record count, so the user
 * always knows what a filter did -- filters never change data silently.
 */
export default function FilterDrawer({ open, onClose }) {
  const { filters, setFilter, clearFilters, facets, filtered, anomalies } = useWorkspace();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => panelRef.current?.querySelector('select,input,button')?.focus());
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-drawer flex justify-end bg-black/50 animate-fade-in" onClick={onClose}>
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="w-full max-w-sm h-full bg-bg-secondary border-l border-line flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header shrink-0">
          <h2 className="panel-title">Filters</h2>
          <button onClick={onClose} className="btn-ghost btn-icon" aria-label="Close filters">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 scroll-y p-4 space-y-5">
          <div>
            <label htmlFor="filter-state" className="label-meta block mb-1.5">State / UT</label>
            <select
              id="filter-state"
              className="field"
              value={filters.state}
              onChange={(e) => setFilter('state', e.target.value)}
            >
              <option value="ALL">All states ({facets.states.length})</option>
              {facets.states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-month" className="label-meta block mb-1.5">Reporting month</label>
            <select
              id="filter-month"
              className="field"
              value={filters.month}
              onChange={(e) => setFilter('month', e.target.value)}
            >
              <option value="ALL">All months ({facets.months.length})</option>
              {facets.months.map((m) => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="label-meta mb-1.5">Risk band</legend>
            <div className="space-y-1">
              {[{ key: 'ALL', label: 'All bands' }, ...RISK_BANDS].map((band) => {
                const count = band.key === 'ALL'
                  ? anomalies.length
                  : anomalies.filter((a) => a.band.key === band.key).length;
                return (
                  <label
                    key={band.key}
                    className="flex items-center gap-2.5 h-8 px-2 rounded-sm cursor-pointer hover:bg-bg-elevated"
                  >
                    <input
                      type="radio"
                      name="risk-band"
                      value={band.key}
                      checked={filters.band === band.key}
                      onChange={() => setFilter('band', band.key)}
                      className="accent-[var(--accent-primary)]"
                    />
                    <span className="text-base text-content-secondary flex-1">{band.label}</span>
                    <span className="mono text-xs text-content-muted">{formatCount(count)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label htmlFor="filter-score" className="label-meta">Minimum risk score</label>
              <span className="mono text-base font-semibold" style={{ color: 'var(--accent-primary)' }}>
                {filters.minScore}
              </span>
            </div>
            <input
              id="filter-score"
              type="range"
              min="0"
              max="95"
              step="5"
              value={filters.minScore}
              onChange={(e) => setFilter('minScore', Number(e.target.value))}
              className="w-full accent-[var(--accent-primary)]"
              aria-valuetext={`Minimum risk score ${filters.minScore}`}
            />
            <p className="text-xs text-content-muted mt-1">
              A score aggregates four statistical signals. It is not a finding of wrongdoing.
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-line-subtle p-3 flex items-center justify-between gap-3">
          <span className="text-xs text-content-muted">
            <span className="mono font-semibold text-content-primary">{formatCount(filtered.length)}</span>
            {' '}of {formatCount(anomalies.length)} records
          </span>
          <div className="flex gap-2">
            <button onClick={clearFilters} className="btn-ghost btn-sm">Reset</button>
            <button onClick={onClose} className="btn-accent btn-sm">Apply</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
