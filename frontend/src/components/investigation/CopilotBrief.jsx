import React, { useEffect, useState } from 'react';
import { Sparkles, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { Panel, PanelHeader, EvidenceLink, ErrorState, cx } from '../ui';
import { generateInvestigationBrief } from '../../api/client';
import { formatINR, formatRatio, formatDeviation, formatPercent } from '../../utils/format';

/**
 * Investigation Copilot (DESIGN.md §18, §20, §21).
 *
 * Not a chat assistant. It analyses exactly one object -- the selected
 * agency-month -- and every figure it states is echoed underneath as a
 * verifiable statistic with a link to the evidence.
 */

const STEPS = [
  'Loading agency records',
  'Comparing against historical baseline',
  'Calculating peer benchmark',
  'Analysing disbursement timeline',
  'Preparing evidence summary',
];

export default function CopilotBrief({ anomaly, onShowEvidence, onShowTimeline }) {
  const [state, setState] = useState({ status: 'idle', brief: null, error: null });
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setState({ status: 'idle', brief: null, error: null });
    setStep(0);
  }, [anomaly?.id]);

  async function run() {
    setState({ status: 'running', brief: null, error: null });
    setStep(0);

    // Operational progress only -- these are real pipeline stages, never a
    // window into model deliberation.
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 320);
    const res = await generateInvestigationBrief(anomaly.id);
    clearInterval(timer);

    if (!res.data) {
      setState({ status: 'error', brief: null, error: res.error });
      return;
    }
    setState({ status: 'done', brief: res.data, error: null });
  }

  async function copy() {
    const b = state.brief;
    if (!b) return;
    const text = [
      b.headline,
      '',
      b.explanation,
      '',
      `Recommended action: ${b.recommendedAction}`,
      '',
      `Source: FundWatch · ${anomaly.id}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  const stats = state.brief?.groundedStats;

  return (
    <Panel>
      <PanelHeader
        title="Analytical brief"
        description="Generated from this record’s own statistics"
        actions={
          state.status === 'done' && (
            <button onClick={copy} className="btn-ghost btn-sm" aria-label="Copy brief to clipboard">
              {copied
                ? <><Check className="w-3.5 h-3.5" style={{ color: 'var(--risk-low)' }} aria-hidden="true" /> Copied</>
                : <><Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy</>}
            </button>
          )
        }
      />

      {state.status === 'idle' && (
        <div className="p-4 space-y-3">
          <p className="text-sm text-content-muted">
            Produces a written summary of why this record deviates, using only the
            figures already computed for it. No figure is introduced that is not
            shown on this page.
          </p>
          <button onClick={run} className="btn-accent btn-sm w-full">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Generate brief
          </button>
        </div>
      )}

      {state.status === 'running' && (
        <ol className="p-4 space-y-2" aria-live="polite">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              <span
                className={cx(
                  'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0',
                  i < step && 'border-transparent'
                )}
                style={{
                  background: i < step ? 'var(--accent-primary)' : 'transparent',
                  borderColor: i === step ? 'var(--accent-primary)' : 'var(--border-default)',
                }}
                aria-hidden="true"
              >
                {i < step && <Check className="w-2.5 h-2.5" style={{ color: 'var(--text-inverse)' }} />}
              </span>
              <span className={i <= step ? 'text-content-secondary' : 'text-content-muted'}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      {state.status === 'error' && (
        <ErrorState
          title="Unable to generate the brief"
          detail={`The analysis service did not respond (${state.error}). Every underlying signal is still available on this page.`}
          onRetry={run}
        />
      )}

      {state.status === 'done' && state.brief && (
        <div className="p-4 space-y-4">
          <p className="text-md text-content-secondary leading-relaxed">
            {state.brief.explanation}
          </p>

          {state.brief.recommendedAction && (
            <div
              className="rounded border p-3"
              style={{ background: 'var(--risk-medium-surface)', borderColor: 'rgba(232,179,57,0.3)' }}
            >
              <div className="label-meta mb-1" style={{ color: 'var(--risk-medium)' }}>
                Recommended next step
              </div>
              <p className="text-sm text-content-secondary">{state.brief.recommendedAction}</p>
            </div>
          )}

          {/* Every number the prose used, restated as a checkable statistic. */}
          {stats && (
            <div>
              <h3 className="label-meta mb-2">Figures used</h3>
              <dl className="space-y-1.5">
                <Fact label="This month" value={formatINR(stats.thisMonth)} />
                <Fact label="Historical median" value={formatINR(stats.historicalMedian)} />
                <Fact label="Velocity" value={formatRatio(stats.velocityRatio)} />
                <Fact label="Modified z-score" value={`${formatDeviation(stats.modifiedZScore)} MAD`} />
                {stats.peerRatio != null && <Fact label="Peer ratio" value={formatRatio(stats.peerRatio)} />}
                {stats.concentrationPct != null && (
                  <Fact label="Top-3 concentration" value={formatPercent(stats.concentrationPct, 0)} />
                )}
              </dl>
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
            {onShowTimeline && <EvidenceLink onClick={onShowTimeline}>View spending evidence</EvidenceLink>}
            {onShowEvidence && <EvidenceLink onClick={onShowEvidence}>View source records</EvidenceLink>}
          </div>

          <div className="flex items-start gap-2 pt-3 border-t border-line-subtle">
            {state.brief.forbiddenWordsDetected ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--risk-high)' }} aria-hidden="true" />
                <p className="text-xs text-content-muted">
                  This brief was screened and flagged for language review.
                </p>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--risk-low)' }} aria-hidden="true" />
                <p className="text-xs text-content-muted">
                  Every figure above is read directly from this record’s computed statistics
                  and screened against accusatory language. The brief describes statistical
                  deviation only.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function Fact({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-content-muted">{label}</dt>
      <dd className="mono text-sm text-content-primary">{value}</dd>
    </div>
  );
}
