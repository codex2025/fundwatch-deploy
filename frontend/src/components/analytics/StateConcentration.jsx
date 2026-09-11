import React, { useMemo } from 'react';
import { formatINR, formatCount } from '../../utils/format';
import { riskColorVar, riskBand } from '../../utils/risk';
import { cx } from '../ui';

/**
 * Geographic risk concentration.
 *
 * The dataset carries `state` reliably; `district` and `constituency` are
 * absent from anomalies.json (see REDESIGN_AUDIT §2.12), so this view is
 * scoped to the level we can actually evidence rather than rendering a map
 * keyed on empty strings.
 */
export default function StateConcentration({ anomalies, activeState = 'ALL', onSelectState }) {
  const rows = useMemo(() => {
    const byState = new Map();
    for (const a of anomalies) {
      if (!a.state) continue;
      const cur = byState.get(a.state) ?? {
        state: a.state, count: 0, flagged: 0, spend: 0, maxScore: 0, agencies: new Set(),
      };
      cur.count += 1;
      cur.spend += a.monthlyAmount ?? 0;
      cur.agencies.add(a.agencyId);
      if ((a.riskScore ?? 0) >= 70) cur.flagged += 1;
      cur.maxScore = Math.max(cur.maxScore, a.riskScore ?? 0);
      byState.set(a.state, cur);
    }
    const list = [...byState.values()].map((r) => ({
      ...r,
      agencyCount: r.agencies.size,
      flaggedShare: r.count ? (r.flagged / r.count) * 100 : 0,
    }));
    return list.sort((a, b) => b.flagged - a.flagged || b.maxScore - a.maxScore);
  }, [anomalies]);

  const maxFlagged = Math.max(1, ...rows.map((r) => r.flagged));

  if (!rows.length) {
    return <p className="px-4 py-8 text-center text-sm text-content-muted">No geographic data in range.</p>;
  }

  return (
    <div className="p-2">
      <table className="data-table density-compact">
        <caption className="sr-only">Risk concentration by state</caption>
        <thead>
          <tr>
            <th scope="col">State</th>
            <th scope="col" className="text-right">Agencies</th>
            <th scope="col" className="text-right">Flagged</th>
            <th scope="col" className="text-right">Disbursed</th>
            <th scope="col" style={{ width: 80 }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const band = riskBand(r.maxScore);
            const active = activeState === r.state;
            return (
              <tr
                key={r.state}
                aria-selected={active}
                className="cursor-pointer"
                onClick={() => onSelectState?.(active ? 'ALL' : r.state)}
              >
                <td>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-4 rounded-[1px] shrink-0"
                      style={{ background: riskColorVar(band.key) }}
                      aria-hidden="true"
                    />
                    <span className={cx('truncate', active ? 'text-content-primary font-medium' : 'text-content-primary')}>
                      {r.state}
                    </span>
                  </span>
                </td>
                <td className="text-right mono">{formatCount(r.agencyCount)}</td>
                <td className="text-right mono font-medium"
                    style={{ color: r.flagged > 0 ? riskColorVar('high') : 'var(--text-muted)' }}>
                  {formatCount(r.flagged)}
                </td>
                <td className="text-right mono">{formatINR(r.spend)}</td>
                <td>
                  <span className="block h-1.5 rounded-sm bg-bg-inset overflow-hidden" title={`${r.flagged} flagged of ${r.count} scored`}>
                    <span
                      className="block h-full rounded-sm"
                      style={{ width: `${(r.flagged / maxFlagged) * 100}%`, background: riskColorVar('high') }}
                    />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-content-muted px-3 py-2">
        “Flagged” counts agency-months scoring 70 or above. Select a state to filter the workspace.
      </p>
    </div>
  );
}
