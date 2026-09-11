import React, { useEffect, useState } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { fetchCompliance } from '../../api/liveClient';

function ScoreBar({ score }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${Math.max(score, 4)}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold text-slate-300 tabular-nums">{score}%</span>
    </div>
  );
}

function Tri({ value }) {
  if (value === null || value === undefined) return <HelpCircle className="w-3.5 h-3.5 text-slate-600" />;
  return value ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />;
}

export default function ComplianceReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompliance().then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  const flagged = rows.filter((r) => r.open_cases > 0);
  const avgScore = rows.length ? Math.round(rows.reduce((s, r) => s + r.compliance_score, 0) / rows.length) : 0;
  const overdueCount = rows.filter((r) => r.overdue).length;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <h2 className="page-title text-lg sm:text-xl">Compliance Report</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 max-w-xl">
          Is each agency following the required process &mdash; on-time responses, documentation, MP verification? This is separate from risk score.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-tile !p-3.5">
          <div className="stat-label">Agencies tracked</div>
          <div className="stat-value text-xl mt-1">{rows.length}</div>
        </div>
        <div className="stat-tile !p-3.5">
          <div className="stat-label">Avg. compliance</div>
          <div className="stat-value text-xl mt-1">{avgScore}%</div>
        </div>
        <div className="stat-tile !p-3.5">
          <div className="stat-label">Overdue responses</div>
          <div className="stat-value text-xl mt-1 !text-red-400">{overdueCount}</div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-surface-sunken/70 text-[11px] text-slate-400 uppercase tracking-wider border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Agency</th>
                <th className="px-4 py-3 font-semibold">Compliance Score</th>
                <th className="px-4 py-3 font-semibold text-center">Open Cases</th>
                <th className="px-4 py-3 font-semibold text-center">MP Verified</th>
                <th className="px-4 py-3 font-semibold text-center">Docs Submitted</th>
                <th className="px-4 py-3 font-semibold text-center">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-mono">Loading...</td></tr>
              ) : (flagged.length === 0 ? rows.slice(0, 15) : flagged).map((r) => (
                <tr key={r.agency_id} className="hover:bg-white/[0.03] transition-colors duration-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{r.agency_name}</div>
                    <div className="text-[11px] text-slate-500">{r.state}</div>
                  </td>
                  <td className="px-4 py-3"><ScoreBar score={r.compliance_score} /></td>
                  <td className="px-4 py-3 text-center font-mono tabular-nums">{r.open_cases}</td>
                  <td className="px-4 py-3 text-center"><div className="flex justify-center"><Tri value={r.mp_verified} /></div></td>
                  <td className="px-4 py-3 text-center"><div className="flex justify-center"><Tri value={r.documents_submitted} /></div></td>
                  <td className="px-4 py-3 text-center">
                    {r.overdue ? <span className="text-red-400 font-semibold">Yes</span> : <span className="text-slate-600">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
