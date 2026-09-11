import React from 'react';
import { ArrowUpRight, TrendingUp, Layers, PieChart, AlertCircle } from 'lucide-react';

function formatINR(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export default function WhatChangedView({ anomaly, historicalMedian }) {
  if (!anomaly) return null;

  const spikeAmount = anomaly.monthly_amount || 0;
  const baseAmount = historicalMedian || anomaly.historical_median_monthly_inr || 1;
  const surgeMultiplier = anomaly.signals?.velocity_ratio || (spikeAmount / baseAmount).toFixed(1);
  const topWorks = anomaly.top_contributing_works || [];
  const pctTop3 = anomaly.pct_of_spike_from_top3 || 80;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 border-b border-surface-border pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">What Changed This Month?</h4>
            <p className="text-[11px] text-slate-500">Decomposition of spending surge vs agency baseline</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono font-bold flex items-center gap-1 tabular-nums">
          <ArrowUpRight className="w-3.5 h-3.5" />
          +{((surgeMultiplier - 1) * 100).toFixed(0)}% Surge
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Comparison Cards */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-surface-sunken border border-surface-border">
            <div className="text-[11px] text-slate-400 font-medium">Historical Baseline Spend</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5 tabular-nums">
              {formatINR(baseAmount)}
              <span className="text-xs text-slate-500 font-normal ml-1.5">/ month (median)</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Constructed across all prior observed non-spike periods
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-sunken border border-red-900/30">
            <div className="text-[11px] text-red-300 font-medium flex items-center justify-between gap-2">
              <span>Disbursed In {anomaly.year_month}</span>
              <span className="font-mono text-[10px] text-red-400 font-bold tabular-nums shrink-0">{surgeMultiplier}x Acceleration</span>
            </div>
            <div className="text-lg font-bold font-mono text-red-400 mt-0.5 tabular-nums">
              {formatINR(spikeAmount)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Net surge delta: <span className="font-mono text-red-300 font-semibold tabular-nums">+{formatINR(spikeAmount - baseAmount)}</span>
            </div>
          </div>
        </div>

        {/* Spike Concentration Breakdown */}
        <div className="p-3.5 rounded-xl bg-surface-sunken border border-surface-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium mb-2 gap-2">
              <span className="flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-sky-400" />
                Capital Concentration
              </span>
              <span className="text-sky-400 font-mono font-bold tabular-nums shrink-0">{pctTop3}% in Top {topWorks.length} Works</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden mb-3">
              <div
                className="bg-brand-gradient h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pctTop3)}%` }}
              ></div>
            </div>

            <div className="space-y-2">
              {topWorks.slice(0, 3).map((w, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0 gap-2">
                  <span className="text-slate-300 truncate max-w-[180px] text-[11px]">
                    {idx + 1}. {w.description || w.work_name}
                  </span>
                  <span className="font-mono font-semibold text-slate-100 text-[11px] tabular-nums shrink-0">
                    {formatINR(w.amount || w.sanction_amount || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-surface-border flex items-center gap-1.5 text-[10px] text-amber-400/90">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>High single-month capital concentration significantly exceeds normal distributed procurement.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
