/**
 * Workspace state that must survive navigation.
 *
 * Audit risk R1: selection previously lived in App.jsx and survived tab
 * switches only because nothing ever unmounted. Introducing real routes would
 * have silently broken the demo path in DESIGN.md §41, where the investigator
 * carries one anomaly from the command centre through to the brief.
 *
 * Selection and filters therefore live here, above the router outlet.
 */
import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { fetchAnomalies, fetchStats, subscribeConnection } from '../api/client';

const WorkspaceContext = createContext(null);

export const DEFAULT_FILTERS = {
  state: 'ALL',
  month: 'ALL',
  minScore: 40,
  search: '',
  band: 'ALL',
};

export function WorkspaceProvider({ children }) {
  const [anomalies, setAnomalies] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: null, source: 'live' });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState(null);
  const [connection, setConnection] = useState({ mode: 'unknown' });

  useEffect(() => subscribeConnection(setConnection), []);

  const load = useCallback(async () => {
    setStatus((s) => ({ ...s, loading: true, error: null }));
    const [anomalyRes, statsRes] = await Promise.all([
      fetchAnomalies({ min_score: 0 }),
      fetchStats(),
    ]);

    if (!anomalyRes.data) {
      setStatus({ loading: false, error: anomalyRes.error, source: 'none' });
      return;
    }
    setAnomalies(anomalyRes.data);
    setStats(statsRes.data);
    setStatus({ loading: false, error: null, source: anomalyRes.source });
    setSelectedId((cur) => cur ?? anomalyRes.data[0]?.id ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setFilter = useCallback((key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  /** Options derived from the data itself, never hardcoded. */
  const facets = useMemo(() => ({
    states: [...new Set(anomalies.map((a) => a.state).filter(Boolean))].sort(),
    months: [...new Set(anomalies.map((a) => a.month).filter(Boolean))].sort().reverse(),
  }), [anomalies]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return anomalies.filter((a) => {
      if (filters.state !== 'ALL' && a.state !== filters.state) return false;
      if (filters.month !== 'ALL' && a.month !== filters.month) return false;
      if (filters.band !== 'ALL' && a.band.key !== filters.band) return false;
      if ((a.riskScore ?? 0) < filters.minScore) return false;
      if (q) {
        const haystack = `${a.agencyName} ${a.state} ${a.district} ${a.agencyId} ${a.month}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [anomalies, filters]);

  const selected = useMemo(
    () => anomalies.find((a) => a.id === selectedId) ?? null,
    [anomalies, selectedId]
  );

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.state !== 'ALL') chips.push({ key: 'state', label: `State: ${filters.state}`, reset: 'ALL' });
    if (filters.month !== 'ALL') chips.push({ key: 'month', label: `Month: ${filters.month}`, reset: 'ALL' });
    if (filters.band !== 'ALL') chips.push({ key: 'band', label: `Risk: ${filters.band}`, reset: 'ALL' });
    if (filters.minScore !== DEFAULT_FILTERS.minScore) {
      chips.push({ key: 'minScore', label: `Score ≥ ${filters.minScore}`, reset: DEFAULT_FILTERS.minScore });
    }
    if (filters.search) chips.push({ key: 'search', label: `“${filters.search}”`, reset: '' });
    return chips;
  }, [filters]);

  const value = useMemo(() => ({
    anomalies, filtered, stats, status, connection,
    filters, setFilter, clearFilters, activeFilterChips, facets,
    selected, selectedId, setSelectedId,
    reload: load,
  }), [anomalies, filtered, stats, status, connection, filters, setFilter,
       clearFilters, activeFilterChips, facets, selected, selectedId, load]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
}
