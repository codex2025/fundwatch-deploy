import React, { useEffect, useState } from 'react';
import { BarChart3, IndianRupee, Building2, FileStack, Activity, Percent, Clock, Flame } from 'lucide-react';
import { fetchGovernance } from '../../api/liveClient';

function Tile({ icon: Icon, label, value, accent = 'text-sky-400' }) {
  return (
    <div className="stat-tile">
      <div className="flex items-center gap-2 text-slate-500 mb-2">
        <Icon className={`w-4 h-4 ${accent}`} />
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value text-2xl">{value}</div>
    </div>
  );
}

function crores(n) {
  if (!n) return '0';
  return (n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

export default function GovernanceReport() {
  const [g, setG] = useState(null);

  useEffect(() => {
    fetchGovernance().then(setG).catch(() => setG(null));
  }, []);

  if (!g) return <div className="p-8 text-center text-xs text-slate-500 font-mono">Loading governance overview...</div>;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h2 className="page-title text-lg sm:text-xl">Governance Report</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 max-w-xl">
          How well is the entire MPLADS oversight system operating &mdash; not any single agency.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Tile icon={IndianRupee} label="Total Disbursed" value={`Rs ${crores(g.total_disbursed_inr)} Cr`} accent="text-emerald-400" />
        <Tile icon={FileStack} label="Works Monitored" value={g.total_works_monitored.toLocaleString()} />
        <Tile icon={Building2} label="Agencies Monitored" value={g.total_agencies_monitored.toLocaleString()} />
        <Tile icon={Activity} label="Active Investigations" value={g.active_investigations} accent="text-amber-400" />
        <Tile icon={Flame} label="Escalated Cases" value={g.escalated_count} accent="text-red-400" />
        <Tile icon={Clock} label="Overdue Responses" value={g.overdue_count} accent="text-red-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-tile">
          <div className="flex items-center gap-2 text-slate-500 mb-1.5">
            <Percent className="w-4 h-4 text-sky-400" />
            <span className="stat-label">Resolution Rate</span>
          </div>
          <div className="stat-value text-xl">{g.resolution_rate ?? '--'}%</div>
          <p className="text-[11px] text-slate-500 mt-1">{g.resolved_count} of {g.total_cases} cases closed</p>
        </div>
        <div className="stat-tile">
          <div className="flex items-center gap-2 text-slate-500 mb-1.5">
            <Percent className="w-4 h-4 text-amber-400" />
            <span className="stat-label">MP Verification Rate</span>
          </div>
          <div className="stat-value text-xl">{g.mp_verification_rate ?? '--'}%</div>
          <p className="text-[11px] text-slate-500 mt-1">Cases with a completed MP sign-off</p>
        </div>
        <div className="stat-tile">
          <div className="flex items-center gap-2 text-slate-500 mb-1.5">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="stat-label">Avg. Resolution Time</span>
          </div>
          <div className="stat-value text-xl">{g.avg_resolution_days !== null ? `${g.avg_resolution_days} days` : '--'}</div>
          <p className="text-[11px] text-slate-500 mt-1">From detection to case closure</p>
        </div>
      </div>
    </div>
  );
}
