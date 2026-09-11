/**
 * Single source of truth for number, currency and date presentation.
 *
 * Before this module the codebase had five copies of formatINR with three
 * different rounding behaviours, and ratios were interpolated raw -- which is
 * why headline metrics rendered as "8.94435415865669x".
 */

const NBSP = ' ';

/** Indian currency in Cr / L / K, or null-safe em dash. */
export function formatINR(value, { decimals } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(decimals ?? 2)}${NBSP}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(decimals ?? 1)}${NBSP}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(decimals ?? 0)}${NBSP}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

/**
 * Chart-axis currency. Keeps one decimal below 10 units so adjacent ticks
 * cannot collapse to the same label (1.5 Cr and 2.4 Cr both rendering "₹2 Cr").
 */
export function formatAxisINR(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  const n = Number(value);
  if (n === 0) return '₹0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const unit = (div, label) => {
    const v = abs / div;
    return `${sign}₹${v < 10 ? v.toFixed(1) : v.toFixed(0)}${NBSP}${label}`;
  };
  if (abs >= 1e7) return unit(1e7, 'Cr');
  if (abs >= 1e5) return unit(1e5, 'L');
  if (abs >= 1e3) return unit(1e3, 'K');
  return `${sign}₹${abs.toFixed(0)}`;
}

/** Full rupee value with Indian digit grouping -- for evidence tables. */
export function formatINRExact(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** Multiplier, e.g. 8.94435415865669 -> "8.9×". */
export function formatRatio(value, { decimals = 1, suffix = '×' } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

/** Risk score 0-100, always integer-ish. */
export function formatScore(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 1);
}

/** Statistical deviation, e.g. 27.9271293712295 -> "27.9". */
export function formatDeviation(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(decimals);
}

/** Percentage where the input is already 0-100. */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(decimals)}%`;
}

/** Signed percentage change, e.g. +56.0% */
export function formatDelta(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

export function formatCount(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('en-IN');
}

/** "2019-03" -> "Mar 2019". Leaves anything unrecognised untouched. */
export function formatMonth(yearMonth) {
  if (!yearMonth || typeof yearMonth !== 'string') return '—';
  const m = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!m) return yearMonth;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1]} ${m[1]}`;
}

/** ISO timestamp -> "11 Sep 2026, 18:56" */
export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Relative age for audit/detection timestamps. */
export function formatRelative(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 2592000) return `${Math.floor(secs / 86400)}d ago`;
  return formatDate(iso);
}

/** Joins location parts, skipping the empty ones that produced ", Odisha". */
export function formatLocation(...parts) {
  const clean = parts.map((p) => (typeof p === 'string' ? p.trim() : p)).filter(Boolean);
  return clean.length ? clean.join(', ') : '—';
}

export function truncate(text, max = 60) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
