import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search, SlidersHorizontal, ChevronRight, CloudOff, Radio } from 'lucide-react';
import { findNavItem } from './navigation';
import { Chip, cx } from '../ui';

/**
 * Top command bar: context (breadcrumb), global filters, search entry.
 * Deliberately free of decorative controls.
 */
export default function Header({
  onOpenMobileNav,
  onOpenPalette,
  onOpenFilters,
  filterChips = [],
  onRemoveFilter,
  onClearFilters,
  connection,
}) {
  const { pathname } = useLocation();
  const current = findNavItem(pathname);

  return (
    <header
      className="sticky top-0 z-header flex flex-col bg-bg-primary/95 backdrop-blur-sm border-b border-line-subtle"
    >
      <div
        className="flex items-center gap-3 px-3 sm:px-4 shrink-0"
        style={{ height: 'var(--header-height)' }}
      >
        <button
          onClick={onOpenMobileNav}
          className="btn-ghost btn-icon lg:hidden shrink-0"
          aria-label="Open navigation"
        >
          <Menu className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Breadcrumb / context */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
          <Link to="/" className="text-sm text-content-muted hover:text-content-secondary transition-colors">
            FundWatch
          </Link>
          {current && (
            <>
              <ChevronRight className="w-3 h-3 text-content-muted shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-content-primary truncate" aria-current="page">
                {current.label}
              </span>
            </>
          )}
        </nav>

        <div className="flex-1" />

        {/* Connection honesty indicator -- replaces silent degradation */}
        {connection?.mode === 'snapshot' && (
          <span
            className="hidden sm:inline-flex chip"
            style={{ color: 'var(--risk-medium)', borderColor: 'rgba(232,179,57,0.3)', background: 'var(--risk-medium-surface)' }}
            title={`Live API unreachable (${connection.lastError ?? 'unknown error'}). Showing the dataset snapshot shipped with this build.`}
          >
            <CloudOff className="w-3 h-3" aria-hidden="true" />
            Snapshot data
          </span>
        )}
        {connection?.mode === 'live' && (
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-content-muted" title="Connected to the FundWatch intelligence API">
            <Radio className="w-3 h-3" style={{ color: 'var(--risk-low)' }} aria-hidden="true" />
            Live
          </span>
        )}

        {/* Global search / command palette */}
        <button
          onClick={onOpenPalette}
          className="btn-default gap-2 w-9 sm:w-56 justify-start px-2 shrink-0"
          aria-label="Search projects, agencies and actions"
        >
          <Search className="w-3.5 h-3.5 text-content-muted shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline text-content-muted font-normal">Search…</span>
          <kbd className="hidden sm:inline ml-auto mono text-2xs text-content-muted border border-line rounded-sm px-1 py-px">
            Ctrl K
          </kbd>
        </button>

        <button onClick={onOpenFilters} className="btn-default btn-icon sm:w-auto sm:px-3 shrink-0" aria-label="Open filters">
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Filters</span>
          {filterChips.length > 0 && (
            <span
              className="mono text-2xs rounded-sm px-1"
              style={{ background: 'var(--accent-surface)', color: 'var(--accent-primary)' }}
            >
              {filterChips.length}
            </span>
          )}
        </button>
      </div>

      {/* Active filter row -- filters never change data silently */}
      {filterChips.length > 0 && (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-t border-line-subtle overflow-x-auto">
          <span className="label-meta shrink-0">Filters</span>
          {filterChips.map((chip) => (
            <Chip key={chip.key} onRemove={() => onRemoveFilter(chip.key, chip.reset)}>
              {chip.label}
            </Chip>
          ))}
          <button
            onClick={onClearFilters}
            className="text-xs text-content-muted hover:text-content-primary underline underline-offset-2 shrink-0 ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </header>
  );
}
