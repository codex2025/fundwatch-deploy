import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Building, MapPin, User, Calendar, Activity, Sparkles,
  TrendingUp, ShieldAlert, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';
import SpendTimelineChart from '../components/SpendTimelineChart';
import WhatChangedView from '../components/WhatChangedView';
import WorksTable from '../components/WorksTable';
import RiskBadge from '../components/RiskBadge';
import { fetchAgencyDetail, fetchAgencyWorks } from '../api/client';

function formatINR(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

export default function AgencyDrilldown({
  selectedAgency,
  onBack,
  onInvestigate
}) {
  const [agencyData, setAgencyData] = useState(null);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(selectedAgency?.year_month || null);

  useEffect(() => {
    async function loadData() {
      if (!selectedAgency) return;
      setLoading(true);
      const detail = await fetchAgencyDetail(selectedAgency.agency_id);
      const m = selectedAgency.year_month || detail.months?.[detail.months.length - 1]?.year_month;
      setSelectedMonth(m);

      const worksList = await fetchAgencyWorks(selectedAgency.agency_id, m);
      setAgencyData(detail);
      setWorks(worksList);
      setLoading(false);
    }
    loadData();
  }, [selectedAgency]);

  const handleMonthChange = async (ym) => {
    setSelectedMonth(ym);
    if (selectedAgency) {
      const worksList = await fetchAgencyWorks(selectedAgency.agency_id, ym);
      setWorks(worksList);
    }
  };

  if (!selectedAgency) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        <Building className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
        <p className="text-sm font-medium">Select an implementing agency from the Ranked Dashboard to view its baseline analysis.</p>
        <button onClick={onBack} className="btn-primary mt-4">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentMonthData = agencyData?.months?.find(m => m.year_month === selectedMonth) || selectedAgency;
  const isSpike = currentMonthData?.is_flagged || selectedAgency.risk_score >= 45;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in-up">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="btn-secondary shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Registry</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="page-title text-lg sm:text-xl">
                {selectedAgency.agency_name}
              </h2>
              <RiskBadge
                score={selectedAgency.risk_score}
                tier={selectedAgency.risk_tier}
                isColdStart={selectedAgency.signals?.insufficient_history}
                size="sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Building className="w-3.5 h-3.5 text-sky-400" />
                {selectedAgency.agency_id}
              </span>
              <span className="text-slate-700">•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                {selectedAgency.district}, {selectedAgency.state} ({selectedAgency.constituency})
              </span>
            </div>
          </div>
        </div>

        {/* Action Button: Generate Copilot Brief */}
        <button
          onClick={() => onInvestigate(selectedAgency)}
          className="btn-primary shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Copilot Brief</span>
        </button>
      </div>

      {/* 4 Quick Baseline Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-tile">
          <div className="stat-label">Historical Baseline Spend</div>
          <div className="stat-value !text-2xl text-emerald-400 mt-1.5">
            {formatINR(agencyData?.historical_median || selectedAgency.historical_median_monthly_inr || 1500000)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Rolling median across prior months</div>
        </div>

        <div className="stat-tile">
          <div className="stat-label truncate" title={`Flagged Month Spend (${selectedMonth})`}>Flagged Month Spend ({selectedMonth})</div>
          <div className="stat-value !text-2xl text-red-400 mt-1.5">
            {formatINR(selectedAgency.monthly_amount)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono tabular-nums">
            {selectedAgency.signals?.velocity_ratio}x historical normal
          </div>
        </div>

        <div className="stat-tile">
          <div className="stat-label">Robust Modified Z-Score</div>
          <div className="stat-value !text-2xl text-purple-400 mt-1.5 tabular-nums">
            {selectedAgency.signals?.modified_z_score} MAD
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Threshold: &gt;3.5 is severe anomaly</div>
        </div>

        <div className="stat-tile">
          <div className="stat-label truncate" title={`Peer Comparison (${selectedAgency.state})`}>Peer Comparison ({selectedAgency.state})</div>
          <div className="stat-value !text-2xl text-sky-400 mt-1.5 tabular-nums">
            {selectedAgency.signals?.peer_ratio}x
          </div>
          <div className="text-[10px] text-slate-500 mt-1">vs same-category peer median</div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-surface-border pb-3 gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Spend Timeline & Baseline Violation Visualizer</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Bar colors demarcate normal operating expenditure vs statistically significant acceleration spikes
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500">Focus Month:</span>
            <select
              value={selectedMonth || ''}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="input-field !w-auto font-mono text-sky-400 py-1.5"
            >
              {agencyData?.months?.map(m => (
                <option key={m.year_month} value={m.year_month}>
                  {m.year_month} {m.is_flagged ? '(Spike)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <SpendTimelineChart
          months={agencyData?.months || []}
          historicalMedian={agencyData?.historical_median || selectedAgency.historical_median_monthly_inr}
          iqrUpperFence={agencyData?.iqr_upper_fence}
          selectedMonth={selectedMonth}
        />
      </div>

      {/* "What Changed?" Surge Decomposition */}
      <WhatChangedView
        anomaly={selectedAgency}
        historicalMedian={agencyData?.historical_median}
      />

      {/* Granular Works Table for the selected month */}
      <WorksTable
        works={works.length > 0 ? works : selectedAgency.top_contributing_works || []}
        flaggedMonth={selectedMonth}
        agencyName={selectedAgency.agency_name}
      />
    </div>
  );
}
