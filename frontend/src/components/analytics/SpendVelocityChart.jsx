import React, { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, Bar, XAxis, YAxis,
  Tooltip, ReferenceLine, ReferenceArea, CartesianGrid, Cell,
} from 'recharts';
import { formatINR, formatAxisINR, formatMonth, formatRatio, formatCount } from '../../utils/format';
import { riskColorVar } from '../../utils/risk';
import { EmptyState } from '../ui';

/**
 * The signature visual (DESIGN.md §13): cumulative trajectory against the
 * agency's own baseline, with the divergence point marked.
 *
 * The previous chart put monthly bars and a cumulative line on ONE axis.
 * Cumulative reached ~₹6 Cr while typical monthly spend was ~₹19 L, so every
 * bar flattened to invisibility and the divergence -- the entire point --
 * could not be seen. Two axes fix that.
 */

function VelocityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg-elevated border border-line rounded shadow-overlay p-3 text-sm min-w-[210px]">
      <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-line-subtle">
        <span className="font-semibold text-content-primary">{formatMonth(d.month)}</span>
        {d.isFlagged && (
          <span
            className="text-2xs font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-sm"
            style={{ background: 'var(--risk-critical-surface)', color: 'var(--risk-critical)' }}
          >
            Flagged
          </span>
        )}
      </div>
      <dl className="space-y-1.5">
        <Row label="Disbursed this month" value={formatINR(d.monthlyAmount)} strong />
        <Row label="Agency baseline (median)" value={formatINR(d.baseline)} />
        {d.velocityRatio != null && (
          <Row label="Velocity" value={formatRatio(d.velocityRatio)} tone="var(--risk-high)" />
        )}
        {d.workCount != null && <Row label="Works" value={formatCount(d.workCount)} />}
        <Row label="Cumulative to date" value={formatINR(d.cumulativeAmount)} />
      </dl>
    </div>
  );
}

function Row({ label, value, strong, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-content-muted">{label}</dt>
      <dd
        className={`mono text-sm ${strong ? 'font-semibold' : ''}`}
        style={{ color: tone || 'var(--text-primary)' }}
      >
        {value}
      </dd>
    </div>
  );
}

export default function SpendVelocityChart({
  months = [],
  baseline,
  upperFence,
  focusMonth,
  height = 280,
}) {
  const data = useMemo(
    () => months.map((m) => ({ ...m, baseline: baseline ?? null })),
    [months, baseline]
  );

  // First month that breaches the agency's own upper fence -- the point where
  // behaviour stopped being ordinary.
  const divergence = useMemo(() => {
    if (!upperFence) return null;
    return data.find((d) => (d.monthlyAmount ?? 0) > upperFence)?.month ?? null;
  }, [data, upperFence]);

  if (!data.length) {
    return (
      <EmptyState
        title="No timeline to display"
        description="This agency has no monthly observations in the current dataset."
      />
    );
  }

  return (
    <div className="p-4 pt-2">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} />

          {/* Shade the divergent region so the eye lands on it first. */}
          {divergence && (
            <ReferenceArea
              x1={divergence}
              x2={data[data.length - 1].month}
              fill="var(--risk-critical)"
              fillOpacity={0.05}
            />
          )}

          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
            minTickGap={24}
          />

          {/* Left: monthly spend. Right: cumulative. Separate scales, so the
              monthly series stays readable. */}
          <YAxis
            yAxisId="monthly"
            tickFormatter={formatAxisINR}
            axisLine={false}
            tickLine={false}
            width={62}
          />
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            tickFormatter={formatAxisINR}
            axisLine={false}
            tickLine={false}
            width={62}
          />

          <Tooltip content={<VelocityTooltip />} cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }} />

          {/* The agency's own baseline -- the thing everything is judged against. */}
          {baseline != null && (
            <ReferenceLine
              yAxisId="monthly"
              y={baseline}
              stroke="var(--accent-primary)"
              strokeDasharray="4 3"
              label={{
                value: `Baseline ${formatINR(baseline)}`,
                position: 'insideTopLeft',
                fill: 'var(--accent-primary)',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          )}

          {upperFence != null && (
            <ReferenceLine
              yAxisId="monthly"
              y={upperFence}
              stroke="var(--risk-medium)"
              strokeDasharray="2 4"
              label={{
                value: `Upper fence ${formatINR(upperFence)}`,
                position: 'insideTopRight',
                fill: 'var(--risk-medium)',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          )}

          <Bar yAxisId="monthly" dataKey="monthlyAmount" name="Monthly spend" barSize={14} radius={[2, 2, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.month}
                fill={
                  d.month === focusMonth ? riskColorVar('critical')
                  : d.isFlagged ? riskColorVar('high')
                  : 'var(--border-strong)'
                }
              />
            ))}
          </Bar>

          <Area
            yAxisId="cumulative"
            type="monotone"
            dataKey="cumulativeAmount"
            name="Cumulative"
            stroke="var(--risk-info)"
            strokeWidth={1.5}
            fill="var(--risk-info)"
            fillOpacity={0.07}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend as text -- colour is never the only carrier of meaning. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 px-2 text-xs text-content-muted">
        <LegendKey color="var(--border-strong)" label="Monthly spend" />
        <LegendKey color={riskColorVar('high')} label="Flagged month" />
        <LegendKey color="var(--accent-primary)" label="Agency baseline" dashed />
        <LegendKey color="var(--risk-info)" label="Cumulative (right axis)" />
        {divergence && (
          <span className="ml-auto">
            Divergence from <span className="mono text-content-secondary">{formatMonth(divergence)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function LegendKey({ color, label, dashed }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2.5 h-0.5 shrink-0"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)`
            : color,
          height: dashed ? 1 : 6,
          borderRadius: 1,
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
