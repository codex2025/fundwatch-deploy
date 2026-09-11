import React, { useState, useEffect } from 'react';
import { Database, Search, Shield } from 'lucide-react';
import { fetchAliasAuditMap } from '../api/client';

export default function AuditLog() {
  const [aliasRecords, setAliasRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAliases() {
      setLoading(true);
      const data = await fetchAliasAuditMap();
      setAliasRecords(data || []);
      setLoading(false);
    }
    loadAliases();
  }, []);

  const filteredAliases = aliasRecords.filter(a => {
    const raw = (a.raw_agency_name || '').toLowerCase();
    const canon = (a.canonical_name || '').toLowerCase();
    const id = (a.canonical_agency_id || '').toLowerCase();
    const st = (a.state || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return raw.includes(q) || canon.includes(q) || id.includes(q) || st.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="page-eyebrow">Transparency Registry</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="p-1.5 rounded-lg bg-brand-gradient-soft text-sky-400 border border-sky-500/20">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="page-title text-lg sm:text-xl">
              Agency Fuzzy-Matching &amp; Alias Audit
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xl">
            Complete transparency into raw government name normalization and RapidFuzz clustering decisions.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search raw variants or agency IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-8"
          />
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card p-4 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Every merge decision is strictly logged to prevent agency fragmentation without silent black-box merges.
          </span>
        </div>
        <span className="glass-pill px-2.5 py-1 font-mono text-slate-400 tabular-nums shrink-0 w-fit">{filteredAliases.length} variants recorded</span>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-surface-sunken/70 text-[11px] text-slate-500 uppercase tracking-wider border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Raw Uncleaned Name</th>
                <th className="px-4 py-3 font-semibold">Canonical Target Name</th>
                <th className="px-4 py-3 font-semibold">Canonical Agency ID</th>
                <th className="px-4 py-3 font-semibold">Region</th>
                <th className="px-4 py-3 font-semibold text-center">Fuzzy Score</th>
                <th className="px-4 py-3 font-semibold">Merge Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500 font-mono">Loading audit records...</td>
                </tr>
              ) : filteredAliases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500 font-mono">
                    No alias records match search query.
                  </td>
                </tr>
              ) : (
                filteredAliases.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.03] transition-colors duration-150">
                    <td className="px-4 py-3 font-mono text-[11px] text-red-300/90">
                      "{item.raw_agency_name}"
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {item.canonical_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-sky-400 text-[11px] tabular-nums">
                      {item.canonical_agency_id}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.district}, {item.state}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-emerald-400 tabular-nums">
                      {item.match_score}%
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      <span className="glass-pill px-2 py-0.5 text-slate-300 text-[10px]">
                        {item.merge_reason}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
