import React from 'react';
import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, ShieldCheck, X } from 'lucide-react';
import { NAV_GROUPS } from './navigation';
import { cx } from '../ui';

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, counts = {} }) {
  return (
    <>
      {/* Scrim for the mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-sidebar lg:hidden animate-fade-in"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <nav
        aria-label="Primary"
        className={cx(
          'fixed inset-y-0 left-0 z-sidebar flex flex-col bg-bg-secondary border-r border-line-subtle',
          'transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 px-3 shrink-0 border-b border-line-subtle"
          style={{ height: 'var(--header-height)' }}
        >
          <span
            className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-primary)' }}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--text-inverse)' }} aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="font-semibold text-md tracking-tight truncate">FundWatch</span>
          )}
          <button
            onClick={onCloseMobile}
            className="btn-ghost btn-icon ml-auto lg:hidden"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Groups */}
        <div className="flex-1 scroll-y py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <div className="label-meta px-3 mb-1.5">{group.label}</div>
              )}
              <ul className="space-y-px px-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const count = item.countKey ? counts[item.countKey] : null;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onCloseMobile}
                        title={collapsed ? `${item.label} — ${item.hint}` : item.hint}
                        className={({ isActive }) =>
                          cx(
                            'group relative flex items-center gap-2.5 h-8 px-2 rounded-sm text-base transition-colors',
                            collapsed && 'justify-center px-0',
                            isActive
                              ? 'bg-bg-elevated text-content-primary font-medium'
                              : 'text-content-secondary hover:text-content-primary hover:bg-bg-elevated/60'
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Active marker: accent, but never the only cue --
                                weight and background change too. */}
                            {isActive && (
                              <span
                                className="absolute left-0 inset-y-1 w-0.5 rounded-r-sm"
                                style={{ background: 'var(--accent-primary)' }}
                                aria-hidden="true"
                              />
                            )}
                            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                            {!collapsed && count != null && (
                              <span className="ml-auto mono text-2xs text-content-muted tabular">
                                {count}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Collapse toggle -- desktop only */}
        <div className="border-t border-line-subtle p-2 hidden lg:block">
          <button
            onClick={onToggleCollapse}
            className={cx('btn-ghost w-full', collapsed && 'px-0 justify-center')}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
              : <><PanelLeftClose className="w-4 h-4" aria-hidden="true" /><span>Collapse</span></>}
          </button>
        </div>
      </nav>
    </>
  );
}
