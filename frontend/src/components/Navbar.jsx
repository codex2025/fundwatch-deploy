import React, { useState } from 'react';
import { Shield, Activity, FileText, Database, Layers, Sparkles, BarChart3, UploadCloud, Radio, Menu, X } from 'lucide-react';

const TABS = [
  { key: 'dashboard', label: 'Ranked Registry', Icon: Activity, countKey: 'total_anomalies_flagged' },
  { key: 'visuals', label: 'Visual Intelligence', Icon: BarChart3 },
  { key: 'drilldown', label: 'Agency Drilldown', Icon: Layers },
  { key: 'investigation', label: 'Copilot Brief', Icon: Sparkles },
  { key: 'audit', label: 'Audit Map', Icon: Database },
];

export default function Navbar({ activeTab, setActiveTab, stats, onOpenUpload }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function go(tab) {
    setActiveTab(tab);
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Tag */}
          <button
            onClick={() => go('dashboard')}
            className="flex items-center gap-3 shrink-0 group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow ring-1 ring-white/10 group-hover:brightness-110 transition-all">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="text-left hidden xs:block">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg tracking-tight text-white">
                  FUNDWATCH
                </span>
                <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  MoSPI PS10
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 font-medium">Explainable MPLADS Anomaly Detection</p>
            </div>
          </button>

          {/* Desktop Nav Tabs */}
          <nav className="hidden lg:flex items-center gap-1 nav-pill-group">
            {TABS.map(({ key, label, Icon, countKey }) => (
              <button
                key={key}
                onClick={() => go(key)}
                className={`nav-pill ${activeTab === key ? 'nav-pill-active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                {countKey && stats?.[countKey] ? (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                    activeTab === key ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'
                  }`}>
                    {stats[countKey]}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {/* Right Action: Live Mode + Upload Dataset */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => go('live')}
              className={`btn ${
                activeTab === 'live'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-glow-violet'
                  : 'bg-gradient-to-r from-purple-500/15 to-indigo-500/15 hover:from-purple-500/25 hover:to-indigo-500/25 text-purple-300 border border-purple-500/30'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Live Mode</span>
            </button>
            <button
              onClick={onOpenUpload}
              className="hidden md:flex btn bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 text-sky-300 border border-sky-500/30"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Dataset</span>
            </button>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Sheet */}
        {mobileOpen && (
          <nav className="lg:hidden pb-4 space-y-1 animate-fade-in-up">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => go(key)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === key ? 'bg-brand-gradient text-white' : 'text-slate-300 hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
            <button
              onClick={onOpenUpload}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-sky-300 hover:bg-white/[0.05] transition-colors"
            >
              <UploadCloud className="w-4 h-4" /> Upload Dataset
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
