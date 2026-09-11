import React, { useEffect, useState } from 'react';
import { Globe2, IndianRupee, FileStack, Building2, Info, Eye } from 'lucide-react';
import { fetchPublicSummary } from '../../api/liveClient';

function crores(n) {
  if (!n) return '0';
  return (n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

const STATUS_STYLES = {
  'Under Review': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Under Further Investigation': 'bg-red-500/15 text-red-400 border-red-500/30',
  'Reviewed — No Further Action': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export default function PublicTransparency() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchPublicSummary().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <div className="p-8 text-center text-xs text-slate-500 font-mono">Loading public transparency view...</div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center mx-auto mb-3 shadow-glow">
          <Globe2 className="w-6 h-6 text-white" />
        </div>
        <h2 className="page-title text-xl sm:text-2xl">MPLADS Public Transparency</h2>
        <p className="text-sm text-slate-400 mt-2">Where is public money going, and which agencies currently have spending under review?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
        <div className="stat-tile text-center">
          <IndianRupee className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <div className="stat-value">₹{crores(data.total_disbursed_inr)} Cr</div>
          <div className="stat-label mt-1">Total Funds Tracked</div>
        </div>
        <div className="stat-tile text-center">
          <FileStack className="w-5 h-5 text-sky-400 mx-auto mb-2" />
          <div className="stat-value">{data.total_works.toLocaleString()}</div>
          <div className="stat-label mt-1">Works Sanctioned</div>
        </div>
        <div className="stat-tile text-center">
          <Building2 className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
          <div className="stat-value">{data.total_agencies.toLocaleString()}</div>
          <div className="stat-label mt-1">Agencies Monitored</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-200 font-display">Agencies with Spending Currently Flagged</h3>
        </div>

        <div className="glass-card overflow-hidden">
          {data.flagged_agencies.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No agencies are currently flagged.</div>
          ) : (
            <div className="divide-y divide-surface-border">
              {data.flagged_agencies.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors duration-200">
                  <div>
                    <div className="text-sm font-medium text-slate-100">{a.agency_name}</div>
                    <div className="text-[11px] text-slate-500">{a.state}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${STATUS_STYLES[a.status] || 'bg-surface-raised text-slate-300 border-surface-border'}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 mt-4 text-[11px] text-slate-500 px-1">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>
            "Flagged" means this agency's spending pattern statistically deviates from its own history and is being reviewed
            by an administrator and the local MP &mdash; it is <span className="text-slate-300 font-semibold">not</span> a finding
            of fraud or corruption.
          </p>
        </div>
      </div>
    </div>
  );
}
