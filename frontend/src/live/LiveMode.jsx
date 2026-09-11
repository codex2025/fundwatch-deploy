import React, { useState } from 'react';
import { Inbox, ClipboardCheck, BarChart3, History, LogOut, ShieldCheck, Landmark, Building2, Globe2 } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './auth/Login';
import ClarificationQueue from './admin/ClarificationQueue';
import CaseDetail from './admin/CaseDetail';
import ComplianceReport from './admin/ComplianceReport';
import GovernanceReport from './admin/GovernanceReport';
import AgencyPortal from './agency/AgencyPortal';
import MPPortal from './mp/MPPortal';
import PublicTransparency from './public/PublicTransparency';
import AuditTimeline from './shared/AuditTimeline';

const ADMIN_TABS = [
  { key: 'queue', label: 'Clarification Queue', Icon: Inbox },
  { key: 'compliance', label: 'Compliance', Icon: ClipboardCheck },
  { key: 'governance', label: 'Governance', Icon: BarChart3 },
  { key: 'audit', label: 'Audit Trail', Icon: History },
];

const ROLE_META = {
  admin: { label: 'Administrator', Icon: ShieldCheck },
  mp: { label: 'Member of Parliament', Icon: Landmark },
  agency: { label: 'Implementing Agency', Icon: Building2 },
  public: { label: 'Public / Citizen', Icon: Globe2 },
};

function SessionBar() {
  const { user, role, agencyId, state, logout } = useAuth();
  const meta = ROLE_META[role] || ROLE_META.public;
  const Icon = meta.Icon;
  const scopeLabel = role === 'agency' ? agencyId : role === 'mp' ? state : null;

  return (
    <div className="flex items-center justify-between gap-3 glass-card px-3.5 py-2.5 animate-fade-in-up">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-brand-gradient-soft flex items-center justify-center border border-sky-500/20 shrink-0">
          <Icon className="w-4 h-4 text-sky-300" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-100 truncate">{user.email}</p>
          <p className="text-[10px] text-slate-500">{meta.label}{scopeLabel ? ` · ${scopeLabel}` : ''}</p>
        </div>
      </div>
      <button onClick={logout} className="btn-ghost hover:text-red-300 hover:bg-red-500/10 shrink-0">
        <LogOut className="w-3.5 h-3.5" /> Logout
      </button>
    </div>
  );
}

function AdminConsole() {
  const [adminTab, setAdminTab] = useState('queue');
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  if (selectedCaseId) {
    return <CaseDetail caseId={selectedCaseId} onBack={() => setSelectedCaseId(null)} />;
  }

  return (
    <>
      <div className="nav-pill-group w-fit max-w-full overflow-x-auto">
        {ADMIN_TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setAdminTab(key)}
            className={`nav-pill ${adminTab === key ? 'nav-pill-active' : ''}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in-up">
        {adminTab === 'queue' && <ClarificationQueue onSelectCase={setSelectedCaseId} />}
        {adminTab === 'compliance' && <ComplianceReport />}
        {adminTab === 'governance' && <GovernanceReport />}
        {adminTab === 'audit' && (
          <div className="glass-card p-4">
            <h3 className="section-label mb-3">Full System Audit Trail</h3>
            <AuditTimeline />
          </div>
        )}
      </div>
    </>
  );
}

function LiveModeContent() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-16 text-center">
        <div className="w-8 h-8 rounded-xl bg-brand-gradient-soft border border-sky-500/30 flex items-center justify-center mx-auto animate-spin">
          <ShieldCheck className="w-4 h-4 text-sky-300" />
        </div>
        <p className="text-xs text-slate-500 font-mono mt-3">Checking session...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SessionBar />

      {role === 'admin' && <AdminConsole />}
      {role === 'mp' && <MPPortal />}
      {role === 'agency' && <AgencyPortal />}
      {role === 'public' && <PublicTransparency />}
    </div>
  );
}

export default function LiveMode() {
  return (
    <AuthProvider>
      <LiveModeContent />
    </AuthProvider>
  );
}
