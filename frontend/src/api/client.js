/**
 * Public (unauthenticated) FundWatch API client.
 *
 * Every fetcher returns an envelope:
 *
 *   { data, source: 'live' | 'snapshot', error: string | null }
 *
 * The previous implementation caught failures silently and, in several cases,
 * substituted *invented* numbers (a hardcoded stats object, three fabricated
 * month rows, two fictional agency aliases). The app could not distinguish
 * "backend healthy" from "backend down", and neither could the user.
 *
 * Rules now:
 *   - Fall back to the shipped static snapshot where one genuinely exists.
 *   - Never fabricate a value that has no data behind it.
 *   - Always report which source the caller is looking at.
 */

import {
  normalizeAnomaly,
  normalizeAgency,
  normalizeAgencyDetail,
  normalizeStats,
  normalizeAlias,
  normalizeBrief,
  normalizeWork,
} from './normalize';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;
const REQUEST_TIMEOUT = 15000;

/** Observable connection state, so the shell can show one honest banner. */
const listeners = new Set();
let connectionState = { mode: 'unknown', lastError: null, checkedAt: null };

export function getConnectionState() {
  return connectionState;
}

export function subscribeConnection(fn) {
  listeners.add(fn);
  fn(connectionState);
  return () => listeners.delete(fn);
}

function setConnection(mode, lastError = null) {
  connectionState = { mode, lastError, checkedAt: Date.now() };
  listeners.forEach((fn) => fn(connectionState));
}

function ok(data, source = 'live') {
  if (source === 'live') setConnection('live');
  return { data, source, error: null };
}

function degraded(data, error) {
  setConnection('snapshot', error);
  return { data, source: 'snapshot', error };
}

function failed(error) {
  setConnection('offline', error);
  return { data: null, source: 'none', error };
}

