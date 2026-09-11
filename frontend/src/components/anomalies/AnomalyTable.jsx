import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { RiskScore, SortableTh, EmptyState, SegmentedControl, cx } from '../ui';
import { formatINR, formatMonth, formatRatio, formatCount, formatLocation } from '../../utils/format';
import { riskColorVar } from '../../utils/risk';

/**
 * The ranked anomaly queue (DESIGN.md §10).
 *
 * This is an investigative worklist, not a decorative table: rows are
 * keyboard-navigable, the primary signal is named rather than restated as the
 * score, and the per-row action is de-emphasised so ranking stays the loudest
 * signal on the screen.
 */

const PAGE_SIZES = [25, 50, 100];

export default function AnomalyTable({
  anomalies,
  selectedId,
  onSelect,
  density = 'default',
  onDensityChange,
  pageSize: initialPageSize = 25,
  showPagination = true,
  compact = false,
}) {
  const navigate = useNavigate();
  const [sort, setSort] = useState({ key: 'riskScore', asc: false });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const tbodyRef = useRef(null);

  const sorted = useMemo(() => {
    const list = [...anomalies];
    list.sort((a, b) => {
      const pick = (row) => {
        switch (sort.key) {
          case 'agencyName': return row.agencyName?.toLowerCase() ?? '';
          case 'month': return row.month ?? '';
          case 'monthlyAmount': return row.monthlyAmount ?? -1;
          case 'velocity': return row.signals.velocity_ratio ?? -1;
          case 'signal': return row.primarySignal?.label ?? '';
          default: return row.riskScore ?? -1;
        }
      };
      const va = pick(a);
      const vb = pick(b);
      if (va < vb) return sort.asc ? -1 : 1;
      if (va > vb) return sort.asc ? 1 : -1;
      return 0;
    });
    return list;
  }, [anomalies, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = showPagination
    ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : sorted.slice(0, pageSize);

  const handleSort = useCallback((key) => {
    setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: false }));
    setPage(0);
  }, []);

  const openRow = useCallback((row) => {
    onSelect?.(row.id);
    navigate(`/investigation/${encodeURIComponent(row.id)}`);
  }, [onSelect, navigate]);

  /** Arrow keys move between rows; Enter opens the investigation workspace. */
  const onRowKeyDown = useCallback((e, row, index) => {
    const rows = tbodyRef.current?.querySelectorAll('tr[data-row]');
    if (!rows) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openRow(row);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      rows[Math.min(index + 1, rows.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      rows[Math.max(index - 1, 0)]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      rows[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      rows[rows.length - 1]?.focus();
    }
  }, [openRow]);

  if (!anomalies.length) {
    return (
      <EmptyState
        title="No anomalies match the current filters"
        description="Every record was excluded by the active filter set. Lower the minimum risk score or clear a filter to widen the search."
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className={cx('data-table', `density-${density}`)}>
          <caption className="sr-only">
            Ranked spending anomalies, sorted by {sort.key} {sort.asc ? 'ascending' : 'descending'}
          </caption>
          <thead>
            <tr>
              <th scope="col" style={{ width: 40 }} className="text-right">#</th>
              <SortableTh label="Risk" sortKey="riskScore" sort={sort} onSort={handleSort} width={110} />
              <SortableTh label="Agency" sortKey="agencyName" sort={sort} onSort={handleSort} />
              {!compact && <SortableTh label="Month" sortKey="month" sort={sort} onSort={handleSort} width={90} />}
              <SortableTh label="Expenditure" sortKey="monthlyAmount" sort={sort} onSort={handleSort} align="right" width={130} />
              <SortableTh label="Primary signal" sortKey="signal" sort={sort} onSort={handleSort} width={180} />
              {!compact && <SortableTh label="Velocity" sortKey="velocity" sort={sort} onSort={handleSort} align="right" width={90} />}
              <th scope="col" style={{ width: 44 }}><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {visible.map((row, i) => {
              const rank = (showPagination ? safePage * pageSize : 0) + i + 1;
              const isSelected = row.id === selectedId;
              const signal = row.primarySignal;
              return (
                <tr
                  key={row.id}
                  data-row
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => openRow(row)}
                  onKeyDown={(e) => onRowKeyDown(e, row, i)}
                  className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset"
                >
                  <td className="text-right mono text-2xs text-content-muted">{rank}</td>

                  <td>
                    <RiskScore
                      score={row.riskScore}
                      insufficientHistory={row.insufficientHistory}
                      size="sm"
                    />
                  </td>

                  <td>
                    <div className="text-content-primary font-medium truncate max-w-[22rem]">
                      {row.agencyName}
                    </div>
                    <div className="text-xs text-content-muted truncate">
                      {formatLocation(row.district, row.state)}
                      <span className="mx-1.5 opacity-40">·</span>
                      <span className="mono">{row.agencyId}</span>
                    </div>
                  </td>

                  {!compact && <td className="mono text-content-secondary">{formatMonth(row.month)}</td>}

                  <td className="text-right">
                    <div className="mono font-medium text-content-primary">
                      {formatINR(row.monthlyAmount)}
                    </div>
                    <div className="mono text-2xs text-content-muted">
                      base {formatINR(row.historicalMedian)}
                    </div>
                  </td>

                  {/* The dimension that actually drove the score, with the
                      measured value -- not a restatement of the score. */}
                  <td>
                    {signal ? (
                      <>
                        <div
                          className="font-medium truncate"
                          style={{ color: signal.contribution > 0 ? riskColorVar('high') : 'var(--text-secondary)' }}
                        >
                          {signal.label}
                        </div>
                        <div className="mono text-2xs text-content-muted truncate">
                          {signal.value.toFixed(1)}{signal.unit}
                          {signal.contribution > 0 && ` · adds ${signal.contribution.toFixed(0)} pts`}
                        </div>
                      </>
                    ) : (
                      <span className="text-content-muted">—</span>
                    )}
                  </td>

                  {!compact && (
                    <td className="text-right mono"
                        style={{
                          color: (row.signals.velocity_ratio ?? 0) >= 3
                            ? riskColorVar('high') : 'var(--text-secondary)',
                        }}>
                      {formatRatio(row.signals.velocity_ratio)}
                    </td>
                  )}

                  <td className="text-center">
                    <ArrowRight className="w-3.5 h-3.5 text-content-muted inline" aria-hidden="true" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border-t border-line-subtle">
          <span className="text-xs text-content-muted">
            <span className="mono text-content-secondary">
              {formatCount(safePage * pageSize + 1)}–{formatCount(Math.min((safePage + 1) * pageSize, sorted.length))}
            </span>
            {' '}of <span className="mono text-content-secondary">{formatCount(sorted.length)}</span>
          </span>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Density is a desktop refinement; at phone widths the row count
                and pager matter more than the control that sets row height. */}
            {onDensityChange && (
              <span className="hidden md:inline-flex">
                <SegmentedControl
                  label="Row density"
                  value={density}
                  onChange={onDensityChange}
                  options={[
                    { value: 'compact', label: 'Compact' },
                    { value: 'default', label: 'Default' },
                    { value: 'relaxed', label: 'Relaxed' },
                  ]}
                />
              </span>
            )}

            <select
              className="field w-auto h-7 text-xs"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} rows</option>)}
            </select>

            <div className="flex items-center gap-1">
              <button
                className="btn-default btn-sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                Previous
              </button>
              <span className="mono text-xs text-content-muted px-1.5 tabular">
                {safePage + 1}/{pageCount}
              </span>
              <button
                className="btn-default btn-sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
