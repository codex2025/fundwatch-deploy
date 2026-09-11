import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useWorkspace } from '../app/WorkspaceContext';
import { Panel, PanelHeader, cx } from '../components/ui';
import PageContainer from '../components/layout/PageContainer';
import { uploadDatasetFile } from '../api/client';
import { formatCount, formatINR } from '../utils/format';
import { riskColorVar } from '../utils/risk';

const ACCEPTED = '.csv,.xlsx,.xls';

/**
 * Dataset ingestion (DESIGN.md §33).
 *
 * States what will happen before it happens, and reports exactly what the
 * scoring engine produced afterwards.
 */
export default function Dataset() {
  const { reload } = useWorkspace();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState({ status: 'idle', result: null, error: null });

  const pick = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setState({ status: 'idle', result: null, error: null });
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  }, [pick]);

  async function upload() {
    if (!file) return;
    setState({ status: 'uploading', result: null, error: null });
    try {
      const result = await uploadDatasetFile(file);
      setState({ status: 'done', result, error: null });
      reload();
    } catch (err) {
      setState({ status: 'error', result: null, error: err.message });
    }
  }

  const summary = state.result?.summary ?? state.result;

  return (
    <PageContainer
      title="Dataset ingestion"
      description="Score a new MPLADS extract against the same four-signal engine used throughout the workspace."
    >
      <Panel>
        <PanelHeader
          title="Upload an extract"
          description="CSV or Excel. Columns are auto-mapped; unmapped columns are ignored."
        />

        <div className="p-4 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cx(
              'rounded border border-dashed p-8 text-center transition-colors',
              dragging ? 'bg-bg-elevated' : 'bg-bg-sunken'
            )}
            style={{ borderColor: dragging ? 'var(--accent-primary)' : 'var(--border-default)' }}
          >
            <UploadCloud className="w-6 h-6 mx-auto text-content-muted" aria-hidden="true" />
            <p className="text-md text-content-secondary mt-3">
              Drop a file here, or{' '}
              <button
                onClick={() => inputRef.current?.click()}
                className="underline underline-offset-2"
                style={{ color: 'var(--accent-primary)' }}
              >
                browse
              </button>
            </p>
            <p className="text-xs text-content-muted mt-1.5">Accepted formats: CSV, XLSX, XLS</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(e) => pick(e.target.files?.[0])}
              aria-label="Choose a dataset file"
            />
          </div>

          {file && (
            <div className="flex items-center gap-3 rounded border border-line p-3 bg-bg-sunken">
              <FileSpreadsheet className="w-4 h-4 text-content-muted shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="text-base text-content-primary truncate">{file.name}</div>
                <div className="mono text-xs text-content-muted">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
              <button
                onClick={() => { setFile(null); setState({ status: 'idle', result: null, error: null }); }}
                className="btn-ghost btn-icon"
                aria-label="Remove selected file"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* What will happen -- stated before the action */}
          <div className="rounded border border-line-subtle bg-bg-sunken p-3">
            <h3 className="label-meta mb-2">What happens on upload</h3>
            <ol className="space-y-1 text-sm text-content-secondary list-decimal list-inside">
              <li>Columns are matched to the MPLADS schema by name and content.</li>
              <li>Each record is scored on four signals: cost deviation, distribution spread, peer deviation and velocity.</li>
              <li>The composite score is recomputed and this workspace reloads against the new data.</li>
            </ol>
            <p className="text-xs text-content-muted mt-2.5 pt-2.5 border-t border-line-subtle">
              The uploaded dataset replaces the active analytical dataset for this server process.
              It does not alter the stored MPLADS records.
            </p>
          </div>

          <button
            onClick={upload}
            disabled={!file || state.status === 'uploading'}
            className="btn-accent w-full sm:w-auto"
          >
            {state.status === 'uploading' ? 'Scoring records…' : 'Upload and score'}
          </button>

          {state.status === 'error' && (
            <div
              className="flex items-start gap-2.5 rounded border p-3"
              style={{ background: 'var(--risk-critical-surface)', borderColor: 'rgba(242,85,90,0.3)' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--risk-critical)' }} aria-hidden="true" />
              <div>
                <p className="text-base font-medium text-content-primary">Unable to process this dataset</p>
                <p className="text-sm text-content-muted mt-0.5">{state.error}</p>
              </div>
            </div>
          )}

          {state.status === 'done' && summary && (
            <div
              className="rounded border p-4"
              style={{ background: 'var(--risk-low-surface)', borderColor: 'rgba(78,199,122,0.3)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--risk-low)' }} aria-hidden="true" />
                <p className="text-base font-medium text-content-primary">Dataset scored</p>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Result label="Records" value={formatCount(summary.total_records ?? summary.records)} />
                <Result label="Total value" value={formatINR(summary.total_cost_inr)} />
                <Result label="Critical" value={formatCount(summary.critical_red_flags)} tone={riskColorVar('critical')} />
                <Result label="High" value={formatCount(summary.high_suspicion_count)} tone={riskColorVar('high')} />
                <Result label="Moderate" value={formatCount(summary.moderate_risk_count)} tone={riskColorVar('medium')} />
                <Result label="Low" value={formatCount(summary.low_risk_count)} tone={riskColorVar('low')} />
              </dl>
            </div>
          )}
        </div>
      </Panel>
    </PageContainer>
  );
}

function Result({ label, value, tone }) {
  return (
    <div>
      <dt className="label-meta">{label}</dt>
      <dd className="mono text-lg font-semibold mt-0.5" style={{ color: tone || 'var(--text-primary)' }}>
        {value}
      </dd>
    </div>
  );
}
