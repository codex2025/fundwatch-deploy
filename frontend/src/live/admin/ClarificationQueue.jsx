import React, { useEffect, useState } from 'react';
import { Inbox, RefreshCcw, ChevronRight, AlertTriangle } from 'lucide-react';
import { fetchCases, generateCases } from '../../api/liveClient';
import CaseStatusBadge from '../shared/CaseStatusBadge';

const FILTERS = [
  { key: 'ALL', label: 'All Cases' },
  { key: 'notice_drafted', label: 'Needs Approval' },
  { key: 'sent', label: 'Notice Sent' },
  { key: 'response_received', label: 'Response Received' },
  { key: 'mp_verified', label: 'MP Verified' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'escalated', label: 'Escalated' },
];

export default function ClarificationQueue({ onSelectCase }) {
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState(null);

  async function load(status) {
    setLoading(true);
    try {
      const data = await fetchCases(status);
      setCases(data || []);
    } catch (err) {
      console.error('Failed to load cases', err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(filter); }, [filter]);

  async function handleScan() {
    setScanning(true);
    setScanMsg(null);
    try {
      const result = await generateCases();
      setScanMsg(result.created > 0
        ? `Detected ${result.created} new case(s).`
        : 'No new agencies crossed the risk threshold.');
      load(filter);
    } catch (err) {
      setScanMsg('Scan failed: ' + err.message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Inbox className="w-4 h-4" />
            </div>
            <h2 className="page-title text-lg sm:text-xl">Clarification Queue</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xl">
            Every case here was auto-detected from a risk-score threshold breach. Nothing is sent to an agency until you approve it.
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="btn bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 text-purple-300 border border-purple-500/30 shrink-0"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning...' : 'Scan for New Risk Events'}</span>
        </button>
      </div>

      {scanMsg && (
        <div className="text-xs px-3.5 py-2.5 rounded-xl bg-surface-raised border border-surface-border text-slate-300 animate-fade-in-up">
          {scanMsg}
        </div>
      )}

      <div className="nav-pill-group overflow-x-auto w-fit max-w-full">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`nav-pill ${filter === f.key ? 'nav-pill-active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">No cases in this view.</div>
        ) : (
          <div className="divide-y divide-surface-border">
            {cases.map((c) => (
              <button
                key={c.case_id}
                onClick={() => onSelectCase(c.case_id)}
                className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors duration-200"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-100 truncate">{c.agency_name}</span>
                    <span className="text-[11px] font-mono text-slate-500">{c.case_id}</span>
                    {c.is_overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {c.state} &middot; Baseline violated: {c.trigger.baseline_violated}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-red-400 tabular-nums">{c.trigger.new_risk_score.toFixed(0)}/100</div>
                    <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                      {c.trigger.previous_risk_score.toFixed(0)} &rarr; {c.trigger.new_risk_score.toFixed(0)}
                    </div>
                  </div>
                  <CaseStatusBadge status={c.status} outcome={c.resolution?.outcome} overdue={c.is_overdue} size="sm" />
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
