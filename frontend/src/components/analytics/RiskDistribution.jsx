import React, { useMemo } from 'react';
import { RISK_BANDS, riskColorVar } from '../../utils/risk';
import { formatCount, formatPercent } from '../../utils/format';
import { cx } from '../ui';

/**
 * Distribution of scored agency-months across risk bands.
 *
 * A stacked proportion bar rather than a pie: the question is "how much of the
 * portfolio sits in each band", and proportion bars answer that with far less
 * ink. Every band carries its count and share in text, so the chart is legible
 * without relying on colour.
 */
export default function RiskDistribution({ anomalies, onSelectBand, activeBand = 'ALL' }) {
  const bands = useMemo(() => {
    const total = anomalies.length || 1;
    return RISK_BANDS.map((band) => {
      const count = anomalies.filter((a) => a.band.key === band.key).length;
      return { ...band, count, share: (count / total) * 100 };
    });
  }, [anomalies]);

  const total = anomalies.length;

  if (!total) {
    return <p className="px-4 py-8 text-center text-sm text-content-muted">No scored records in range.</p>;
  }

  // A healthy portfolio is overwhelmingly low-risk, so a plain proportion bar
  // renders as one solid colour and tells the reader nothing. The tail is the
  // part worth seeing, so it gets its own scale underneath.
  const elevated = bands.filter((b) => b.key !== 'low');
  const elevatedTotal = elevated.reduce((s, b) => s + b.count, 0);
  const maxElevated = Math.max(1, ...elevated.map((b) => b.count));

  return (
    <div className="p-4 space-y-4">
      {/* Whole-portfolio proportion */}
      <div className="space-y-1.5">
        <div
          className="flex h-2 rounded-sm overflow-hidden bg-bg-inset"
          role="img"
          aria-label={
            `Risk distribution across ${formatCount(total)} scored agency-months: ` +
            bands.map((b) => `${b.label} ${b.count}`).join(', ')
          }
        >
          {bands.map((b) =>
            b.count > 0 ? (
              <div
                key={b.key}
                style={{ width: `${Math.max(b.share, 0.4)}%`, background: riskColorVar(b.key) }}
                title={`${b.label}: ${formatCount(b.count)} (${formatPercent(b.share, 2)})`}
              />
            ) : null
          )}
        </div>
        <p className="text-2xs text-content-muted">
          Whole portfolio — {formatCount(total)} scored agency-months
        </p>
      </div>

      {/* The tail, on its own scale */}
      {elevatedTotal > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-end gap-1 h-10" role="img"
               aria-label={`Elevated-risk tail: ${elevated.map((b) => `${b.label} ${b.count}`).join(', ')}`}>
            {elevated.map((b) => (
              <div key={b.key} className="flex-1 flex flex-col justify-end h-full" title={`${b.label}: ${formatCount(b.count)}`}>
                <span
                  className="w-full rounded-t-sm"
                  style={{
                    height: `${Math.max((b.count / maxElevated) * 100, b.count ? 6 : 2)}%`,
                    background: b.count ? riskColorVar(b.key) : 'var(--bg-inset)',
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-2xs text-content-muted">
            Elevated tail — {formatCount(elevatedTotal)} records above the Low band, shown on their own scale
          </p>
        </div>
      )}

      {/* Legend doubles as a filter control */}
      <ul className="space-y-px">
        {bands.map((b) => {
          const active = activeBand === b.key;
          return (
            <li key={b.key}>
              <button
                onClick={() => onSelectBand?.(active ? 'ALL' : b.key)}
                className={cx(
                  'w-full flex items-center gap-2.5 h-8 px-2 rounded-sm text-left transition-colors',
                  active ? 'bg-bg-elevated' : 'hover:bg-bg-elevated/60'
                )}
                aria-pressed={active}
              >
                <span
                  className="w-2 h-2 rounded-[2px] shrink-0"
                  style={{ background: riskColorVar(b.key) }}
                  aria-hidden="true"
                />
                <span className="text-base text-content-secondary flex-1 truncate">{b.label}</span>
                <span className="mono text-base text-content-primary font-medium tabular">
                  {formatCount(b.count)}
                </span>
                <span className="mono text-xs text-content-muted w-14 text-right tabular">
                  {/* Two decimals, so a thin but real tail never reads as "0%". */}
                  {b.count === 0 ? '—' : formatPercent(b.share, b.share < 1 ? 2 : 1)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-content-muted pt-1 border-t border-line-subtle">
        Bands follow the detector’s composite thresholds (Critical ≥ 86, High ≥ 70, Medium ≥ 40).
      </p>
    </div>
  );
}
