import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, Tooltip, Legend, CartesianGrid, ReferenceLine, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  BarChart3 as BarChartIcon, TrendingUp, AlertTriangle, Layers, Building, Flame,
  ShieldCheck, HelpCircle, Filter, Activity, Zap, Calendar, Target, Box, Sparkles, Plus
} from 'lucide-react';
import {
  fetchHistogram,
  fetchQuadrantScatter,
  fetchCalendarHeatmap,
  fetchRadarProfiler,
  fetchWaterfallMonopoly
} from '../api/client';
import ContourHeatmap3D from '../components/ContourHeatmap3D';

function formatINR(val) {
  if (!val || isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)} K`;
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

export default function VisualIntelligence({ onSelectAnomaly }) {
  const [activeTab, setActiveTab] = useState('all');
  const [minRisk, setMinRisk] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlyGhostBills, setOnlyGhostBills] = useState(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState('ALL');

  // Chart data states
  const [histogramData, setHistogramData] = useState({ risk_bins: [], cost_bins: [] });
  const [scatterData, setScatterData] = useState({ points: [], axes: {} });
  const [calendarData, setCalendarData] = useState({ monthly_summary: [], daily_matrix: [], stats: {} });
  const [radarData, setRadarData] = useState({ radar_axes: [], agencies: [] });
  const [waterfallData, setWaterfallData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected agency for Radar Profiler
  const [selectedRadarAgency, setSelectedRadarAgency] = useState('');

  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      try {
        const [hist, scatter, cal, radar, waterfall] = await Promise.all([
          fetchHistogram(),
          fetchQuadrantScatter(),
          fetchCalendarHeatmap(),
          fetchRadarProfiler(),
          fetchWaterfallMonopoly()
        ]);
        setHistogramData(hist || { risk_bins: [], cost_bins: [] });
        setScatterData(scatter || { points: [], axes: {} });
        setCalendarData(cal || { monthly_summary: [], daily_matrix: [], stats: {} });
        setRadarData(radar || { radar_axes: [], agencies: [] });
        setWaterfallData(waterfall || []);

        if (radar?.agencies?.length > 1) {
          setSelectedRadarAgency(radar.agencies[1].agency_name);
        }
      } catch (err) {
        console.error("Failed to load visual intelligence charts", err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, []);

  // Filter categories from scatter points
  const categories = useMemo(() => {
    const set = new Set(scatterData.points.map(p => p.category).filter(Boolean));
    return ['ALL', ...set];
  }, [scatterData]);

  // Filtered Scatter points
  const filteredScatterPoints = useMemo(() => {
    return scatterData.points.filter(p => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchRisk = (p.composite_risk || 0) >= minRisk;
      const matchGhost = onlyGhostBills ? p.is_ghost : true;
      const matchQuad = selectedQuadrant === 'ALL' || p.quadrant === selectedQuadrant;
      return matchCat && matchRisk && matchGhost && matchQuad;
    });
  }, [scatterData, selectedCategory, minRisk, onlyGhostBills, selectedQuadrant]);

  // Radar comparative data
  const formattedRadarData = useMemo(() => {
    if (!radarData.radar_axes || !radarData.agencies) return [];

    const baseline = radarData.agencies.find(a => a.agency_name.includes("Benchmark")) || radarData.agencies[0];
    const target = radarData.agencies.find(a => a.agency_name === selectedRadarAgency) || radarData.agencies[1];

    if (!baseline || !target) return [];

    return [
      { metric: "S1 (Cost Outlier)", baseline: baseline.s1_score || 15, agency: target.s1_score || 0, fullMark: 100 },
      { metric: "S2 (IQR Fence)", baseline: baseline.s2_score || 12, agency: target.s2_score || 0, fullMark: 100 },
      { metric: "S3 (Peer Ratio)", baseline: baseline.s3_score || 18, agency: target.s3_score || 0, fullMark: 100 },
      { metric: "S4 (Velocity & Ghost)", baseline: baseline.s4_score || 10, agency: target.s4_score || 0, fullMark: 100 },
      { metric: "Composite Risk", baseline: baseline.composite_risk || 14.5, agency: target.composite_risk || 0, fullMark: 100 }
    ];
  }, [radarData, selectedRadarAgency]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="glass-pill px-2.5 py-0.5 text-sky-400 text-xs font-mono font-bold">
              INTELLIGENCE VISUALIZATION SUITE
            </span>
            <span className="glass-pill px-2.5 py-0.5 text-violet-400 text-xs font-mono font-bold">
              Interactive 2D & 3D Analytics
            </span>
          </div>
          <h1 className="page-title text-xl sm:text-2xl mt-1.5">
            Visual Anomaly &amp; Fraud Intelligence Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Multi-angle visual diagnostics: Histograms, 4-Quadrant Cartesian Crosshairs (+X, -X, +Y, -Y), Temporal Calendar Heatmaps &amp; 3D Contour Surfaces
          </p>
        </div>

        {/* Global Controls & Filters */}
        <div className="flex flex-wrap items-center gap-3 glass-card p-3">
          <div>
            <label className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">Filter Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-sunken border border-surface-border rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/15 transition-colors"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
              <span>Min Risk Score</span>
              <span className="font-mono text-sky-400 font-bold tabular-nums">{minRisk}+</span>
            </div>
            <input
              type="range"
              min="0"
              max="85"
              step="5"
              value={minRisk}
              onChange={(e) => setMinRisk(Number(e.target.value))}
              className="accent-sky-500 h-1 bg-surface-raised rounded w-24 cursor-pointer"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setOnlyGhostBills(!onlyGhostBills)}
              className={`btn ${
                onlyGhostBills
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-surface-raised border border-surface-border text-slate-400 hover:text-white hover:border-surface-borderHover'
              }`}
            >
              {onlyGhostBills ? "Ghost Bills Only (≤3d)" : "Highlight Ghost Bills"}
            </button>
          </div>
        </div>
      </div>

      {/* QUICK SUMMARY KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-tile animate-fade-in-up">
          <div className="stat-label">March Fiscal Surge Ratio</div>
          <div className="stat-value text-amber-400 text-xl mt-1">
            {calendarData.stats?.march_dumping_ratio || '3.4'}×
          </div>
          <div className="text-[10px] text-slate-500 mt-1">vs rest of the year average</div>
        </div>
        <div className="stat-tile animate-fade-in-up">
          <div className="stat-label">Total Fiscal Outliers</div>
          <div className="stat-value text-rose-400 text-xl mt-1">
            {calendarData.stats?.total_fiscal_anomalies || '142'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Flagged with CRS ≥ 70</div>
        </div>
        <div className="stat-tile animate-fade-in-up">
          <div className="stat-label">Cartel &amp; Ghost Quadrant (Q1)</div>
          <div className="stat-value text-sky-400 text-xl mt-1">
            {scatterData.points.filter(p => p.quadrant === 'Q1_CRITICAL').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">High Cost + Hyper Velocity</div>
        </div>
        <div className="stat-tile animate-fade-in-up">
          <div className="stat-label">Monopoly Concentration</div>
          <div className="stat-value text-emerald-400 text-xl mt-1">
            {waterfallData[0]?.share_pct || '34.2'}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Controlled by top single agency</div>
        </div>
      </div>

      {/* SECTION 1: HISTOGRAM (DISTRIBUTION OF RISK SCORES & COST BRACKETS) */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                CHART 1: HISTOGRAM
              </span>
              <span className="text-xs text-slate-400">Risk Score & Expenditure Distribution</span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <BarChartIcon className="w-4 h-4 text-emerald-400" />
              Composite Risk Score Frequency Histogram
            </h3>
          </div>
          <div className="text-xs text-slate-400">
            Clear separation between normal baseline ($0-40$) vs critical tail anomalies ($75-100$)
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Score Frequency Bars */}
          <div className="lg:col-span-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData.risk_bins} margin={{ top: 15, right: 15, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="bin" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-surface-sunken/95 backdrop-blur-sm border border-surface-border p-3 rounded-xl shadow-card-hover text-xs space-y-1">
                          <div className="font-bold text-white">{d.bin}</div>
                          <div className="text-slate-300">Total Projects: <strong className="text-sky-400">{d.count}</strong></div>
                          <div className="text-slate-300">Total Spend: <strong className="text-emerald-400">{formatINR(d.total_spend_inr)}</strong></div>
                          {d.ghost_count > 0 && (
                            <div className="text-rose-400 font-bold">Ghost Bills (≤3d): {d.ghost_count}</div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {histogramData.risk_bins.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost Bracket Anomaly Breakdown */}
          <div className="bg-surface-sunken/60 border border-surface-border p-4 rounded-xl flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                Cost Bracket Risk Breakdown
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                Normal vs Anomaly count per contract size
              </p>
              <div className="space-y-2.5">
                {histogramData.cost_bins.map((c, i) => {
                  const pct = c.total_count > 0 ? ((c.anomaly_count / c.total_count) * 100).toFixed(1) : 0;
                  return (
                    <div key={i} className="text-xs space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span className="font-medium">{c.bracket}</span>
                        <span className="font-mono text-slate-400">{c.anomaly_count} / {c.total_count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden flex">
                        <div style={{ width: `${100 - pct}%` }} className="bg-emerald-500/70 h-full"></div>
                        <div style={{ width: `${pct}%` }} className="bg-rose-500 h-full"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pt-3 border-t border-surface-border flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal Baseline</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Flagged Outlier</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 4-QUADRANT CARTESIAN CROSSHAIR SCATTER PLOT (+X, -X, +Y, -Y) */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono font-bold">
                CHART 2: 4-QUADRANT CARTESIAN CROSSHAIR
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold">
                (+X, -X, +Y, -Y) Axes
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" />
              Cost Deviation vs Turnaround Velocity Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Crosshair centered at origin (0,0) baseline. Explicitly separates over-budget vs hyper-velocity anomalies.
            </p>
          </div>

          {/* Quadrant Quick Filters */}
          <div className="nav-pill-group text-xs">
            <button
              onClick={() => setSelectedQuadrant('ALL')}
              className={`nav-pill ${selectedQuadrant === 'ALL' ? 'nav-pill-active' : ''}`}
            >
              All 4 Quadrants
            </button>
            <button
              onClick={() => setSelectedQuadrant('Q1_CRITICAL')}
              className={`nav-pill ${selectedQuadrant === 'Q1_CRITICAL' ? 'bg-rose-500 text-white' : ''}`}
            >
              Q1 (+X, +Y)
            </button>
            <button
              onClick={() => setSelectedQuadrant('Q2_MICRO_SPLIT')}
              className={`nav-pill ${selectedQuadrant === 'Q2_MICRO_SPLIT' ? 'bg-amber-500 text-white' : ''}`}
            >
              Q2 (-X, +Y)
            </button>
            <button
              onClick={() => setSelectedQuadrant('Q3_COMPLIANT')}
              className={`nav-pill ${selectedQuadrant === 'Q3_COMPLIANT' ? 'bg-emerald-500 text-white' : ''}`}
            >
              Q3 (-X, -Y)
            </button>
          </div>
        </div>

        {/* Quadrant Banner Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-rose-950/30 border border-rose-800/40 p-2.5 rounded-xl">
            <div className="font-bold text-rose-400 flex items-center gap-1">
              <span>Q1 (+X, +Y)</span>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="text-[11px] text-slate-300 font-medium">Cartel & Ghost Velocity</div>
            <div className="text-[10px] text-slate-400">Extreme Overprice + ≤3d finish</div>
          </div>
          <div className="bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-xl">
            <div className="font-bold text-amber-400">Q2 (-X, +Y)</div>
            <div className="text-[11px] text-slate-300 font-medium">Rapid Micro-Splitting</div>
            <div className="text-[10px] text-slate-400">Low Cost + Instant Invoicing</div>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-800/40 p-2.5 rounded-xl">
            <div className="font-bold text-emerald-400">Q3 (-X, -Y)</div>
            <div className="text-[11px] text-slate-300 font-medium">Compliant Baseline</div>
            <div className="text-[10px] text-slate-400">Normal Lead Time & Cost</div>
          </div>
          <div className="bg-blue-950/30 border border-blue-800/40 p-2.5 rounded-xl">
            <div className="font-bold text-sky-400">Q4 (+X, -Y)</div>
            <div className="text-[11px] text-slate-300 font-medium">Stalled Mega-Projects</div>
            <div className="text-[10px] text-slate-400">High Cost + Severe Delays</div>
          </div>
        </div>

        {/* 4-Quadrant Crosshair Scatter Chart */}
        <div className="h-96 relative bg-surface-sunken/70 border border-surface-border rounded-xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 35, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              
              {/* X & Y Axes centered on Origin with + and - labels */}
              <XAxis
                type="number"
                dataKey="x"
                name="Cost Deviation"
                unit="%"
                domain={[-100, 350]}
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                label={{ value: "← -X (Under-Budget) | +X (Over-Budget vs Peer Median %) →", position: "insideBottom", offset: -20, fill: "#94a3b8", fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Turnaround Velocity"
                unit="%"
                domain={[-100, 350]}
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                label={{ value: "← -Y (Stalled Latency) | +Y (Hyper Velocity Surge %) →", angle: -90, position: "insideLeft", offset: -15, fill: "#94a3b8", fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="composite_risk" range={[40, 260]} />

              {/* PROMINENT '+' CROSSHAIR REFERENCE LINES AT ORIGIN (0,0) */}
              <ReferenceLine x={0} stroke="#38bdf8" strokeWidth={2.5} strokeDasharray="4 4" label={{ value: "+Y Axis", position: "insideTopLeft", fill: "#38bdf8", fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#38bdf8" strokeWidth={2.5} strokeDasharray="4 4" label={{ value: "+X Axis", position: "insideBottomRight", fill: "#38bdf8", fontSize: 11 }} />
              <ReferenceLine x={150} stroke="#f43f5e" strokeDasharray="2 2" strokeOpacity={0.6} />
              <ReferenceLine y={200} stroke="#f43f5e" strokeDasharray="2 2" strokeOpacity={0.6} />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-surface-sunken/95 backdrop-blur-sm border border-surface-border p-3 rounded-xl shadow-card-hover text-xs space-y-1.5 max-w-xs">
                        <div className="font-bold text-white border-b border-surface-border pb-1">{d.name || d.id}</div>
                        <div className="text-slate-300">Category: <strong className="text-sky-400">{d.category}</strong></div>
                        <div className="text-slate-300">Agency: <span className="text-slate-200">{d.agency}</span></div>
                        <div className="text-slate-300">Cost: <strong className="text-emerald-400">{formatINR(d.cost_inr)}</strong> ({d.x_dev_pct > 0 ? `+${d.x_dev_pct}%` : `${d.x_dev_pct}%`})</div>
                        <div className="text-slate-300">Execution Days: <strong className="text-amber-400">{d.delta_days} days</strong></div>
                        <div className="flex items-center justify-between pt-1 border-t border-surface-border">
                          <span className="font-bold text-slate-300">Risk Score:</span>
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs tabular-nums ${
                            d.composite_risk >= 75 ? 'bg-rose-500/20 text-rose-400' : (d.composite_risk >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400')
                          }`}>
                            {d.composite_risk.toFixed(1)} / 100
                          </span>
                        </div>
                        {d.is_ghost && (
                          <div className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded border border-rose-500/30 text-[11px]">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> Zero-Latency Ghost Bill (≤3 Days)
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">{d.quadrant_label}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Scatter name="Projects" data={filteredScatterPoints} cursor="pointer">
                {filteredScatterPoints.map((entry, index) => {
                  let fillColor = "#10b981";
                  if (entry.is_ghost || entry.quadrant === 'Q1_CRITICAL') fillColor = "#ef4444";
                  else if (entry.quadrant === 'Q2_MICRO_SPLIT') fillColor = "#f59e0b";
                  else if (entry.quadrant === 'Q4_STALLED_MEGA') fillColor = "#38bdf8";

                  return (
                    <Cell
                      key={`scatter-cell-${index}`}
                      fill={fillColor}
                      fillOpacity={entry.is_ghost ? 0.95 : 0.75}
                      stroke={entry.is_ghost ? "#ffffff" : "none"}
                      strokeWidth={entry.is_ghost ? 2 : 0}
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: CALENDAR HEATMAP (TEMPORAL ACTIVITY & MARCH DUMPING MATRIX) */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono font-bold">
                CHART 3: CALENDAR HEATMAP
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold">
                Fiscal Velocity & Surge Matrix
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              Annual Expenditure & Anomaly Intensity Heatmap
            </h3>
            <p className="text-xs text-slate-400">
              Interactive 12-Month Calendar Grid. Pinpoints rapid end-of-financial-year (March Madness) fund dumping.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Intensity:</span>
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span className="w-3 h-3 rounded bg-surface-raised border border-surface-border"></span>
              <span className="w-3 h-3 rounded bg-emerald-700"></span>
              <span className="w-3 h-3 rounded bg-amber-500"></span>
              <span className="w-3 h-3 rounded bg-orange-600"></span>
              <span className="w-3 h-3 rounded bg-rose-600 animate-pulse"></span>
              <span className="text-slate-400 ml-1">Critical</span>
            </div>
          </div>
        </div>

        {/* Monthly Bar Overview + Daily Activity Heatmap Matrix */}
        <div className="space-y-4">
          {/* Monthly Spend Bar Strip */}
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calendarData.monthly_summary} margin={{ top: 10, right: 15, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => formatINR(v)} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-surface-sunken/95 backdrop-blur-sm border border-surface-border p-2.5 rounded-xl shadow-card-hover text-xs space-y-1">
                          <div className="font-bold text-white">{d.month} Expenditure</div>
                          <div className="text-slate-300">Total Sanctioned: <strong className="text-emerald-400">{formatINR(d.total_spend_inr)}</strong></div>
                          <div className="text-slate-300">Works Count: <strong className="text-sky-400">{d.works_count}</strong></div>
                          <div className="text-slate-300">High Risk Anomalies: <strong className="text-rose-400">{d.anomaly_count}</strong></div>
                          {d.is_fiscal_surge && (
                            <div className="flex items-center gap-1.5 text-amber-400 font-bold"><Flame className="w-3.5 h-3.5 shrink-0" /> Fiscal Surge Spike Month</div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total_spend_inr" radius={[6, 6, 0, 0]}>
                  {calendarData.monthly_summary?.map((entry, index) => (
                    <Cell
                      key={`month-cell-${index}`}
                      fill={entry.month === 'Mar' ? '#f43f5e' : (entry.anomaly_count >= 3 ? '#f59e0b' : '#0284c7')}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Calendar Matrix Grid (Days 1 to 31 across Months) */}
          <div className="bg-surface-sunken/80 border border-surface-border p-3.5 rounded-xl overflow-x-auto">
            <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>DAILY EXPENDITURE & ANOMALY DENSITY MATRIX</span>
              <span className="text-slate-500 font-mono text-[10px]">Days 1 → 31 (Horizontal) × Months (Vertical)</span>
            </div>
            
            <div className="min-w-[700px] space-y-1.5">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, mIdx) => {
                const monthCells = calendarData.daily_matrix?.filter(d => d.month === m) || [];
                return (
                  <div key={m} className="flex items-center gap-1.5">
                    <span className="w-8 text-[11px] font-mono font-medium text-slate-400">{m}</span>
                    <div className="flex items-center gap-1 flex-1">
                      {Array.from({ length: 31 }, (_, dayIdx) => {
                        const cell = monthCells.find(c => c.day === dayIdx + 1);
                        const lvl = cell?.intensity_level || 0;
                        let bgClass = "bg-surface-raised border-surface-border";
                        if (lvl === 1) bgClass = "bg-emerald-900/60 border-emerald-800/60";
                        if (lvl === 2) bgClass = "bg-emerald-600 border-emerald-500";
                        if (lvl === 3) bgClass = "bg-amber-500 border-amber-400";
                        if (lvl === 4) bgClass = "bg-rose-600 border-rose-500 shadow-rose-500/50";

                        return (
                          <div
                            key={dayIdx}
                            title={`${m} ${dayIdx + 1}: ${cell?.works_count || 0} works, ${formatINR(cell?.total_spend_inr || 0)}`}
                            className={`flex-1 h-3.5 rounded-[3px] border transition-transform hover:scale-125 cursor-pointer ${bgClass}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: 3D CONTOUR SURFACE ANOMALY TERRAIN (MATPLOTLIB CONTOURF3D STYLE) */}
      <ContourHeatmap3D dataPoints={scatterData.points} />

      {/* SECTION 5: MULTI-SIGNAL RADAR & PARETO WATERFALL MONOPOLY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Profiler */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-bold">
                CHART 5A: SPIDER RADAR
              </span>
              <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                4-Dimension Multi-Signal Profiler
              </h3>
            </div>
            
            {/* Agency Selector */}
            <select
              value={selectedRadarAgency}
              onChange={(e) => setSelectedRadarAgency(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-sunken border border-surface-border rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/15 transition-colors max-w-[180px] truncate"
            >
              {radarData.agencies?.filter(a => !a.agency_name.includes("Benchmark")).map(a => (
                <option key={a.agency_name} value={a.agency_name}>
                  {a.agency_name} (CRS: {a.composite_risk})
                </option>
              ))}
            </select>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={formattedRadarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 9 }} />
                <Radar name="State Compliant Benchmark" dataKey="baseline" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                <Radar name={selectedRadarAgency || "Selected Agency"} dataKey="agency" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.45} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-surface-sunken/95 backdrop-blur-sm border border-surface-border p-2.5 rounded-xl shadow-card-hover text-xs space-y-1">
                          <div className="font-bold text-white">{payload[0]?.payload?.metric}</div>
                          <div className="text-emerald-400">Benchmark: {payload[0]?.payload?.baseline} / 100</div>
                          <div className="text-rose-400 font-bold">{selectedRadarAgency}: {payload[0]?.payload?.agency} / 100</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pareto Waterfall Monopoly */}
        <div className="glass-card p-5 space-y-4">
          <div className="border-b border-surface-border pb-3">
            <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-mono font-bold">
              CHART 5B: PARETO WATERFALL
            </span>
            <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <Building className="w-4 h-4 text-violet-400" />
              Contractor Monopoly & Cumulative Risk
            </h3>
            <p className="text-xs text-slate-400">
              Cumulative fund share vs high-risk anomalies concentrated in top agencies
            </p>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
            {waterfallData.map((a, i) => (
              <div key={i} className="bg-surface-sunken/70 border border-surface-border p-2.5 rounded-xl text-xs space-y-1.5 hover:border-surface-borderHover transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 truncate max-w-[220px]">
                    #{i + 1} {a.agency_name}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">{formatINR(a.spend_inr)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Single Share: <strong className="text-sky-400">{a.share_pct}%</strong></span>
                  <span>Cumulative Pareto: <strong className="text-violet-400">{a.cumulative_share_pct}%</strong></span>
                  {a.anomaly_count > 0 && (
                    <span className="flex items-center gap-1 text-rose-400 font-bold"><AlertTriangle className="w-3 h-3 shrink-0" /> {a.anomaly_count} Anomalies</span>
                  )}
                </div>
                <div className="w-full bg-surface-raised h-1.5 rounded-full overflow-hidden flex">
                  <div style={{ width: `${a.cumulative_share_pct}%` }} className="bg-gradient-to-r from-sky-500 via-violet-500 to-rose-500 h-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
