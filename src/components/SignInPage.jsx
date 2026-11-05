import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react';
import { getSupabase } from '../lib/supabaseClient';

export default function SignInPage({ onBack, onAuthenticated, onContinueAsGuest }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);

    try {
      const supabase = getSupabase();
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/studio` }
        });
        if (authError) throw authError;
        if (data.session) {
          onAuthenticated();
        } else {
          setNotice('Your account was created. Check your email for a confirmation link, then come back to sign in.');
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (authError) throw authError;
        onAuthenticated();
      }
    } catch (authError) {
      setError(authError?.message || 'We could not complete sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(current => current === 'signin' ? 'signup' : 'signin');
    setError('');
    setNotice('');
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center overflow-hidden px-4 py-10 text-glass-primary">
      <div className="glass-backdrop" aria-hidden="true">
        <div className="glass-backdrop-blob-1" />
        <div className="glass-backdrop-blob-2" />
        <div className="glass-backdrop-blob-3" />
      </div>
      <button type="button" onClick={onBack} className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-glass-secondary hover:text-glass-primary sm:left-8 sm:top-8">
        <ArrowLeft className="h-4 w-4" /> Home
      </button>

      <section className="glass-panel relative z-10 w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-8" aria-labelledby="auth-heading">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-metrica-600 to-cyan-500 text-white shadow-lg shadow-metrica-600/20"><BarChart3 className="h-6 w-6" /></div>
          <p className="text-sm font-black tracking-tight">Metrica</p>
          <h1 id="auth-heading" className="mt-2 text-2xl font-black tracking-tight">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-2 text-sm text-glass-secondary">{mode === 'signin' ? 'Sign in to continue to your analytics studio.' : 'Create an account to sign in to Metrica.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="metrica-email" className="mb-1.5 block text-xs font-semibold text-glass-secondary">Email address</label>
            <input id="metrica-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-glass-border bg-white/60 px-3.5 py-3 text-sm text-glass-primary outline-none transition placeholder:text-glass-muted focus:border-metrica-500 focus:ring-2 focus:ring-metrica-500/20 dark:bg-slate-950/30" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="metrica-password" className="mb-1.5 block text-xs font-semibold text-glass-secondary">Password</label>
            <div className="relative">
              <input id="metrica-password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-glass-border bg-white/60 px-3.5 py-3 pr-11 text-sm text-glass-primary outline-none transition placeholder:text-glass-muted focus:border-metrica-500 focus:ring-2 focus:ring-metrica-500/20 dark:bg-slate-950/30" placeholder="At least 6 characters" />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-glass-muted hover:text-glass-primary">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-xs leading-5 text-red-700 dark:text-red-300">{error}</div>}
          {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-xs leading-5 text-emerald-800 dark:text-emerald-300">{notice}</div>}

          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-metrica-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-metrica-600/20 transition hover:bg-metrica-700 disabled:cursor-wait disabled:opacity-60">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-glass-secondary">
          {mode === 'signin' ? 'New to Metrica?' : 'Already have an account?'}{' '}
          <button type="button" onClick={switchMode} className="font-bold text-metrica-700 underline decoration-metrica-500/40 underline-offset-4 dark:text-metrica-300">
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-glass-muted"><span className="h-px flex-1 bg-glass-border" />or<span className="h-px flex-1 bg-glass-border" /></div>

        <button type="button" onClick={onContinueAsGuest} className="glass-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-glass-primary transition hover:border-metrica-500/40">
          Continue as Guest
        </button>

        <p className="mt-5 flex items-start justify-center gap-1.5 text-center text-[10px] leading-4 text-glass-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> Sign-in is handled by Supabase. Your spreadsheet stays in the browser unless you choose to use an AI feature.
        </p>
      </section>
    </main>
  );
}
