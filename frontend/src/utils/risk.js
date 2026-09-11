/**
 * Risk banding -- defined ONCE.
 *
 * The audit found three disagreeing definitions (detector/risk_score.py at
 * 86/70/40, backend/routers/anomalies.py at 80/65/45, RiskBadge.jsx at
 * 80/65/45). This module adopts the detector's thresholds, because that is
 * where the composite score is actually computed and documented.
 *
 * A risk score is an aggregation of statistical signals. It is not a finding
 * of wrongdoing, and the vocabulary here reflects that.
 */

export const RISK_BANDS = [
  { key: 'critical', min: 86, label: 'Critical',  short: 'CRIT', description: 'Severe deviation — review required' },
  { key: 'high',     min: 70, label: 'High',      short: 'HIGH', description: 'Strong deviation from baseline' },
  { key: 'medium',   min: 40, label: 'Medium',    short: 'MED',  description: 'Moderate deviation' },
  { key: 'low',      min: 0,  label: 'Low',       short: 'LOW',  description: 'Within normal variance' },
];

export const COLD_BAND = {
  key: 'cold',
  label: 'Insufficient history',
  short: 'N/A',
  description: 'Fewer than 3 months of prior observations — no baseline to compare against',
};

/** Resolve a score (and cold-start flag) to a band descriptor. */
export function riskBand(score, insufficientHistory = false) {
  if (insufficientHistory) return COLD_BAND;
  if (score === null || score === undefined || Number.isNaN(Number(score))) return COLD_BAND;
  const n = Number(score);
  return RISK_BANDS.find((b) => n >= b.min) ?? RISK_BANDS[RISK_BANDS.length - 1];
}

/** CSS custom-property name for a band, for inline style and chart fills. */
export function riskColorVar(bandKey) {
  return `var(--risk-${bandKey})`;
}

export function riskSurfaceVar(bandKey) {
  return `var(--risk-${bandKey}-surface)`;
}

/**
 * Human-readable names for the four detector signals.
 * Deliberately descriptive and non-accusatory: these describe what was
 * measured, not what it proves.
 */
export const SIGNAL_META = {
  modified_z_score: {
    key: 'modified_z_score',
    label: 'Cost deviation',
    unit: 'MAD',
    method: 'Modified z-score (Iglewicz–Hoaglin, median absolute deviation)',
    question: 'How far is this month from this agency’s own typical spend?',
    threshold: 3.5,
    describe: (v) => `${Number(v).toFixed(1)} MAD from this agency’s historical median`,
  },
  iqr_ratio: {
    key: 'iqr_ratio',
    label: 'Distribution spread',
    unit: '×IQR',
    method: 'Interquartile fencing (Q3 + 1.5·IQR upper fence)',
    question: 'Does this month fall outside the agency’s own spending distribution?',
    threshold: 1.0,
    describe: (v) => `${Number(v).toFixed(1)}× beyond the upper IQR fence`,
  },
  velocity_ratio: {
    key: 'velocity_ratio',
    label: 'Spending velocity',
    unit: '×',
    method: 'Month spend relative to rolling historical median',
    question: 'How much faster is money moving than usual?',
    threshold: 3.0,
    describe: (v) => `${Number(v).toFixed(1)}× the agency’s typical monthly pace`,
  },
  peer_ratio: {
    key: 'peer_ratio',
    label: 'Peer deviation',
    unit: '×',
    method: 'Cost relative to the median of comparable agencies in the same state and size bucket',
    question: 'How does this compare with similar agencies?',
    threshold: 1.25,
    describe: (v) => `${Number(v).toFixed(1)}× the peer median`,
  },
};

export const SIGNAL_ORDER = ['velocity_ratio', 'modified_z_score', 'peer_ratio', 'iqr_ratio'];

/**
 * Composite weights, mirroring detector/risk_score.py:
 *   CRS = 0.30·S1 + 0.25·S2 + 0.25·S3 + 0.20·S4
 */
export const COMPOSITE_WEIGHTS = [
  { key: 'modified_z_score', label: 'Cost anomaly (S1)', weight: 0.30 },
  { key: 'iqr_ratio', label: 'Distribution spread (S2)', weight: 0.25 },
  { key: 'peer_ratio', label: 'Peer deviation (S3)', weight: 0.25 },
  { key: 'velocity_ratio', label: 'Spending velocity (S4)', weight: 0.20 },
];

const WEIGHT_BY_KEY = Object.fromEntries(COMPOSITE_WEIGHTS.map((w) => [w.key, w.weight]));

/**
 * Convert a raw signal ratio into its 0-100 sub-score, using the SAME
 * piecewise functions as detector/risk_score.py.
 *
 * This matters for ranking. A naive "how many multiples of its threshold"
 * measure is not comparable across signals -- iqr_ratio is measured in IQR
 * units above a fence and routinely reaches 20+, so it dominated every
 * comparison and the UI reported "distribution spread" as the primary signal
 * on literally every row. Normalising through the engine's own scoring curves
 * makes the four signals commensurable.
 */
export function signalSubScore(key, value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0;
  const v = Number(value);

  switch (key) {
    // S1: modified z-score (MAD units)
    case 'modified_z_score': {
      const m = Math.abs(v);
      if (m <= 2.0) return 0;
      if (m < 3.5) return ((m - 2.0) / 1.5) * 60.0;
      return 60.0 + Math.min(40.0, ((m - 3.5) / 3.5) * 40.0);
    }
    // S2: IQR fencing. iqr_ratio is (cost - upper_fence) / IQR, so the
    // extreme fence (Q3 + 3·IQR) sits at a ratio of 1.5.
    case 'iqr_ratio': {
      if (v <= 0) return 0;
      return v <= 1.5 ? 50.0 : 100.0;
    }
    // S3: peer-to-peer cost deviation
    case 'peer_ratio': {
      if (v <= 1.25) return 0;
      if (v <= 2.5) return ((v - 1.25) / 1.25) * 70.0;
      return 100.0;
    }
    // S4: spending velocity
    case 'velocity_ratio': {
      if (v >= 3.0) return Math.min(100.0, 60.0 + (v - 3.0) * 10.0);
      if (v >= 2.0) return 40.0;
      return 0;
    }
    default:
      return 0;
  }
}

/**
 * Rank signals by their weighted contribution to the composite score, so the
 * "primary signal" is the dimension that actually drove the number.
 */
export function rankedSignals(signals = {}) {
  return SIGNAL_ORDER
    .map((key) => {
      const meta = SIGNAL_META[key];
      const value = signals[key];
      if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
      const n = Number(value);
      const subScore = signalSubScore(key, n);
      const weight = WEIGHT_BY_KEY[key] ?? 0;
      return {
        ...meta,
        value: n,
        subScore,
        weight,
        contribution: subScore * weight,
        exceeded: n >= meta.threshold,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.contribution - a.contribution || b.subScore - a.subScore);
}

/** The dimension contributing most to the composite score. */
export function primarySignal(signals = {}) {
  const ranked = rankedSignals(signals);
  const driving = ranked.find((s) => s.contribution > 0);
  return driving ?? ranked[0] ?? null;
}
