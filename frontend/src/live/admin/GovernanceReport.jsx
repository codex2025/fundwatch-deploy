import React, { useEffect, useState } from 'react';
import { fetchGovernance } from '../../api/liveClient';
import { Panel, PanelHeader, KpiCard, LoadingState, ErrorState } from '../../components/ui';
import { formatINR, formatCount, formatPercent } from '../../utils/format';

/**
 * System-level oversight health -- how well the process is operating overall,
 * as distinct from how any single agency is behaving.
 */
export default function GovernanceReport() {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    fetchGovernance()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => setState({ data: null, loading: false, error: err.message }));
  }, []);

  if (state.loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <KpiCard key={i} loading />)}
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <Panel>
        <ErrorState
          title="Unable to load the governance report"
          detail={`The governance service did not respond (${state.error}). This report requires an administrator session.`}
        />
      </Panel>
    );
  }

  const g = state.data;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <KpiCard label="Total disbursed" value={formatINR(g.total_disbursed_inr)} context="across monitored agencies" />
        <KpiCard label="Works monitored" value={formatCount(g.total_works_monitored)} />
        <KpiCard label="Agencies monitored" value={formatCount(g.total_agencies_monitored)} />
        <KpiCard
          label="Active investigations"
          value={formatCount(g.active_investigations)}
          tone={g.active_investigations ? 'high' : 'default'}
          context="cases not yet closed"
        />
        <KpiCard
          label="Escalated"
          value={formatCount(g.escalated_count)}
          tone={g.escalated_count ? 'critical' : 'default'}
        />
        <KpiCard
          label="Overdue responses"
          value={formatCount(g.overdue_count)}
          tone={g.overdue_count ? 'critical' : 'default'}
          context="past the response deadline"
        />
      </div>

      <Panel>
        <PanelHeader
          title="Process throughput"
          description="How quickly and completely the oversight workflow closes cases"
        />
        <dl className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-line-subtle">
          <Metric
            label="Resolution rate"
            value={g.resolution_rate != null ? formatPercent(g.resolution_rate, 0) : '—'}
            context={`${formatCount(g.resolved_count)} of ${formatCount(g.total_cases)} cases closed`}
          />
          <Metric
            label="MP verification rate"
            value={g.mp_verification_rate != null ? formatPercent(g.mp_verification_rate, 0) : '—'}
            context="cases carrying a completed MP sign-off"
          />
          <Metric
            label="Average resolution time"
            value={g.avg_resolution_days != null ? `${g.avg_resolution_days} days` : '—'}
            context="from detection to closure"
          />
        </dl>
      </Panel>
    </div>
  );
}

function Metric({ label, value, context }) {
  return (
    <div className="p-4">
      <dt className="label-meta">{label}</dt>
      <dd className="mono text-2xl font-semibold text-content-primary mt-1.5">{value}</dd>
      <p className="text-xs text-content-muted mt-1">{context}</p>
    </div>
  );
}
