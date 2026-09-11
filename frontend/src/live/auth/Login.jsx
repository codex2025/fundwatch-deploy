import React, { useState } from 'react';
import { ShieldCheck, Landmark, Building2, Globe2, Lock, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Panel, SegmentedControl } from '../../components/ui';

const ROLE_HINTS = [
  { key: 'admin', label: 'Administrator', Icon: ShieldCheck, scope: 'Issues notices, resolves cases' },
  { key: 'mp', label: 'Member of Parliament', Icon: Landmark, scope: 'Verifies within own state' },
  { key: 'agency', label: 'Implementing agency', Icon: Building2, scope: 'Responds for own agency' },
  { key: 'public', label: 'Public / citizen', Icon: Globe2, scope: 'Published summaries only' },
];

/**
 * Live Mode sign-in. Authentication behaviour is unchanged -- this component
 * was restyled onto the new token system only.
 */
export default function Login() {
  const { login, signupPublic, error, setError } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await signupPublic(email.trim(), password);
    } catch {
      // AuthContext already surfaced a friendly message
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Sign in to Live Mode</h1>
        <p className="text-sm text-content-muted">
          Live Mode records real case actions against the audit trail, so access is
          gated by role.
        </p>
      </div>

      <Panel className="p-4 space-y-4">
        <SegmentedControl
          label="Sign-in mode"
          value={mode}
          onChange={(m) => { setMode(m); setError(null); }}
          options={[
            { value: 'login', label: 'Sign in' },
            { value: 'signup', label: 'Citizen sign-up' },
          ]}
        />

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="login-email" className="label-meta flex items-center gap-1.5 mb-1.5">
              <Mail className="w-3 h-3" aria-hidden="true" /> Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.gov.in"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="label-meta flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3 h-3" aria-hidden="true" /> Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
              className="field"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm rounded border px-3 py-2"
              style={{
                color: 'var(--risk-critical)',
                background: 'var(--risk-critical-surface)',
                borderColor: 'rgba(242,85,90,0.3)',
              }}
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-accent w-full">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create citizen account'}
          </button>
        </form>

        {mode === 'signup' && (
          <p className="text-xs text-content-muted leading-relaxed border-t border-line-subtle pt-3">
            Citizen sign-up grants access to the published transparency view only.
            Administrator, MP and implementing-agency accounts are issued directly
            and cannot be created here.
          </p>
        )}
      </Panel>

      <Panel className="p-4">
        <h2 className="label-meta mb-2.5">Roles and scope</h2>
        <ul className="space-y-2">
          {ROLE_HINTS.map(({ key, label, Icon, scope }) => (
            <li key={key} className="flex items-start gap-2.5">
              <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-content-muted" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm text-content-secondary">{label}</span>
                <span className="block text-xs text-content-muted">{scope}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
