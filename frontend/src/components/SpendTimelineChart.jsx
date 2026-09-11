import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
  Cell
} from 'recharts';

function formatCurrencyINR(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)} K`;
  return `₹${val}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-card !bg-surface-raised/95 p-4 text-xs space-y-2 min-w-[220px]">
        <div className="flex items-center justify-between border-b border-surface-border pb-1.5 gap-2">
          <span className="font-bold text-slate-200 text-sm">{label}</span>
          {data.is_flagged && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30 text-[10px] shrink-0">
              FLAGGED ANOMALY
            </span>
          )}
        </div>
        <div className="space-y-1 tabular-nums">
          <div className="flex justify-between gap-3 text-slate-300">
            <span>Disbursed Spend:</span>
            <span className="font-bold font-mono text-sky-400">{formatCurrencyINR(data.monthly_amount)}</span>
          </div>
          <div className="flex justify-between gap-3 text-slate-400">
            <span>Historical Median:</span>
            <span className="font-mono text-emerald-400">{formatCurrencyINR(data.hist_median || payload[0].payload.hist_median || 0)}</span>
          </div>
          <div className="flex justify-between gap-3 text-slate-400">
            <span>Spend Velocity:</span>
            <span className="font-mono text-amber-400 font-semibold">{data.velocity_ratio || 1.0}x</span>
          </div>
          <div className="flex justify-between gap-3 text-slate-400">
            <span>Modified Z-Score:</span>
            <span className="font-mono text-purple-400 font-semibold">{data.modified_z_score || 0} MAD</span>
          </div>
          <div className="flex justify-between gap-3 text-slate-400">
            <span>Works Count:</span>
            <span className="font-mono text-slate-200">{data.work_count || 1} works</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function SpendTimelineChart({ months = [], historicalMedian, iqrUpperFence, selectedMonth }) {
  if (!months || months.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-slate-500 text-xs font-mono">
        No chronological timeline observations recorded.
      </div>
    );
  }

  const chartData = months.map(m => ({
    ...m,
    hist_median: historicalMedian || m.hist_median || 0,
    upper_fence: iqrUpperFence || m.hist_upper_fence || (historicalMedian * 2.2)
  }));

  return (
    <div className="w-full h-80 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <defs>
            <linearGradient id="barGradientNormal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#0284c7" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="barGradientSpike" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.10)" vertical={false} />
          <XAxis
            dataKey="year_month"
            stroke="rgba(148,163,184,0.25)"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={{ stroke: 'rgba(148,163,184,0.25)' }}
          />
          <YAxis
            stroke="rgba(148,163,184,0.25)"
            tickFormatter={formatCurrencyINR}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={{ stroke: 'rgba(148,163,184,0.25)' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
          <Legend
            wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#94a3b8' }}
          />

          {/* Reference Lines for Baseline & Fence */}
          {historicalMedian > 0 && (
            <ReferenceLine
              y={historicalMedian}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Baseline Median: ${formatCurrencyINR(historicalMedian)}`,
                fill: '#10b981',
                fontSize: 10,
                position: 'insideTopRight'
              }}
            />
          )}
          {iqrUpperFence > 0 && (
            <ReferenceLine
              y={iqrUpperFence}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: `IQR Upper Fence (Q3+1.5IQR): ${formatCurrencyINR(iqrUpperFence)}`,
                fill: '#f59e0b',
                fontSize: 10,
                position: 'insideBottomRight'
              }}
            />
          )}

          {/* Monthly Bars */}
          <Bar dataKey="monthly_amount" name="Disbursed Monthly Spend (INR)" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => {
              const isSelected = selectedMonth && entry.year_month === selectedMonth;
              const isSpike = entry.is_flagged || isSelected;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isSpike ? "url(#barGradientSpike)" : "url(#barGradientNormal)"}
                  stroke={isSpike ? "#f87171" : "#38bdf8"}
                  strokeWidth={isSpike ? 2 : 1}
                />
              );
            })}
          </Bar>

          {/* Cumulative Spending Trend Line */}
          <Line
            type="monotone"
            dataKey="cumulative_amount"
            name="Cumulative Spend Running Total"
            stroke="#a855f7"
            strokeWidth={2}
            dot={false}
            yAxisId={0}
            opacity={0.6}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
