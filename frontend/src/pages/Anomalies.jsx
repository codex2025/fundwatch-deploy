import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useWorkspace } from '../app/WorkspaceContext';
import { Panel, PanelHeader, LoadingState, ErrorState } from '../components/ui';
import AnomalyTable from '../components/anomalies/AnomalyTable';
import PageContainer from '../components/layout/PageContainer';
import { formatCount } from '../utils/format';

/**
 * The ranked registry as an investigative queue (DESIGN.md §10).
 */
export default function Anomalies() {
  const { filtered, anomalies, status, filters, setFilter, selectedId, setSelectedId } = useWorkspace();
  const [density, setDensity] = useState(() => {
    try { return localStorage.getItem('fw:density') || 'default'; } catch { return 'default'; }
  });

  function changeDensity(next) {
    setDensity(next);
    try { localStorage.setItem('fw:density', next); } catch { /* private mode */ }
  }

  function exportCsv() {
    const headers = [
      'anomaly_id', 'agency_id', 'agency_name', 'state', 'month',
      'risk_score', 'risk_band', 'monthly_spend_inr', 'baseline_median_inr',
      'primary_signal', 'velocity_ratio', 'modified_z_score', 'peer_ratio', 'iqr_ratio',
    ];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map((a) => [
      a.id, a.agencyId, a.agencyName, a.state, a.month,
      a.riskScore, a.band.label, a.monthlyAmount, a.historicalMedian,
      a.primarySignal?.label ?? '', a.signals.velocity_ratio, a.signals.modified_z_score,
      a.signals.peer_ratio, a.signals.iqr_ratio,
    ].map(escape).join(','));

    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fundwatch-anomalies-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer
      title="Anomaly intelligence"
      description="Agency-months ranked by composite deviation from their own spending baseline and peer group."
      actions={
        <button onClick={exportCsv} className="btn-default btn-sm" disabled={!filtered.length}>
          <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export CSV
        </button>
      }
    >
      <Panel>
        <PanelHeader
          title="Ranked queue"
          description={
            status.loading
              ? 'Loading…'
              : `${formatCount(filtered.length)} of ${formatCount(anomalies.length)} scored records`
          }
          actions={
            <div className="relative w-44 sm:w-64">
              <Search
                className="w-3.5 h-3.5 text-content-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                className="field pl-8"
                placeholder="Filter by agency, state, ID…"
                aria-label="Filter anomalies"
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
              />
            </div>
          }
        />

        {status.loading ? (
          <LoadingState label="Loading anomalies" rows={8} />
        ) : status.error ? (
          <ErrorState
            title="Unable to load the anomaly registry"
            detail={`The data service did not respond (${status.error}).`}
            onRetry={() => window.location.reload()}
          />
        ) : (
          <AnomalyTable
            anomalies={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            density={density}
            onDensityChange={changeDensity}
          />
        )}
      </Panel>

      <p className="text-xs text-content-muted">
        A risk score aggregates four independent statistical tests. It flags records for review
        and is not evidence of wrongdoing. Select any row to see the signals and source records behind it.
      </p>
    </PageContainer>
  );
}
