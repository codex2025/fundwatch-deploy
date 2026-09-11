import React from 'react';
import { SignalBar, EvidenceLink } from '../ui';
import { rankedSignals, COMPOSITE_WEIGHTS } from '../../utils/risk';
import { formatINR, formatRatio, formatPercent, formatMonth } from '../../utils/format';

/**
 * "Why was this flagged" (DESIGN.md §11 — mandatory).
 *
 * Never "AI detected an anomaly". Every claim states the measured quantity,
 * the baseline it was measured against, and the method used. Each row links
 * to the evidence that supports it.
 */
export default function WhyFlagged({ anomaly, onShowEvidence }) {
  if (!anomaly) return null;

  const signals = rankedSignals(anomaly.signals);
  const exceeded = signals.filter((s) => s.exceeded);
  const delta =
    anomaly.historicalMedian && anomaly.monthlyAmount
      ? ((anomaly.monthlyAmount - anomaly.historicalMedian) / anomaly.historicalMedian) * 100
      : null;

  return (
    <div className="p-4 space-y-5">
      {/* Plain-language summary, strictly derived from the numbers below. */}
      <p className="text-md text-content-secondary leading-relaxed">
        {exceeded.length > 0 ? (
          <>
            This agency-month was flagged because{' '}
            <strong className="text-content-primary font-medium">{exceeded[0].label.toLowerCase()}</strong>{' '}
            reached{' '}
            <span className="mono" style={{ color: 'var(--risk-high)' }}>
              {exceeded[0].value.toFixed(1)}{exceeded[0].unit}
            </span>{' '}
            against a threshold of {exceeded[0].threshold}{exceeded[0].unit}
            {exceeded.length > 1 && (
              <>, reinforced by {exceeded.length - 1} further signal{exceeded.length > 2 ? 's' : ''}</>
            )}.
          </>
        ) : (
          <>
            No individual signal crossed its threshold. The composite score reflects
            combined moderate deviation across several dimensions.
          </>
        )}
        {' '}These are statistical deviations, not findings of wrongdoing.
      </p>

      {/* Headline comparison */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-line-subtle rounded overflow-hidden border border-line-subtle">
        <Stat
          label={`Spend, ${formatMonth(anomaly.month)}`}
          value={formatINR(anomaly.monthlyAmount)}
          tone="var(--text-primary)"
        />
        <Stat
          label="Agency baseline"
          value={formatINR(anomaly.historicalMedian)}
          hint="rolling median"
        />
        <Stat
          label="Deviation"
          value={delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%` : '—'}
          tone={delta > 0 ? 'var(--risk-high)' : 'var(--text-primary)'}
        />
      </dl>

      {/* Signal breakdown */}
      <div className="space-y-3.5">
        <h3 className="label-meta">Signals measured</h3>
        {signals.length === 0 && (
          <p className="text-sm text-content-muted">No signal values recorded for this record.</p>
        )}
        {signals.map((s) => (
          <div key={s.key}>
            <SignalBar
              label={s.label}
              value={s.value}
              unit={s.unit}
              subScore={s.subScore}
              description={`${s.method}. Threshold for review: ${s.threshold}${s.unit}.`}
            />
            <p className="text-xs text-content-muted mt-1">{s.describe(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Concentration */}
      {anomaly.concentrationPct != null && anomaly.topWorks.length > 0 && (
        <div className="space-y-2">
          <h3 className="label-meta">Concentration</h3>
          <p className="text-sm text-content-secondary">
            <span className="mono font-semibold text-content-primary">
              {formatPercent(anomaly.concentrationPct, 0)}
            </span>{' '}
            of this month’s disbursement sits in {anomaly.topWorks.length} works.
          </p>
          <div className="h-1.5 rounded-sm bg-bg-inset overflow-hidden">
            <div
              className="h-full rounded-sm"
              style={{
                width: `${Math.min(100, anomaly.concentrationPct)}%`,
                background: 'var(--risk-medium)',
              }}
            />
          </div>
          {onShowEvidence && (
            <EvidenceLink onClick={onShowEvidence}>View the underlying works</EvidenceLink>
          )}
        </div>
      )}

      {/* How the score is composed -- method, not chain of thought. */}
      <details className="group">
        <summary className="label-meta cursor-pointer list-none flex items-center gap-1.5 hover:text-content-secondary">
          <span className="transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
          How this score is composed
        </summary>
        <div className="mt-3 pl-4">
          <table className="w-full text-sm">
            <caption className="sr-only">Contribution of each signal to the composite risk score</caption>
            <thead>
              <tr className="text-content-muted">
                <th scope="col" className="text-left font-normal text-2xs uppercase tracking-[0.06em] pb-1.5">Dimension</th>
                <th scope="col" className="text-right font-normal text-2xs uppercase tracking-[0.06em] pb-1.5">Sub-score</th>
                <th scope="col" className="text-right font-normal text-2xs uppercase tracking-[0.06em] pb-1.5">Weight</th>
                <th scope="col" className="text-right font-normal text-2xs uppercase tracking-[0.06em] pb-1.5">Adds</th>
              </tr>
            </thead>
            <tbody>
              {COMPOSITE_WEIGHTS.map((w) => {
                const s = signals.find((x) => x.key === w.key);
                const sub = s?.subScore ?? 0;
                const adds = sub * w.weight;
                return (
                  <tr key={w.key} className="border-t border-line-subtle">
                    <td className="py-1.5 text-content-secondary">{w.label}</td>
                    <td className="py-1.5 text-right mono text-content-primary">{sub.toFixed(0)}</td>
                    <td className="py-1.5 text-right mono text-content-muted">{(w.weight * 100).toFixed(0)}%</td>
                    <td
                      className="py-1.5 text-right mono font-medium"
                      style={{ color: adds > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                    >
                      {adds > 0 ? `+${adds.toFixed(1)}` : '0'}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-line">
                <td className="py-1.5 font-medium text-content-primary">Composite</td>
                <td />
                <td />
                <td className="py-1.5 text-right mono font-semibold text-content-primary">
                  {signals.reduce((sum, s) => sum + s.contribution, 0).toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-content-muted pt-2.5 mt-2 border-t border-line-subtle">
            Each dimension is scored 0–100 by a fixed statistical test, then combined
            with published weights. No model judgement is applied on top of the arithmetic.
          </p>
        </div>
      </details>
    </div>
  );
}

function Stat({ label, value, hint, tone }) {
  return (
    <div className="bg-bg-secondary p-3">
      <dt className="label-meta">{label}</dt>
      <dd className="mono text-lg font-semibold mt-1" style={{ color: tone || 'var(--text-primary)' }}>
        {value}
      </dd>
      {hint && <p className="text-2xs text-content-muted mt-0.5">{hint}</p>}
    </div>
  );
}
