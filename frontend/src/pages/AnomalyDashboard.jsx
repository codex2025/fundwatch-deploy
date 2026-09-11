import React, { useState, useMemo } from 'react';
import {
  Search, ArrowUpDown, TrendingUp, AlertTriangle,
  Download, Eye, Sparkles, MapPin, Building,
  Activity, HelpCircle
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';

function formatINR(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

export default function AnomalyDashboard({
  anomalies = [],
  stats,
  onSelectAnomaly,
  onInvestigate
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [minRiskScore, setMinRiskScore] = useState(30);
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [sortField, setSortField] = useState('risk_score');
  const [sortAsc, setSortAsc] = useState(false);
  const [showColdStartOnly, setShowColdStartOnly] = useState(false);

  // Extract unique states and months
  const states = useMemo(() => ['ALL', ...new Set(anomalies.map(a => a.state).filter(Boolean))], [anomalies]);
  const months = useMemo(() => ['ALL', ...new Set(anomalies.map(a => a.year_month).filter(Boolean))].sort().reverse(), [anomalies]);

  // Filtered and Sorted anomalies
  const filteredAnomalies = useMemo(() => {
    return anomalies
      .filter(a => {
        const matchesSearch =
          a.agency_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.constituency?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesState = selectedState === 'ALL' || a.state.toLowerCase() === selectedState.toLowerCase();
        const matchesMonth = selectedMonth === 'ALL' || a.year_month === selectedMonth;
        const matchesScore = a.risk_score >= minRiskScore;
        const isColdStart = a.signals?.insufficient_history;
        const matchesColdStart = showColdStartOnly ? isColdStart : true;

        return matchesSearch && matchesState && matchesMonth && matchesScore && matchesColdStart;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (sortField === 'velocity') {
          valA = a.signals?.velocity_ratio || 0;
          valB = b.signals?.velocity_ratio || 0;
        }
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [anomalies, searchTerm, selectedState, minRiskScore, selectedMonth, sortField, sortAsc, showColdStartOnly]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Anomaly ID", "Agency Name", "State", "District", "Month", "Risk Score", "Risk Tier", "Spend INR", "Baseline INR", "Velocity Ratio", "Z-Score", "Primary Reason"];
    const rows = filteredAnomalies.map(a => [
      a.anomaly_id,
      `"${a.agency_name}"`,
      a.state,
      a.district,
      a.year_month,
      a.risk_score,
      a.risk_tier,
      a.monthly_amount,
      a.historical_median_monthly_inr,
      a.signals?.velocity_ratio,
      a.signals?.modified_z_score,
      `"${a.primary_flag_reason}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fundwatch_flagged_anomalies_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="animate-fade-in-up">
        <p className="page-eyebrow">Screen 1 · Ranked Registry</p>
        <h1 className="page-title text-2xl sm:text-3xl mt-1">Spending-Anomaly Registry</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Every agency ranked by composite risk score, computed against its own historical baseline.
        </p>
      </div>

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
        <div className="stat-tile relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-sky-500/10 rounded-full blur-xl group-hover:bg-sky-500/20 transition-all"></div>
          <div className="flex items-center justify-between stat-label">
            <span>MPLADS Works Scanned</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 stat-value">
            {stats?.total_works_analyzed?.toLocaleString() || '1,579'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold">100% Normalized</span> across 5 states
          </div>
        </div>

        <div className="stat-tile relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
          <div className="flex items-center justify-between stat-label">
            <span>Implementing Agencies</span>
            <Building className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 stat-value">
            {stats?.total_agencies_monitored || '37'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Fuzzy-matched from 161 raw variants
          </div>
        </div>

        <div className="stat-tile relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-red-500/10 rounded-full blur-xl group-hover:bg-red-500/20 transition-all"></div>
          <div className="flex items-center justify-between stat-label">
            <span>Flagged Surges &amp; Outliers</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 stat-value text-red-400 flex items-baseline gap-2">
            <span>{filteredAnomalies.length}</span>
            <span className="text-xs font-normal text-slate-400 font-sans">
              ({anomalies.filter(a => a.risk_score >= 80).length} Critical)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            MAD Z-Score &gt; 3.5 or Velocity &gt; 3.0x
          </div>
        </div>

        <div className="stat-tile relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center justify-between stat-label">
            <span>Total Disbursed Capital</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 stat-value text-emerald-400">
            {formatINR(stats?.total_disbursed_inr || 1820000000)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Across active parliamentary terms
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="glass-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by agency, district, state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            <button onClick={handleExportCSV} className="btn-secondary">
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters & Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-surface-border">
          {/* State Filter */}
          <div>
            <label className="block section-label mb-1.5 normal-case tracking-normal font-semibold text-slate-400">
              <MapPin className="w-3 h-3 inline mr-1 -mt-0.5" />State / UT
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="input-field"
            >
              {states.map(st => (
                <option key={st} value={st}>{st === 'ALL' ? 'All States' : st}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <label className="block section-label mb-1.5 normal-case tracking-normal font-semibold text-slate-400">Reporting Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-field"
            >
              {months.map(m => (
                <option key={m} value={m}>{m === 'ALL' ? 'All Months' : m}</option>
              ))}
            </select>
          </div>

          {/* Min Risk Score Slider */}
          <div>
            <div className="flex justify-between items-center section-label mb-1.5 normal-case tracking-normal font-semibold text-slate-400">
              <span>Min Risk Score</span>
              <span className="font-mono text-sky-400 font-bold tabular-nums">{minRiskScore}+</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={minRiskScore}
              onChange={(e) => setMinRiskScore(Number(e.target.value))}
              className="w-full accent-sky-500 h-1.5 bg-surface-raised rounded-lg cursor-pointer mt-2.5"
            />
          </div>

          {/* Cold-start toggle */}
          <div className="flex items-end">
            <button
              onClick={() => setShowColdStartOnly(!showColdStartOnly)}
              className={`w-full nav-pill justify-center border ${
                showColdStartOnly
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-surface-sunken border-surface-border text-slate-400 hover:text-slate-300'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showColdStartOnly ? "Filtering: Cold-Start Only" : "Show Cold-Start (<3m)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Ranked Anomalies Table */}
      <div className="glass-card overflow-hidden animate-fade-in-up">
        <div className="p-4 border-b border-surface-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100 font-display">Ranked Spending-Anomaly Registry</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-raised text-slate-400 font-mono tabular-nums">
              {filteredAnomalies.length} cases
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Sorted by <span className="text-sky-400 font-semibold">{sortField} ({sortAsc ? 'Ascending' : 'Descending'})</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-surface-sunken/70 text-[11px] text-slate-500 uppercase tracking-wider border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 font-semibold w-12 text-center">#</th>
                <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-slate-300 transition-colors" onClick={() => handleSort('agency_name')}>
                  <div className="flex items-center gap-1">
                    <span>Implementing Agency</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-slate-300 transition-colors" onClick={() => handleSort('year_month')}>
                  <div className="flex items-center gap-1">
                    <span>Month</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold text-right cursor-pointer select-none hover:text-slate-300 transition-colors" onClick={() => handleSort('monthly_amount')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Monthly Spend</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold text-center cursor-pointer select-none hover:text-slate-300 transition-colors" onClick={() => handleSort('velocity')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Velocity Surge</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold text-center cursor-pointer select-none hover:text-slate-300 transition-colors" onClick={() => handleSort('risk_score')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Composite Risk</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-mono">
                    No spending anomalies match the active filter criteria. Try lowering the risk threshold or clearing filters.
                  </td>
                </tr>
              ) : (
                filteredAnomalies.map((anom, idx) => {
                  const vel = anom.signals?.velocity_ratio || 1.0;
                  const modZ = anom.signals?.modified_z_score || 0.0;
                  const isCold = anom.signals?.insufficient_history;

                  return (
                    <tr
                      key={anom.anomaly_id || idx}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() => onSelectAnomaly(anom)}
                    >
                      <td className="px-4 py-3 text-center font-mono text-[11px] text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100 group-hover:text-sky-400 transition-colors flex items-center gap-2">
                          <span>{anom.agency_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{anom.district}, {anom.state}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-500 font-mono">{anom.agency_id}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 truncate max-w-sm italic">
                          {anom.primary_flag_reason}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                        {anom.year_month}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono font-bold text-slate-100 tabular-nums">{formatINR(anom.monthly_amount)}</div>
                        <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                          Med: {formatINR(anom.historical_median_monthly_inr)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono font-semibold text-xs tabular-nums ${
                          vel >= 4.0
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : vel >= 2.5
                            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                            : 'bg-surface-raised text-slate-300 border border-surface-border'
                        }`}>
                          {vel}x
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 tabular-nums">
                          {modZ} MAD-Z
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RiskBadge
                          score={anom.risk_score}
                          tier={anom.risk_tier}
                          isColdStart={isCold}
                          showLabel={false}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectAnomaly(anom)}
                            className="p-2 rounded-lg bg-surface-raised hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors"
                            title="View Agency Drilldown & Chart"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onInvestigate(anom)}
                            className="btn-primary py-1.5 px-2.5"
                            title="Generate Grounded Investigation Brief"
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>Copilot</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
