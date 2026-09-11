import {
  LayoutGrid, AlertTriangle, TrendingUp, Building2,
  FileSearch, FolderOpen, Map,
  Database, ScrollText, Layers,
  Radio, Upload,
} from 'lucide-react';

/**
 * Information architecture (DESIGN.md §4).
 *
 * Every entry maps to a surface backed by real data. Nothing is listed here
 * that cannot answer a question from the data we actually hold.
 */
export const NAV_GROUPS = [
  {
    label: 'Intelligence',
    items: [
      { to: '/', label: 'Overview', icon: LayoutGrid, end: true,
        hint: 'Where risk is concentrated right now' },
      { to: '/anomalies', label: 'Anomalies', icon: AlertTriangle, countKey: 'flagged',
        hint: 'Ranked investigative queue' },
      { to: '/spending', label: 'Spending', icon: TrendingUp,
        hint: 'Velocity and trajectory against baseline' },
      { to: '/agencies', label: 'Agencies', icon: Building2,
        hint: 'Peer benchmarking across agencies' },
    ],
  },
  {
    label: 'Investigation',
    items: [
      { to: '/investigation', label: 'Investigation', icon: FileSearch,
        hint: 'Evidence workspace for the selected anomaly' },
      { to: '/cases', label: 'Cases', icon: FolderOpen, requiresAuth: true,
        hint: 'Clarification workflow — sign-in required' },
      { to: '/geography', label: 'Geography', icon: Map,
        hint: 'Risk concentration by state' },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/data-quality', label: 'Data Quality', icon: Database,
        hint: 'Agency name reconciliation and coverage' },
      { to: '/deep-analysis', label: 'Deep Analysis', icon: Layers,
        hint: 'Advanced distribution and concentration views' },
      { to: '/audit', label: 'Audit Trail', icon: ScrollText, requiresAuth: true,
        hint: 'Immutable action log — admin only' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/live', label: 'Live Mode', icon: Radio,
        hint: 'Role-based oversight portals' },
      { to: '/dataset', label: 'Dataset', icon: Upload,
        hint: 'Ingest and score a new MPLADS extract' },
    ],
  },
];

/** Flat lookup for breadcrumbs and the command palette. */
export const NAV_INDEX = NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.label }))
);

export function findNavItem(pathname) {
  // Longest matching prefix wins, so /investigation/agy_x resolves correctly.
  return NAV_INDEX
    .filter((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
    .sort((a, b) => b.to.length - a.to.length)[0] ?? null;
}
