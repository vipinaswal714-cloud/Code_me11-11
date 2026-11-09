import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { getSupabase } from '../lib/supabaseClient';

export default function SignInPage({
  onBack,
  onAuthenticated,
  onContinueAsGuest,
  onNavigatePrivacy
}) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const resetFormState = (newMode) => {
    setMode(newMode);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup') {
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter your password confirmation.');
        return;
      }
    }

    if (mode === 'signin' && !password) {
      setError('Please enter your password.');
      return;
    }

    setBusy(true);

    try {
      const supabase = getSupabase();

      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/studio`
          }
        });

        if (authError) throw authError;

        if (data.session) {
          // If auto-confirm is enabled on the Supabase project
          onAuthenticated();
        } else {
          // Default: email confirmation sent
          setNotice(
            'Account created successfully! We sent a confirmation link to your email address. Please click the link to confirm your account, then sign in.'
          );
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        }
      } else if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (authError) throw authError;
        onAuthenticated();
      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/login`
        });

        if (resetError) throw resetError;

        // Secure response: always show the same message regardless of whether the email exists
        setNotice('If an account exists for that email address, a password reset link has been sent.');
      }
    } catch (authError) {
      let friendlyMsg = authError?.message || 'We could not complete your request. Please try again.';
      if (/invalid login credentials/i.test(friendlyMsg)) {
        friendlyMsg = 'Invalid email or password. Please verify your credentials and try again.';
      } else if (/email not confirmed/i.test(friendlyMsg)) {
        friendlyMsg = 'Your email address has not been confirmed yet. Please check your inbox for the confirmation email.';
      } else if (/already registered/i.test(friendlyMsg)) {
        friendlyMsg = 'An account with this email address already exists. Please sign in instead.';
      }
      setError(friendlyMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center overflow-hidden px-4 py-12 text-glass-primary selection:bg-metrica-500 selection:text-white">
      {/* Pure CSS Ambient Glass Backdrop */}
      <div className="glass-backdrop" aria-hidden="true">
        <div className="glass-backdrop-blob-1" />
        <div className="glass-backdrop-blob-2" />
        <div className="glass-backdrop-blob-3" />
      </div>

      {/* Top Left Home Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-glass-secondary hover:text-glass-primary glass-button sm:left-8 sm:top-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Home</span>
      </button>

      {/* Sign In Glass Card Container */}
      <section
        className="glass-panel relative z-10 w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-8 border border-glass-border animate-in fade-in zoom-in-95 duration-200"
        aria-labelledby="auth-heading"
      >
        {/* Header Icon & Brand */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-metrica-600 to-cyan-500 text-white shadow-lg shadow-metrica-600/20">
            <BarChart3 className="h-6 w-6" />
          </div>
          <p className="text-xs font-black tracking-wider uppercase text-metrica-600 dark:text-metrica-300">
            Metrica Analytics
          </p>
          <h1 id="auth-heading" className="mt-2 text-2xl font-black tracking-tight text-glass-primary">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h1>
          <p className="mt-1.5 text-xs text-glass-secondary">
            {mode === 'signin' && 'Sign in to access your analytics studio.'}
            {mode === 'signup' && 'Create an account with your email to sign in.'}
            {mode === 'forgot' && 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-xs leading-5 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-xs leading-5 text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="metrica-email" className="mb-1.5 block text-xs font-semibold text-glass-secondary">
              Email Address
            </label>
            <div className="relative">
              <input
                id="metrica-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-glass-border bg-white/60 dark:bg-slate-950/40 px-3.5 py-3 pl-10 text-sm text-glass-primary outline-none transition placeholder:text-glass-muted focus:border-metrica-500 focus:ring-2 focus:ring-metrica-500/20"
                placeholder="you@example.com"
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-glass-muted pointer-events-none" />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="metrica-password" className="block text-xs font-semibold text-glass-secondary">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => resetFormState('forgot')}
                    className="text-[11px] text-metrica-600 dark:text-metrica-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="metrica-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-glass-border bg-white/60 dark:bg-slate-950/40 px-3.5 py-3 pl-10 pr-11 text-sm text-glass-primary outline-none transition placeholder:text-glass-muted focus:border-metrica-500 focus:ring-2 focus:ring-metrica-500/20"
                  placeholder="At least 6 characters"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-glass-muted pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-glass-muted hover:text-glass-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label htmlFor="metrica-confirm-password" className="mb-1.5 block text-xs font-semibold text-glass-secondary">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="metrica-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-glass-border bg-white/60 dark:bg-slate-950/40 px-3.5 py-3 pl-10 text-sm text-glass-primary outline-none transition placeholder:text-glass-muted focus:border-metrica-500 focus:ring-2 focus:ring-metrica-500/20"
                  placeholder="Repeat your password"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-glass-muted pointer-events-none" />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <p className="text-[11px] leading-4 text-glass-muted">
              By creating an account, you agree to our{' '}
              <button
                type="button"
                onClick={onNavigatePrivacy}
                className="underline underline-offset-2 text-metrica-600 dark:text-metrica-400 hover:text-glass-primary"
              >
                Privacy Notice
              </button>
              .
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-metrica-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-metrica-600/20 transition-all hover:bg-metrica-700 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>Please wait…</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'Sign in'}
                  {mode === 'signup' && 'Create account'}
                  {mode === 'forgot' && 'Send reset email'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Mode Switchers */}
        <div className="mt-5 text-center text-xs text-glass-secondary space-y-1.5">
          {mode === 'signin' && (
            <p>
              New to Metrica?{' '}
              <button
                type="button"
                onClick={() => resetFormState('signup')}
                className="font-bold text-metrica-700 underline decoration-metrica-500/40 underline-offset-4 dark:text-metrica-300"
              >
                Create an account
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => resetFormState('signin')}
                className="font-bold text-metrica-700 underline decoration-metrica-500/40 underline-offset-4 dark:text-metrica-300"
              >
                Sign in
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <p>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => resetFormState('signin')}
                className="font-bold text-metrica-700 underline decoration-metrica-500/40 underline-offset-4 dark:text-metrica-300"
              >
                Back to Sign in
              </button>
            </p>
          )}
        </div>

        {/* Guest Access Divider */}
        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-glass-muted">
          <span className="h-px flex-1 bg-glass-border" />
          <span>or</span>
          <span className="h-px flex-1 bg-glass-border" />
        </div>

        {/* Continue as Guest Button */}
        <button
          type="button"
          onClick={onContinueAsGuest}
          className="glass-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-glass-primary transition hover:border-metrica-500/40"
        >
          <span>Continue as Guest (No account needed)</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>

        {/* Security Disclaimer */}
        <p className="mt-5 flex items-start justify-center gap-1.5 text-center text-[10px] leading-4 text-glass-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span>
            Supabase handles account sign-in. Uploaded files are analyzed in your browser; Ask AI sends a question and up to 20 sample rows to Google Gemini. See the Privacy Notice before using Ask AI.
          </span>
        </p>
      </section>
    </main>
  );
}
