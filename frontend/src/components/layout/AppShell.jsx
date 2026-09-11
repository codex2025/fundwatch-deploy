import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from './CommandPalette';
import FilterDrawer from './FilterDrawer';
import { useWorkspace, DEFAULT_FILTERS } from '../../app/WorkspaceContext';

export default function AppShell() {
  const {
    anomalies, activeFilterChips, setFilter, clearFilters, connection,
  } = useWorkspace();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('fw:nav-collapsed') === '1'; } catch { return false; }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('fw:nav-collapsed', collapsed ? '1' : '0'); } catch { /* private mode */ }
  }, [collapsed]);

  // Ctrl/Cmd-K opens search from anywhere.
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const flaggedCount = anomalies.filter((a) => (a.riskScore ?? 0) >= 70).length;

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        counts={{ flagged: flaggedCount }}
      />

      <div
        className="flex flex-col min-h-screen transition-[padding] duration-200"
        style={{
          paddingLeft: `var(${collapsed ? '--sidebar-width-collapsed' : '--sidebar-width'})`,
        }}
        data-shell-main
      >
        <Header
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenFilters={() => setFiltersOpen(true)}
          filterChips={activeFilterChips}
          onRemoveFilter={(key, reset) => setFilter(key, reset ?? DEFAULT_FILTERS[key])}
          onClearFilters={clearFilters}
          connection={connection}
        />

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} />

      {/* The sidebar is fixed, so the padding above must drop to zero below lg. */}
      <style>{`
        @media (max-width: 1023px) {
          [data-shell-main] { padding-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
