/**
 * Canonical client-side data model.
 *
 * The audit found that the live API and the static snapshot in
 * public/data/anomalies.json disagree on shape:
 *
 *   API       historical_median_monthly_inr   signals: { velocity_ratio, ... }
 *   snapshot  historical_median_monthly       velocity_ratio (flat)
 *
 * The UI only ever read the API shape, so in snapshot mode every row rendered
 * "Med: ₹NaN" and a flat "1×" velocity. Normalising at the boundary means no
 * page component has to know which source it is looking at.
 */

import { riskBand, primarySignal } from '../utils/risk';

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value) {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  return s === 'nan' || s === 'None' ? '' : s;
}

/** Accepts either shape and returns one canonical anomaly. */
export function normalizeAnomaly(raw) {
  if (!raw) return null;

  // signals may be nested (API) or flat (snapshot)
  const src = raw.signals && typeof raw.signals === 'object' ? raw.signals : raw;

  const signals = {
    modified_z_score: num(src.modified_z_score ?? src.modified_z),
    iqr_ratio: num(src.iqr_ratio),
    velocity_ratio: num(src.velocity_ratio),
    peer_ratio: num(src.peer_ratio),
  };

  const insufficientHistory = Boolean(
    src.insufficient_history ?? raw.insufficient_history ?? false
  );

  const riskScore = num(raw.risk_score);
  const band = riskBand(riskScore, insufficientHistory);

  const works = Array.isArray(raw.top_contributing_works)
    ? raw.top_contributing_works.map(normalizeWork)
    : [];

  return {
    id: str(raw.anomaly_id) || `${str(raw.agency_id)}__${str(raw.year_month)}`,
    agencyId: str(raw.agency_id),
    agencyName: str(raw.agency_name) || 'Unnamed agency',
    state: str(raw.state),
    district: str(raw.district),
    constituency: str(raw.constituency),
    month: str(raw.year_month),

    monthlyAmount: num(raw.monthly_amount),
    // Both spellings, plus the older alias.
    historicalMedian: num(
      raw.historical_median_monthly_inr ??
      raw.historical_median_monthly ??
      raw.historical_median
    ),

    riskScore,
    band,
    insufficientHistory,

    signals,
    // Derived from the signals rather than the backend's tautological
    // "Risk Score 100.0/100" placeholder.
    primarySignal: primarySignal(signals),
    topSignalKey: str(raw.top_signal),

    concentrationPct: num(raw.pct_of_spike_from_top3),
    topWorks: works,
  };
}

/** Work records arrive with three different amount spellings across endpoints. */
export function normalizeWork(raw) {
  if (!raw) return null;
  return {
    workId: str(raw.work_id),
    description: str(raw.description || raw.work_description || raw.work_name),
    // amount_inr is the field the API actually sends. Reading `amount` alone
    // is what made the evidence panel show ₹0 for every work.
    amount: num(raw.amount_inr ?? raw.amount ?? raw.sanction_amount),
    category: str(raw.category || raw.work_category) || 'Uncategorised',
    date: str(raw.date || raw.sanction_date),
    status: str(raw.status),
  };
}

export function normalizeAgency(raw) {
  if (!raw) return null;
  return {
    agencyId: str(raw.agency_id),
    agencyName: str(raw.agency_name) || 'Unnamed agency',
    state: str(raw.state),
    district: str(raw.district),
    constituency: str(raw.constituency),
    totalSpend: num(raw.total_spend),
    activeMonths: num(raw.active_months),
    riskScore: num(raw.latest_risk_score),
    hasAnomalies: Boolean(raw.has_anomalies),
  };
}

export function normalizeAgencyDetail(raw) {
  if (!raw) return null;
  return {
    agencyId: str(raw.agency_id),
    agencyName: str(raw.agency_name) || 'Unnamed agency',
    state: str(raw.state),
    district: str(raw.district),
    constituency: str(raw.constituency),
    historicalMedian: num(raw.historical_median),
    iqrUpperFence: num(raw.iqr_upper_fence),
    months: Array.isArray(raw.months)
      ? raw.months.map((m) => ({
          month: str(m.year_month),
          monthlyAmount: num(m.monthly_amount),
          cumulativeAmount: num(m.cumulative_amount),
          workCount: num(m.work_count),
          riskScore: num(m.risk_score),
          isFlagged: Boolean(m.is_flagged),
          velocityRatio: num(m.velocity_ratio),
          modifiedZScore: num(m.modified_z_score),
        }))
      : [],
  };
}

export function normalizeStats(raw) {
  if (!raw) return null;
  return {
    // NOTE: the API's total_anomalies_flagged is len(anomalies.json), which
    // run_detector defines as every agency-month WITH SUFFICIENT HISTORY --
    // not flagged rows. Naming it honestly here so the UI cannot repeat the
    // "1,926 anomalies" overstatement the audit flagged.
    agencyMonthsScored: num(raw.total_anomalies_flagged),
    worksAnalysed: num(raw.total_works_analyzed),
    agenciesMonitored: num(raw.total_agencies_monitored),
    totalDisbursed: num(raw.total_disbursed_inr),
    highRiskCount: num(raw.high_risk_count),
    statesCovered: Array.isArray(raw.states_covered) ? raw.states_covered.filter(Boolean) : [],
  };
}

export function normalizeAlias(raw) {
  if (!raw) return null;
  return {
    rawName: str(raw.raw_agency_name),
    canonicalId: str(raw.canonical_agency_id),
    canonicalName: str(raw.canonical_name),
    state: str(raw.state),
    district: str(raw.district),
    matchScore: num(raw.match_score),
    reason: str(raw.merge_reason),
  };
}

export function normalizeBrief(raw) {
  if (!raw) return null;
  const g = raw.grounded_stats || {};
  return {
    anomalyId: str(raw.anomaly_id),
    agencyName: str(raw.agency_name),
    headline: str(raw.headline),
    explanation: str(raw.explanation),
    recommendedAction: str(raw.recommended_action),
    groundedStats: {
      historicalMedian: num(g.historical_median ?? g.historical_median_monthly_inr),
      thisMonth: num(g.this_month_inr),
      velocityRatio: num(g.velocity_ratio),
      modifiedZScore: num(g.modified_z_score),
      peerRatio: num(g.peer_ratio),
      concentrationPct: num(g.pct_of_spike_from_top3),
    },
    auditVerified: Boolean(raw.audit_verified),
    forbiddenWordsDetected: Boolean(raw.forbidden_words_detected),
  };
}
