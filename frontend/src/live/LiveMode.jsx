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
import { Panel, PanelHeader, SegmentedControl, LoadingState } from '../components/ui';
import PageContainer from '../components/layout/PageContainer';

/**
 * Live Mode.
 *
 * Role gating is UNCHANGED from the pre-redesign implementation: the same
 * `role` checks select the same portals, and every underlying request is still
 * authorised server-side by require_roles() against a verified Firebase ID
 * token. This file was restyled, not rewired.
 */

const ADMIN_TABS = [
  { key: 'queue', label: 'Clarifications', Icon: Inbox },
  { key: 'compliance', label: 'Compliance', Icon: ClipboardCheck },
  { key: 'governance', label: 'Governance', Icon: BarChart3 },
  { key: 'audit', label: 'Audit trail', Icon: History },
];

const ROLE_META = {
  admin: { label: 'Administrator', Icon: ShieldCheck, scope: 'Full oversight' },
  mp: { label: 'Member of Parliament', Icon: Landmark, scope: 'Constituency verification' },
  agency: { label: 'Implementing agency', Icon: Building2, scope: 'Own records only' },
  public: { label: 'Public / citizen', Icon: Globe2, scope: 'Published summaries' },
};

function SessionBar() {
  const { user, role, agencyId, state, logout } = useAuth();
  const meta = ROLE_META[role] || ROLE_META.public;
  const Icon = meta.Icon;
  const scopeLabel = role === 'agency' ? agencyId : role === 'mp' ? state : null;

  return (
    <div className="flex items-center justify-between gap-3 panel px-3 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 border border-line"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-medium text-content-primary truncate">{user.email}</p>
          <p className="text-xs text-content-muted truncate">
            {meta.label}
            <span className="mx-1.5 opacity-40">·</span>
            {scopeLabel || meta.scope}
          </p>
        </div>
      </div>
      <button onClick={logout} className="btn-ghost btn-sm shrink-0">
        <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Sign out
      </button>
    </div>
  );
}

function AdminConsole({ initialTab = 'queue' }) {
  const [adminTab, setAdminTab] = useState(initialTab);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  if (selectedCaseId) {
    return <CaseDetail caseId={selectedCaseId} onBack={() => setSelectedCaseId(null)} />;
  }

  return (
    <div className="space-y-3">
      <SegmentedControl
        label="Administrator sections"
        value={adminTab}
        onChange={setAdminTab}
        options={ADMIN_TABS.map((t) => ({ value: t.key, label: t.label }))}
      />

      {adminTab === 'queue' && <ClarificationQueue onSelectCase={setSelectedCaseId} />}
      {adminTab === 'compliance' && <ComplianceReport />}
      {adminTab === 'governance' && <GovernanceReport />}
      {adminTab === 'audit' && (
        <Panel>
          <PanelHeader title="System audit trail" description="Every recorded action, in order" />
          <AuditTimeline />
        </Panel>
      )}
    </div>
  );
}

function LiveModeContent({ initialTab }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <PageContainer>
        <Panel><LoadingState label="Checking session" rows={3} /></Panel>
      </PageContainer>
    );
  }

  if (!user) return <Login />;

  return (
    <PageContainer
      title="Live mode"
      description="Role-based oversight workflow. Every action below is authorised server-side and written to the audit trail."
    >
      <SessionBar />
      {role === 'admin' && <AdminConsole initialTab={initialTab} />}
      {role === 'mp' && <MPPortal />}
      {role === 'agency' && <AgencyPortal />}
      {role === 'public' && <PublicTransparency />}
    </PageContainer>
  );
}

export default function LiveMode({ initialTab = 'queue' }) {
  return (
    <AuthProvider>
      <LiveModeContent initialTab={initialTab} />
    </AuthProvider>
  );
}
