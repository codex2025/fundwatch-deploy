import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { EmptyState, SortableTh } from '../ui';
import { formatINR, formatINRExact, formatDate, formatCount } from '../../utils/format';

/**
 * Work-level evidence records.
 *
 * The previous version rendered a blue "Photo Verified" badge driven by
 * `has_image_proof`, a column that is computed in clean_pipeline.py but
 * DROPPED before clean_works.csv is written -- so the API defaulted it to True
 * and every work in the product claimed photographic proof that does not
 * exist (REDESIGN_AUDIT §2.2). The badge is gone until the column actually
 * ships. The `status` field below is real and comes from the source data.
 */
export default function WorksTable({ works = [] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState({ key: 'amount', asc: false });

  const categories = useMemo(
    () => ['ALL', ...new Set(works.map((w) => w.category).filter(Boolean))],
    [works]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = works.filter((w) => {
      if (category !== 'ALL' && w.category !== category) return false;
      if (!q) return true;
      return `${w.description} ${w.workId}`.toLowerCase().includes(q);
    });
    return list.sort((a, b) => {
      const pick = (r) => (sort.key === 'amount' ? (r.amount ?? -1)
        : sort.key === 'date' ? (r.date ?? '')
        : (r.description ?? '').toLowerCase());
      const va = pick(a); const vb = pick(b);
      if (va < vb) return sort.asc ? -1 : 1;
      if (va > vb) return sort.asc ? 1 : -1;
      return 0;
    });
  }, [works, query, category, sort]);

  const total = rows.reduce((s, w) => s + (w.amount ?? 0), 0);
  const handleSort = (key) => setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: false }));

  if (!works.length) {
    return <EmptyState title="No work records" description="No itemised works were returned for this period." />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-line-subtle">
        <div className="relative flex-1 min-w-[10rem] max-w-xs">
          <Search className="w-3.5 h-3.5 text-content-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            className="field pl-8"
            placeholder="Search works or ID…"
            aria-label="Search works"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {categories.length > 2 && (
          <select
            className="field w-auto"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'ALL' ? 'All categories' : c}</option>
            ))}
          </select>
        )}
        <span className="ml-auto text-xs text-content-muted">
          {formatCount(rows.length)} works ·{' '}
          <span className="mono text-content-secondary font-medium">{formatINR(total)}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table density-compact">
          <caption className="sr-only">Sanctioned works contributing to this month’s disbursement</caption>
          <thead>
            <tr>
              <th scope="col" style={{ width: 160 }}>Work ID</th>
              <SortableTh label="Description" sortKey="description" sort={sort} onSort={handleSort} />
              <SortableTh label="Amount" sortKey="amount" sort={sort} onSort={handleSort} align="right" width={140} />
              <SortableTh label="Date" sortKey="date" sort={sort} onSort={handleSort} width={110} />
              <th scope="col" style={{ width: 130 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.workId || w.description}>
                <td className="mono text-xs text-content-muted">{w.workId || '—'}</td>
                <td>
                  <div className="text-content-primary">{w.description || '—'}</div>
                  {w.category && w.category !== 'Uncategorised' && (
                    <div className="text-2xs text-content-muted mt-0.5">{w.category}</div>
                  )}
                </td>
                <td className="text-right">
                  <div className="mono font-medium text-content-primary">{formatINR(w.amount)}</div>
                  <div className="mono text-2xs text-content-muted">{formatINRExact(w.amount)}</div>
                </td>
                <td className="mono text-xs">{w.date ? formatDate(w.date) : '—'}</td>
                <td className="text-xs text-content-secondary">{w.status || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
