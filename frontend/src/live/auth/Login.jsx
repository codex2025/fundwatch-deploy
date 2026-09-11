import React, { useState } from 'react';
import { ShieldCheck, Landmark, Building2, Globe2, Lock, Mail, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from './AuthContext';

const ROLE_HINTS = [
  { key: 'admin', label: 'Administrator', Icon: ShieldCheck },
  { key: 'mp', label: 'Member of Parliament', Icon: Landmark },
  { key: 'agency', label: 'Implementing Agency', Icon: Building2 },
  { key: 'public', label: 'Public / Citizen', Icon: Globe2 },
];

export default function Login() {
  const { login, signupPublic, error, setError } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await signupPublic(email.trim(), password);
      }
    } catch {
      // error already set by AuthContext
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-6 animate-fade-in-up">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center mx-auto shadow-glow ring-1 ring-white/10">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="page-eyebrow">Live Mode</p>
          <h2 className="page-title text-2xl mt-1">Sign in to continue</h2>
        </div>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          Live Mode carries real case actions, so it's gated behind role-based sign-in.
        </p>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="nav-pill-group w-full">
          <button
            onClick={() => { setMode('login'); setError(null); }}
            className={`nav-pill flex-1 justify-center ${mode === 'login' ? 'nav-pill-active' : ''}`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); }}
            className={`nav-pill flex-1 justify-center ${mode === 'signup' ? 'nav-pill-active' : ''}`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Citizen Sign-Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <label className="block">
            <span className="section-label flex items-center gap-1 mb-1.5 normal-case tracking-normal font-semibold text-slate-400"><Mail className="w-3 h-3" /> Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
            />
          </label>
          <label className="block">
            <span className="section-label flex items-center gap-1 mb-1.5 normal-case tracking-normal font-semibold text-slate-400"><Lock className="w-3 h-3" /> Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              className="input-field"
            />
          </label>

          {error && (
            <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
            {busy ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Citizen Account'}
          </button>
        </form>

        {mode === 'signup' && (
          <p className="text-[11px] text-slate-500 leading-relaxed border-t border-surface-border pt-3">
            Citizen sign-up only grants access to the anonymized Public Transparency view.
            Admin, MP, and Implementing Agency accounts are issued directly by FundWatch and
            cannot be created here.
          </p>
        )}
      </div>

      <div className="glass-card p-4">
        <p className="section-label mb-3">Who can sign in</p>
        <div className="grid grid-cols-2 gap-2.5">
          {ROLE_HINTS.map(({ key, label, Icon }) => (
            <div key={key} className="flex items-center gap-1.5 text-[11px] text-slate-400 glass-pill px-2.5 py-1.5">
              <Icon className="w-3.5 h-3.5 text-sky-400 shrink-0" /> {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
