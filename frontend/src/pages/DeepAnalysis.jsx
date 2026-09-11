import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  ScatterChart, Scatter, ZAxis, ReferenceLine, ComposedChart, Line,
} from 'recharts';
import { useWorkspace } from '../app/WorkspaceContext';
import { Panel, PanelHeader, LoadingState, ErrorState, EmptyState } from '../components/ui';
import PageContainer from '../components/layout/PageContainer';
import { fetchHistogram, fetchQuadrantScatter, fetchWaterfallMonopoly } from '../api/client';
import { formatINR, formatAxisINR, formatCount, formatPercent } from '../utils/format';
import { riskColorVar } from '../utils/risk';

/**
 * Deep analysis (DESIGN.md §32).
 *
 * Advanced distribution views, kept off the command centre because they
 * support a second-order question rather than the first one.
 *
 * Two things the audit found are deliberately NOT here:
 *   - the 3D "anomaly terrain", which took a dataPoints prop and ignored it,
 *     rendering three hardcoded Gaussians labelled as fraud typologies;
 *   - the radar profiler, whose endpoint raises KeyError('peer_cost_ratio')
 *     because autolabel.py emits `peer_ratio`. Rendering an empty card for a
 *     permanently-500 endpoint is worse than not offering it.
 */
export default function DeepAnalysis() {
  const { anomalies } = useWorkspace();
  const [histogram, setHistogram] = useState({ data: null, loading: true, error: null });
  const [scatter, setScatter] = useState({ data: null, loading: true, error: null });
  const [concentration, setConcentration] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchHistogram(), fetchQuadrantScatter(), fetchWaterfallMonopoly()])
      .then(([h, s, w]) => {
        if (cancelled) return;
        setHistogram({ data: h.data, loading: false, error: h.error });
        setScatter({ data: s.data, loading: false, error: s.error });
        setConcentration({ data: w.data, loading: false, error: w.error });
      });
    return () => { cancelled = true; };
  }, []);

  /** Locally computed distribution -- always available, even offline. */
  const localDistribution = useMemo(() => {
    const bins = [
      { label: '0–20', min: 0, max: 20, band: 'low' },
      { label: '20–40', min: 20, max: 40, band: 'low' },
      { label: '40–60', min: 40, max: 60, band: 'medium' },
      { label: '60–70', min: 60, max: 70, band: 'medium' },
      { label: '70–86', min: 70, max: 86, band: 'high' },
      { label: '86–100', min: 86, max: 101, band: 'critical' },
    ];
    return bins.map((b) => ({
      ...b,
      count: anomalies.filter((a) => (a.riskScore ?? 0) >= b.min && (a.riskScore ?? 0) < b.max).length,
    }));
  }, [anomalies]);

  const scatterPoints = useMemo(() => {
    const pts = scatter.data?.points;
    if (!Array.isArray(pts) || !pts.length) return [];
    return pts
      .filter((p) => p.cost_deviation_pct != null && p.velocity_ratio != null)
      .slice(0, 600)
      .map((p) => ({
        x: Number(p.cost_deviation_pct),
        y: Number(p.velocity_ratio),
        z: Number(p.composite_risk ?? 0),
        name: p.name,
        agency: p.agency,
        category: p.category,
      }));
  }, [scatter.data]);

  const topConcentration = useMemo(() => {
    const rows = concentration.data;
    if (!Array.isArray(rows) || !rows.length) return [];
    return rows.slice(0, 12);
  }, [concentration.data]);

  return (
    <PageContainer
      title="Deep analysis"
      description="Distribution, deviation and concentration views for second-order questions."
    >
      <Panel>
        <PanelHeader
          title="Risk score distribution"
          description="How the scored population spreads across the composite scale"
        />
        <div className="p-4 pt-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={localDistribution} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} width={48} />
              <Tooltip
                cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-bg-elevated border border-line rounded shadow-overlay p-3 text-sm">
                      <div className="font-semibold text-content-primary">Score {d.label}</div>
                      <div className="mono mt-1">{formatCount(d.count)} agency-months</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {localDistribution.map((b) => (
                  <Cell key={b.label} fill={riskColorVar(b.band)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-content-muted mt-2 px-2">
            A healthy portfolio concentrates in the low bands with a thin tail. The tail is the worklist.
          </p>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Cost deviation against turnaround velocity"
          description="Each point is a sanctioned work. Upper right is both above peer cost and unusually fast."
        />
        {scatter.loading ? (
          <LoadingState label="Loading distribution" rows={5} />
        ) : scatterPoints.length === 0 ? (
          <ErrorState
            title="Work-level distribution unavailable"
            detail={
              scatter.error
                ? `The analytics service did not respond (${scatter.error}).`
                : 'The analytics service returned no work-level points for this dataset.'
            }
          />
        ) : (
          <div className="p-4 pt-2">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 12, right: 16, bottom: 16, left: 8 }}>
                <CartesianGrid strokeDasharray="2 4" />
                <XAxis
                  type="number" dataKey="x" name="Cost deviation"
                  unit="%" axisLine={{ stroke: 'var(--border-default)' }} tickLine={false}
                  label={{ value: 'Cost vs peer median (%)', position: 'insideBottom', offset: -8, fill: 'var(--text-muted)', fontSize: 10 }}
                />
                <YAxis
                  type="number" dataKey="y" name="Velocity"
                  axisLine={false} tickLine={false} width={48}
                  label={{ value: 'Velocity (×)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }}
                />
                <ZAxis type="number" dataKey="z" range={[12, 90]} name="Composite risk" />
                <ReferenceLine x={0} stroke="var(--border-strong)" />
                <ReferenceLine y={1} stroke="var(--border-strong)" strokeDasharray="3 3" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-bg-elevated border border-line rounded shadow-overlay p-3 text-sm max-w-xs">
                        <div className="font-medium text-content-primary mb-1.5 line-clamp-2">{d.name}</div>
                        <div className="text-xs text-content-muted mb-2">{d.agency}</div>
                        <dl className="space-y-1 mono text-xs">
                          <div className="flex justify-between gap-4"><dt>Cost vs peer</dt><dd>{d.x.toFixed(0)}%</dd></div>
                          <div className="flex justify-between gap-4"><dt>Velocity</dt><dd>{d.y.toFixed(1)}×</dd></div>
                          <div className="flex justify-between gap-4"><dt>Composite risk</dt><dd>{d.z.toFixed(0)}</dd></div>
                        </dl>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterPoints} fillOpacity={0.55}>
                  {scatterPoints.map((p, i) => (
                    <Cell
                      key={i}
                      fill={
                        p.z >= 86 ? riskColorVar('critical')
                        : p.z >= 70 ? riskColorVar('high')
                        : p.z >= 40 ? riskColorVar('medium')
                        : riskColorVar('low')
                      }
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-content-muted mt-2 px-2">
              Point size reflects composite risk. Position alone is not a finding — it indicates
              which works are worth pulling documentation for.
            </p>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Spend concentration by agency"
          description="Share of monitored expenditure held by the largest agencies"
        />
        {concentration.loading ? (
          <LoadingState label="Loading concentration" rows={5} />
        ) : topConcentration.length === 0 ? (
          <ErrorState
            title="Concentration analysis unavailable"
            detail={
              concentration.error
                ? `The analytics service did not respond (${concentration.error}).`
                : 'The analytics service returned no concentration data.'
            }
          />
        ) : (
          <div className="p-4 pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={topConcentration} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="agency_name"
                  axisLine={{ stroke: 'var(--border-default)' }}
                  tickLine={false}
                  tick={false}
                  height={12}
                />
                <YAxis yAxisId="spend" tickFormatter={formatAxisINR} axisLine={false} tickLine={false} width={62} />
                <YAxis yAxisId="cum" orientation="right" tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} width={44} domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-bg-elevated border border-line rounded shadow-overlay p-3 text-sm max-w-xs">
                        <div className="font-medium text-content-primary mb-1.5">{d.agency_name}</div>
                        <dl className="space-y-1 mono text-xs">
                          <div className="flex justify-between gap-4"><dt>Spend</dt><dd>{formatINR(d.spend_inr)}</dd></div>
                          <div className="flex justify-between gap-4"><dt>Share</dt><dd>{formatPercent(d.share_pct)}</dd></div>
                          {d.cumulative_pct != null && (
                            <div className="flex justify-between gap-4"><dt>Cumulative</dt><dd>{formatPercent(d.cumulative_pct)}</dd></div>
                          )}
                          <div className="flex justify-between gap-4"><dt>Works</dt><dd>{formatCount(d.works_count)}</dd></div>
                        </dl>
                      </div>
                    );
                  }}
                />
                <Bar yAxisId="spend" dataKey="spend_inr" radius={[2, 2, 0, 0]} barSize={22}>
                  {topConcentration.map((d, i) => (
                    <Cell key={i} fill={(d.avg_risk ?? 0) >= 40 ? riskColorVar('medium') : 'var(--border-strong)'} />
                  ))}
                </Bar>
                {topConcentration[0]?.cumulative_pct != null && (
                  <Line
                    yAxisId="cum" type="monotone" dataKey="cumulative_pct"
                    stroke="var(--accent-primary)" strokeWidth={1.5} dot={{ r: 2 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-xs text-content-muted mt-2 px-2">
              Concentration describes how expenditure is distributed. A high share may reflect
              an agency’s legitimate mandate and is not by itself a finding.
            </p>
          </div>
        )}
      </Panel>
    </PageContainer>
  );
}