async function apiGet(path, { signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  if (signal) signal.addEventListener('abort', () => controller.abort());
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Static snapshot (shipped in public/data) -- a real, if stale, source */
/* ------------------------------------------------------------------ */

let snapshotPromise = null;
function loadSnapshot() {
  if (!snapshotPromise) {
    snapshotPromise = fetch('/data/anomalies.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`snapshot ${r.status}`))))
      .catch(() => []);
  }
  return snapshotPromise;
}

/* ------------------------------------------------------------------ */
/* Anomalies                                                           */
/* ------------------------------------------------------------------ */

export async function fetchAnomalies(filters = {}) {
  const params = new URLSearchParams();
  if (filters.min_score !== undefined) params.append('min_score', filters.min_score);
  if (filters.state && filters.state !== 'ALL') params.append('state', filters.state);
  if (filters.month && filters.month !== 'ALL') params.append('month', filters.month);
  // NOTE: server-side `search` is deliberately not sent. routers/anomalies.py
  // references pd.Series without importing pandas, so any search= request
  // raises NameError. Filtering happens client-side until that is fixed.

  try {
    const raw = await apiGet(`/anomalies?${params.toString()}`);
    return ok(raw.map(normalizeAnomaly).filter(Boolean));
  } catch (err) {
    const snap = await loadSnapshot();
    if (!snap.length) return failed(err.message);
    let list = snap.map(normalizeAnomaly).filter(Boolean);
    if (filters.min_score) list = list.filter((a) => (a.riskScore ?? 0) >= Number(filters.min_score));
    if (filters.state && filters.state !== 'ALL') {
      list = list.filter((a) => a.state.toLowerCase() === filters.state.toLowerCase());
    }
    if (filters.month && filters.month !== 'ALL') list = list.filter((a) => a.month === filters.month);
    return degraded(list, err.message);
  }
}

export async function fetchStats() {
  try {
    return ok(normalizeStats(await apiGet('/stats')));
  } catch (err) {
    // Derive what we honestly can from the snapshot instead of inventing it.
    const snap = await loadSnapshot();
    if (!snap.length) return failed(err.message);
    const rows = snap.map(normalizeAnomaly).filter(Boolean);
    const agencies = new Set(rows.map((r) => r.agencyId));
    const states = [...new Set(rows.map((r) => r.state).filter(Boolean))];
    return degraded(
      {
        agencyMonthsScored: rows.length,
        worksAnalysed: null,          // not derivable from this snapshot
        agenciesMonitored: agencies.size,
        totalDisbursed: rows.reduce((s, r) => s + (r.monthlyAmount || 0), 0),
        highRiskCount: rows.filter((r) => (r.riskScore ?? 0) >= 86).length,
        statesCovered: states,
      },
      err.message
    );
  }
}

/* ------------------------------------------------------------------ */
/* Agencies                                                            */
/* ------------------------------------------------------------------ */

export async function fetchAgencies() {
  try {
    const raw = await apiGet('/agencies');
    return ok(raw.map(normalizeAgency).filter(Boolean));
  } catch (err) {
    const { data: anomalies } = await fetchAnomalies();
    if (!anomalies?.length) return failed(err.message);
    const byId = new Map();
    for (const a of anomalies) {
      const existing = byId.get(a.agencyId);
      if (!existing || (a.riskScore ?? 0) > (existing.riskScore ?? 0)) {
        byId.set(a.agencyId, {
          agencyId: a.agencyId,
          agencyName: a.agencyName,
          state: a.state,
          district: a.district,
          constituency: a.constituency,
          totalSpend: null,      // unknown from this source -- do not invent
          activeMonths: null,
          riskScore: a.riskScore,
          hasAnomalies: (a.riskScore ?? 0) >= 40,
        });
      }
    }
    return degraded([...byId.values()], err.message);
  }
}

export async function fetchAgencyDetail(agencyId) {
  try {
    return ok(normalizeAgencyDetail(await apiGet(`/agencies/${agencyId}`)));
  } catch (err) {
    // Reconstruct a real timeline from every snapshot row for this agency
    // rather than emitting three fabricated months.
    const { data: anomalies } = await fetchAnomalies();
    const rows = (anomalies || [])
      .filter((a) => a.agencyId === agencyId)
      .sort((a, b) => a.month.localeCompare(b.month));
    if (!rows.length) return failed(err.message);
    let cumulative = 0;
    return degraded(
      {
        agencyId,
        agencyName: rows[0].agencyName,
        state: rows[0].state,
        district: rows[0].district,
        constituency: rows[0].constituency,
        historicalMedian: rows[rows.length - 1].historicalMedian,
        iqrUpperFence: null,
        months: rows.map((r) => {
          cumulative += r.monthlyAmount || 0;
          return {
            month: r.month,
            monthlyAmount: r.monthlyAmount,
            cumulativeAmount: cumulative,
            workCount: r.topWorks.length || null,
            riskScore: r.riskScore,
            isFlagged: (r.riskScore ?? 0) >= 70,
            velocityRatio: r.signals.velocity_ratio,
            modifiedZScore: r.signals.modified_z_score,
          };
        }),
      },
      err.message
    );
  }
}

export async function fetchAgencyWorks(agencyId, month) {
  try {
    const raw = await apiGet(`/agencies/${agencyId}/works?month=${month || ''}`);
    return ok(raw.map(normalizeWork).filter(Boolean));
  } catch (err) {
    const { data: anomalies } = await fetchAnomalies();
    const match = (anomalies || []).find(
      (a) => a.agencyId === agencyId && (!month || a.month === month)
    );
    if (!match) return failed(err.message);
    return degraded(match.topWorks, err.message);
  }
}

/* ------------------------------------------------------------------ */
/* Investigation brief                                                 */
/* ------------------------------------------------------------------ */

const briefCache = new Map();

export async function generateInvestigationBrief(anomalyId) {
  if (briefCache.has(anomalyId)) return ok(briefCache.get(anomalyId));
  try {
    const res = await fetch(`${API_BASE}/investigate/${anomalyId}`, { method: 'POST' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const brief = normalizeBrief(await res.json());
    briefCache.set(anomalyId, brief);
    return ok(brief);
  } catch (err) {
    // No fabricated brief. The caller renders an error state and the user can
    // still read every underlying signal on the page itself.
    return failed(err.message);
  }
}

/* ------------------------------------------------------------------ */
/* Data quality / alias audit                                          */
/* ------------------------------------------------------------------ */

export async function fetchAliasAuditMap() {
  try {
    const raw = await apiGet('/aliases');
    return ok(raw.map(normalizeAlias).filter(Boolean));
  } catch (err) {
    return failed(err.message);
  }
}

/* ------------------------------------------------------------------ */
/* Analytical charts                                                   */
/* ------------------------------------------------------------------ */

async function chart(path, empty) {
  try {
    return ok(await apiGet(path));
  } catch (err) {
    return { data: empty, source: 'none', error: err.message };
  }
}

export const fetchHistogram = () => chart('/charts/histogram', { risk_bins: [], cost_bins: [] });
export const fetchQuadrantScatter = () => chart('/charts/quadrant-scatter', { points: [], axes: {} });
export const fetchCalendarHeatmap = () =>
  chart('/charts/calendar-heatmap', { monthly_summary: [], daily_matrix: [], stats: {} });
export const fetchRadarProfiler = () => chart('/charts/radar-profiler', { radar_axes: [], agencies: [] });
export const fetchWaterfallMonopoly = () => chart('/charts/waterfall-monopoly', []);

/* ------------------------------------------------------------------ */
/* Dataset ingestion                                                   */
/* ------------------------------------------------------------------ */

export async function uploadDatasetFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload-dataset`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Unable to process this dataset');
  }
  snapshotPromise = null;
  briefCache.clear();
  return res.json();
}
