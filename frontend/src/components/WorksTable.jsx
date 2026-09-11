import React, { useState } from 'react';
import { Search, CheckCircle2, AlertCircle, Image as ImageIcon, ExternalLink, Filter } from 'lucide-react';

function formatINR(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export default function WorksTable({ works = [], flaggedMonth, agencyName }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const categories = ['ALL', ...new Set(works.map(w => w.category || w.work_category).filter(Boolean))];

  const filteredWorks = works.filter(w => {
    const desc = (w.description || w.work_name || w.work_description || '').toLowerCase();
    const wId = (w.work_id || '').toLowerCase();
    const cat = (w.category || w.work_category || '').toLowerCase();
    const matchesSearch = desc.includes(searchTerm.toLowerCase()) || wId.includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || (w.category || w.work_category) === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalFilteredAmount = filteredWorks.reduce((sum, w) => sum + (w.amount || w.sanction_amount || 0), 0);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-surface-border bg-surface-raised/40 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
            <span>Granular Sanctioned Works</span>
            {flaggedMonth && (
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-mono">
                {flaggedMonth}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Underlying MPLADS projects driving disbursement ({filteredWorks.length} works, total: <span className="text-sky-400 font-mono font-semibold tabular-nums">{formatINR(totalFilteredAmount)}</span>)
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search works or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-8"
            />
          </div>

          {categories.length > 2 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field !w-auto shrink-0"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-surface-sunken/70 text-[11px] text-slate-400 uppercase tracking-wider border-b border-surface-border">
            <tr>
              <th className="px-4 py-3 font-semibold">Work ID</th>
              <th className="px-4 py-3 font-semibold">Description & Category</th>
              <th className="px-4 py-3 font-semibold text-right">Sanction Amount</th>
              <th className="px-4 py-3 font-semibold text-center">Date</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
              <th className="px-4 py-3 font-semibold text-center">Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredWorks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-mono">
                  No sanctioned works match the filter criteria.
                </td>
              </tr>
            ) : (
              filteredWorks.map((work, idx) => {
                const amount = work.amount || work.sanction_amount || 0;
                const desc = work.description || work.work_name || work.work_description || "MPLADS Sanctioned Project";
                const cat = work.category || work.work_category || "Infrastructure";
                const wId = work.work_id || `WS-LUD-${idx+1000}`;
                const dt = work.sanction_date || "2023-09-15";
                const hasProof = work.has_image_proof;

                return (
                  <tr key={wId + idx} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-sky-400 font-semibold whitespace-nowrap">
                      {wId}
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="font-medium text-slate-200">{desc}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 font-medium">
                          {cat}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-100 tabular-nums">{formatINR(amount)}</div>
                      <div className="text-[10px] text-slate-500 font-mono tabular-nums">₹{amount.toLocaleString('en-IN')}</div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap font-mono text-slate-400 text-[11px] tabular-nums">
                      {dt}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Sanctioned
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {hasProof ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px]" title="Field photo proof verified on MPLADS portal">
                          <ImageIcon className="w-3 h-3" />
                          Photo Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[10px]" title="No photo uploaded yet">
                          <AlertCircle className="w-3 h-3 text-slate-500" />
                          Pending Upload
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
