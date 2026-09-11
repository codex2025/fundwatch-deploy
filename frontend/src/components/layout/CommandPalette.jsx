import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import { NAV_INDEX } from './navigation';
import { useWorkspace } from '../../app/WorkspaceContext';
import { formatMonth, formatINR } from '../../utils/format';
import { RiskScore, cx } from '../ui';

/**
 * Global search. Every result performs a real action -- opening an anomaly
 * selects it and routes to the investigation workspace, so search is a genuine
 * navigation surface rather than decoration (DESIGN.md §22).
 */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { anomalies, setSelectedId } = useWorkspace();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus after paint so the dialog is in the tree.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();

    const pages = NAV_INDEX
      .filter((i) => !q || i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q))
      .slice(0, q ? 4 : 6)
      .map((i) => ({
        kind: 'page',
        id: `page:${i.to}`,
        title: i.label,
        subtitle: i.group,
        run: () => navigate(i.to),
      }));

    const agencyMatches = q
      ? [...new Map(
          anomalies
            .filter((a) => a.agencyName.toLowerCase().includes(q) || a.agencyId.toLowerCase().includes(q))
            .map((a) => [a.agencyId, a])
        ).values()]
          .slice(0, 4)
          .map((a) => ({
            kind: 'agency',
            id: `agency:${a.agencyId}`,
            title: a.agencyName,
            subtitle: `${a.state || 'Unknown state'} · ${a.agencyId}`,
            run: () => navigate(`/agencies/${a.agencyId}`),
          }))
      : [];

    const anomalyMatches = q
      ? anomalies
          .filter((a) =>
            a.agencyName.toLowerCase().includes(q) ||
            a.id.toLowerCase().includes(q) ||
            a.month.includes(q) ||
            a.state.toLowerCase().includes(q)
          )
          .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
          .slice(0, 6)
          .map((a) => ({
            kind: 'anomaly',
            id: `anomaly:${a.id}`,
            title: a.agencyName,
            subtitle: `${formatMonth(a.month)} · ${formatINR(a.monthlyAmount)}`,
            score: a.riskScore,
            cold: a.insufficientHistory,
            run: () => {
              setSelectedId(a.id);
              navigate(`/investigation/${encodeURIComponent(a.id)}`);
            },
          }))
      : anomalies
          .slice()
          .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
          .slice(0, 5)
          .map((a) => ({
            kind: 'anomaly',
            id: `anomaly:${a.id}`,
            title: a.agencyName,
            subtitle: `${formatMonth(a.month)} · ${formatINR(a.monthlyAmount)}`,
            score: a.riskScore,
            cold: a.insufficientHistory,
            run: () => {
              setSelectedId(a.id);
              navigate(`/investigation/${encodeURIComponent(a.id)}`);
            },
          }));

    return [
      { label: q ? 'Anomalies' : 'Highest risk now', items: anomalyMatches },
      { label: 'Agencies', items: agencyMatches },
      { label: 'Go to', items: pages },
    ].filter((g) => g.items.length);
  }, [query, anomalies, navigate, setSelectedId]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  function onKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) { item.run(); onClose(); }
    }
  }

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  let cursor = -1;

  return (
    <div
      className="fixed inset-0 z-palette flex items-start justify-center pt-[10vh] px-4 bg-black/60 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search FundWatch"
        className="w-full max-w-xl bg-bg-secondary border border-line rounded-lg shadow-overlay overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 px-3 border-b border-line-subtle" style={{ height: 44 }}>
          <Search className="w-4 h-4 text-content-muted shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agencies, anomalies, months, or jump to a page…"
            aria-label="Search query"
            className="flex-1 bg-transparent border-0 outline-none text-md text-content-primary placeholder:text-content-muted"
          />
          <kbd className="mono text-2xs text-content-muted border border-line rounded-sm px-1 py-px">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] scroll-y py-2">
          {flat.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-content-muted">
              No matches for “{query}”.
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mb-1">
              <div className="label-meta px-3 py-1.5">{group.label}</div>
              {group.items.map((item) => {
                cursor += 1;
                const isActive = cursor === activeIndex;
                const myIndex = cursor;
                return (
                  <button
                    key={item.id}
                    data-active={isActive}
                    onMouseEnter={() => setActiveIndex(myIndex)}
                    onClick={() => { item.run(); onClose(); }}
                    className={cx(
                      'w-full flex items-center gap-3 px-3 h-10 text-left transition-colors',
                      isActive ? 'bg-bg-elevated' : 'hover:bg-bg-elevated/60'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-base text-content-primary truncate">{item.title}</div>
                      <div className="text-xs text-content-muted truncate">{item.subtitle}</div>
                    </div>
                    {item.kind === 'anomaly' && (
                      <RiskScore score={item.score} insufficientHistory={item.cold} size="sm" showLabel={false} />
                    )}
                    {isActive && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-content-muted shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
